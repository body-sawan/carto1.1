import type { CartSnapshot, PaymentStatus, ReceiptLine, ShoppingListItem, ShoppingListItemStatus } from "@carto/shared";
import { CARTO_API_BASE_URL, CART_CODE, DEVICE_SECRET } from "./config";
import { normalizeRemoteProduct, registerCatalogProducts } from "./cartCatalog";

interface ApiErrorShape {
  code?: string;
  error?: string;
  message?: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: ApiErrorShape;
}

interface CartoQrResponseData {
  payload: {
    type: string;
    cartCode: string;
    pairingCode: string;
  };
  qrValue: string;
  expiresAt?: string;
}

interface CartoCartInfo {
  cartCode: string;
  status?: string;
}

interface CartoSessionInfo {
  id: string;
  status?: string;
}

interface CartoListItem {
  id: string;
  name: string;
  quantity: number;
}

interface CartoListInfo {
  id: string;
  items: CartoListItem[];
}

interface CartoReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface CartoReceiptInfo {
  id: string;
  status?: string;
  paymentStatus?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  items?: CartoReceiptItem[];
}

interface CartoActiveSessionInactiveData {
  active: false;
  cart: CartoCartInfo;
}

interface CartoActiveSessionActiveData {
  active: true;
  cart: CartoCartInfo;
  session: CartoSessionInfo;
  list: CartoListInfo;
  receipt: CartoReceiptInfo;
}

interface CartoProductRecord {
  id: string;
  name: string;
  category?: string | null;
  price?: number | null;
  emoji?: string | null;
}

export type CartoActiveSessionData = CartoActiveSessionInactiveData | CartoActiveSessionActiveData;

export async function fetchCartoQr(signal?: AbortSignal) {
  return readCartoJson<CartoQrResponseData>(`${CARTO_API_BASE_URL}/api/carts/${CART_CODE}/qrcode`, signal);
}

export async function fetchCartoActiveSession(signal?: AbortSignal) {
  return readCartoJson<CartoActiveSessionData>(`${CARTO_API_BASE_URL}/api/carts/${CART_CODE}/active-session`, signal);
}

export async function fetchCartoCatalog(signal?: AbortSignal) {
  const data = await readCartoJson<CartoProductRecord[]>(`${CARTO_API_BASE_URL}/api/products`, signal);
  const products = data.map((product) => normalizeRemoteProduct(product));
  registerCatalogProducts(products);
  return products;
}

export function buildWaitingSnapshot(qr: CartoQrResponseData): CartSnapshot {
  return {
    cartId: qr.payload.cartCode,
    sessionId: null,
    state: "WAITING_FOR_LIST",
    pairing: {
      cartId: qr.payload.cartCode,
      pairingCode: qr.payload.pairingCode,
      qrPayload: qr.qrValue,
      transport: "backend",
      expiresAt: qr.expiresAt
    },
    shoppingList: [],
    cartItems: [],
    totals: {
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0
    },
    payment: {
      status: "NOT_STARTED",
      amount: 0
    },
    alerts: []
  };
}

export function mapActiveSessionToSnapshot(data: CartoActiveSessionActiveData, previousSnapshot: CartSnapshot | null): CartSnapshot {
  const cartItems = mapReceiptItems(data.receipt.items ?? []);
  const shoppingList = mapShoppingListItems(data.list.items, cartItems);
  const totals = {
    subtotal: roundMoney(data.receipt.subtotal ?? cartItems.reduce((sum, item) => sum + item.lineTotal, 0)),
    discount: 0,
    tax: roundMoney(data.receipt.tax ?? 0),
    total: roundMoney(data.receipt.total ?? ((data.receipt.subtotal ?? 0) + (data.receipt.tax ?? 0)))
  };
  const paymentStatus = mapPaymentStatus(data.receipt.status, data.receipt.paymentStatus);
  const snapshotState = mapSnapshotState(data.receipt.status, paymentStatus);

  return {
    cartId: data.cart.cartCode,
    sessionId: data.session.id,
    state: snapshotState,
    pairing: previousSnapshot?.pairing
      ? {
        ...previousSnapshot.pairing,
        cartId: data.cart.cartCode
      }
      : null,
    activeListId: data.list.id,
    shoppingMode: "LIST",
    shoppingList,
    cartItems,
    totals,
    payment: {
      status: paymentStatus,
      amount: totals.total,
      transactionId: data.receipt.id,
      updatedAt: new Date().toISOString()
    },
    alerts: previousSnapshot?.alerts ?? []
  };
}

async function readCartoJson<T>(url: string, signal?: AbortSignal) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${DEVICE_SECRET}`
    },
    signal
  });

  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | ApiErrorShape | null;

  if (!response.ok) {
    throw new Error(readApiError(payload, response.status));
  }

  if (!payload || typeof payload !== "object" || !("success" in payload)) {
    return payload as T;
  }

  if (payload.success === false || payload.data === undefined) {
    throw new Error(readApiError(payload.error, response.status));
  }

  return payload.data;
}

function mapReceiptItems(items: CartoReceiptItem[]) {
  return items.map((item) => ({
    lineId: `receipt_${item.id}`,
    productId: item.id,
    barcode: `carto-${item.id}`,
    name: item.name,
    unitPrice: roundMoney(item.price),
    quantity: item.quantity,
    lineTotal: roundMoney(item.total),
    category: undefined,
    shelfId: undefined,
    mapNodeId: undefined,
    addedAt: new Date().toISOString()
  })) satisfies ReceiptLine[];
}

function mapShoppingListItems(items: CartoListItem[], cartItems: ReceiptLine[]) {
  const inCartByName = new Map<string, number>();
  for (const cartItem of cartItems) {
    const key = normalizeKey(cartItem.name);
    inCartByName.set(key, (inCartByName.get(key) ?? 0) + cartItem.quantity);
  }

  return items.map((item) => {
    const inCartQuantity = inCartByName.get(normalizeKey(item.name)) ?? 0;
    return {
      productId: item.id,
      name: item.name,
      quantity: item.quantity,
      inCartQuantity,
      status: deriveShoppingItemStatus(inCartQuantity, item.quantity)
    } satisfies ShoppingListItem;
  });
}

function deriveShoppingItemStatus(inCartQuantity: number, targetQuantity: number): ShoppingListItemStatus {
  if (inCartQuantity <= 0) return "PENDING";
  if (inCartQuantity < targetQuantity) return "PARTIAL";
  return "IN_CART";
}

function mapPaymentStatus(receiptStatus?: string, paymentStatus?: string): PaymentStatus {
  const normalizedReceipt = (receiptStatus ?? "").toUpperCase();
  const normalizedPayment = (paymentStatus ?? "").toUpperCase();

  if (normalizedPayment === "COMPLETED" || normalizedReceipt === "PAID") return "PAID";
  if (normalizedPayment === "FAILED") return "FAILED";
  if (normalizedPayment === "PROCESSING" || normalizedReceipt === "LOCKED") return "WAITING_PAYMENT";
  return "NOT_STARTED";
}

function mapSnapshotState(receiptStatus: string | undefined, paymentStatus: PaymentStatus): CartSnapshot["state"] {
  if (paymentStatus === "PAID") return "PAID";
  if (paymentStatus === "FAILED") return "PAYMENT_FAILED";
  if (paymentStatus === "WAITING_PAYMENT") return "WAITING_PAYMENT";
  if ((receiptStatus ?? "").toUpperCase() === "LOCKED") return "WAITING_PAYMENT";
  return "SHOPPING";
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function readApiError(payload: ApiEnvelope<unknown> | ApiErrorShape | null | undefined, status: number) {
  if (!payload || typeof payload !== "object") {
    return `HTTP ${status}`;
  }

  const errorShape = ("error" in payload && typeof payload.error === "object" && payload.error
    ? payload.error
    : payload) as ApiErrorShape;

  return errorShape.message
    ?? errorShape.error
    ?? errorShape.code
    ?? `HTTP ${status}`;
}
