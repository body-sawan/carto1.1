import type { CartSnapshot, PaymentStatus, ReceiptLine, ShoppingListItem, ShoppingListItemStatus } from "@carto/shared";
import { CARTO_API_BASE_URL, CARTO_INTEGRATION_MODE, CARTO_WEB_BASE_URL, CART_CODE, DEVICE_SECRET } from "./config";
import { findCatalogProductById, getRegisteredCatalogProducts, normalizeRemoteProduct, registerCatalogProducts } from "./cartCatalog";

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

export interface CartApiResult<T> {
  data: T;
  error?: string;
  ok: boolean;
}

export interface CartoQrData {
  expiresAt?: string | null;
  payload: {
    cartCode: string;
    pairingCode: string;
    type?: string;
  };
  qrValue: string;
}

export interface CartoItemActionPayload {
  category?: string | null;
  name?: string;
  price?: number;
  productId?: string;
  quantity?: number;
}

export interface CartoCheckoutData {
  alreadyFinished?: boolean;
  cartCode: string;
  cartSessionId?: string | null;
  items?: CartoReceiptItem[];
  note?: string;
  paymentStatus?: string | null;
  receiptId?: string | null;
  sessionClosed?: boolean;
  status?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
}

export interface CartoWaitingSessionData {
  active?: false;
  cart?: {
    cartCode?: string;
    status?: string;
  };
  cartCode: string;
  cartStatus?: string;
  status: "waiting";
}

export interface CartoShoppingListItem {
  category?: string | null;
  checked?: boolean;
  id?: string;
  isCollected?: boolean;
  name?: string;
  price?: number | null;
  productId?: string;
  quantity?: number;
}

export interface CartoShoppingListContainer {
  id?: string;
  items?: CartoShoppingListItem[] | null;
  name?: string;
}

export interface CartoReceiptItem {
  category?: string | null;
  id?: string;
  name?: string;
  price?: number | null;
  productId?: string;
  quantity?: number;
  scannedAt?: string | null;
  total?: number;
}

export interface CartoActiveSessionData {
  active?: true;
  cart?: {
    cartCode?: string;
    status?: string;
  };
  cartCode: string;
  cartItems: CartoReceiptItem[];
  cartSessionId: string;
  cartStatus?: string;
  list?: CartoShoppingListContainer | null;
  paymentStatus?: string | null;
  receiptId?: string | null;
  session?: {
    endedAt?: string | null;
    id?: string;
    startedAt?: string | null;
    status?: string;
  };
  sessionId: string;
  shoppingList?: CartoShoppingListContainer | null;
  status: "active";
  total: number;
}

export type CartoActiveSessionResponse = CartoWaitingSessionData | CartoActiveSessionData;

interface CartoProductRecord {
  category?: string | null;
  emoji?: string | null;
  id: string;
  name: string;
  price?: number | null;
}

const MOCK_WAIT_MS = 4500;
const MOCK_QR_EXPIRES_AT_MS = 5 * 60 * 1000;
const MOCK_ACTIVE_SESSION: CartoActiveSessionData = {
  active: true,
  cartCode: "CART-001",
  cartItems: [],
  cartSessionId: "MOCK-CARTSESSION-001",
  cartStatus: "IN_USE",
  paymentStatus: null,
  receiptId: "MOCK-RECEIPT-001",
  sessionId: "MOCK-SESSION-001",
  shoppingList: {
    id: "MOCK-LIST-001",
    name: "Mock list",
    items: [
      { productId: "milk", name: "Milk", quantity: 1, checked: false },
      { productId: "bread", name: "Bread", quantity: 2, checked: false },
      { productId: "cola", name: "Coca Cola", quantity: 1, checked: false }
    ]
  },
  status: "active",
  total: 0
};

let mockOnlineStartedAt = 0;

export async function requestCarto<T>(
  path: string,
  options: (RequestInit & { auth?: boolean }) = {}
): Promise<T> {
  const { auth = true, headers, ...requestInit } = options;
  const url = buildAbsoluteUrl(path);
  const requestHeaders = new Headers(headers ?? {});

  if (auth) {
    if (!DEVICE_SECRET) {
      throw new Error("Device secret is missing. Set DEVICE_SECRET or EXPO_PUBLIC_DEVICE_SECRET.");
    }
    requestHeaders.set("Authorization", `Bearer ${DEVICE_SECRET}`);
  }

  if (requestInit.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...requestInit,
    headers: requestHeaders
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(readApiError(payload, response.status));
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.success === false) {
      throw new Error(readApiError(envelope, response.status));
    }
    if (envelope.success === true) {
      return envelope.data as T;
    }
  }

  return payload as T;
}

export async function fetchCartoQr(cartCode = CART_CODE): Promise<CartoQrData> {
  if (CARTO_INTEGRATION_MODE === "mock-online") {
    return buildMockQrData(cartCode || MOCK_ACTIVE_SESSION.cartCode);
  }

  if (!cartCode) {
    throw new Error("Cart code is missing. Set CART_CODE or EXPO_PUBLIC_CART_CODE.");
  }

  return requestCarto<CartoQrData>(`/api/carts/${encodeURIComponent(cartCode)}/qrcode`, {
    method: "GET"
  });
}

export async function fetchCartoActiveSession(
  cartCode = CART_CODE,
  signal?: AbortSignal
): Promise<CartoActiveSessionResponse> {
  if (CARTO_INTEGRATION_MODE === "mock-online") {
    if (!mockOnlineStartedAt) {
      mockOnlineStartedAt = Date.now();
    }

    if ((Date.now() - mockOnlineStartedAt) < MOCK_WAIT_MS) {
      return {
        active: false,
        cartCode: cartCode || MOCK_ACTIVE_SESSION.cartCode,
        cartStatus: "READY",
        status: "waiting"
      };
    }

    return {
      ...MOCK_ACTIVE_SESSION,
      cartCode: cartCode || MOCK_ACTIVE_SESSION.cartCode
    };
  }

  if (!cartCode) {
    throw new Error("Cart code is missing. Set CART_CODE or EXPO_PUBLIC_CART_CODE.");
  }

  const data = await requestCarto<unknown>(`/api/carts/${encodeURIComponent(cartCode)}/active-session`, {
    method: "GET",
    signal
  });

  return normalizeActiveSessionResponse(data, cartCode);
}

export async function getActiveSession(
  cartCode = CART_CODE,
  _deviceSecret = DEVICE_SECRET,
  signal?: AbortSignal
): Promise<CartApiResult<CartoActiveSessionResponse>> {
  try {
    const data = await fetchCartoActiveSession(cartCode, signal);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      data: {
        active: false,
        cartCode: cartCode || "CART-001",
        status: "waiting"
      },
      error: error instanceof Error ? error.message : "Backend unavailable."
    };
  }
}

export async function addCartoItem(
  payload: CartoItemActionPayload,
  previousSnapshot: CartSnapshot | null
): Promise<CartSnapshot> {
  const cartCode = ensureCartCode();
  const activePayload = await requestCarto<unknown>(`/api/carts/${encodeURIComponent(cartCode)}/items`, {
    body: JSON.stringify({
      category: payload.category ?? null,
      name: payload.name,
      price: safeNumber(payload.price),
      productId: payload.productId,
      quantity: safeQuantity(payload.quantity),
    }),
    method: "POST"
  });
  return mapActiveSessionToSnapshot(normalizeRequiredActiveSessionResponse(activePayload, cartCode), previousSnapshot);
}

export async function removeCartoItem(
  payload: CartoItemActionPayload,
  previousSnapshot: CartSnapshot | null
): Promise<CartSnapshot> {
  const cartCode = ensureCartCode();
  const activePayload = await requestCarto<unknown>(`/api/carts/${encodeURIComponent(cartCode)}/items/remove`, {
    body: JSON.stringify({
      name: payload.name,
      productId: payload.productId,
      quantity: safeQuantity(payload.quantity)
    }),
    method: "POST"
  });
  return mapActiveSessionToSnapshot(normalizeRequiredActiveSessionResponse(activePayload, cartCode), previousSnapshot);
}

export async function checkoutCarto(previousSnapshot: CartSnapshot | null): Promise<CartSnapshot> {
  const cartCode = ensureCartCode();
  const data = await requestCarto<CartoCheckoutData>(`/api/carts/${encodeURIComponent(cartCode)}/checkout`, {
    body: JSON.stringify({}),
    method: "POST"
  });
  return mapCheckoutResponseToSnapshot(data, previousSnapshot);
}

export async function closeCartoSession(): Promise<CartSnapshot> {
  const cartCode = ensureCartCode();
  await requestCarto<CartoCheckoutData>(`/api/carts/${encodeURIComponent(cartCode)}/close-session`, {
    body: JSON.stringify({}),
    method: "POST"
  });

  let qrData: CartoQrData | null = null;
  try {
    qrData = await fetchCartoQr(cartCode);
  } catch {
    qrData = null;
  }

  return buildWaitingSnapshot(cartCode, qrData);
}

export async function addCartItem(
  _cartCode = CART_CODE,
  _deviceSecret = DEVICE_SECRET,
  payload: CartoItemActionPayload
) {
  return addCartoItem(payload, null);
}

export async function removeCartItem(
  _cartCode = CART_CODE,
  _deviceSecret = DEVICE_SECRET,
  payload: CartoItemActionPayload
) {
  return removeCartoItem(payload, null);
}

export async function checkoutCart(
  _cartCode = CART_CODE,
  _deviceSecret = DEVICE_SECRET,
  _payload?: unknown
) {
  return checkoutCarto(null);
}

export async function closeCartSession(
  _cartCode = CART_CODE,
  _deviceSecret = DEVICE_SECRET,
  _payload?: unknown
) {
  return closeCartoSession();
}

export async function fetchCartoCatalog(signal?: AbortSignal) {
  if (CARTO_INTEGRATION_MODE === "mock-online") {
    return getRegisteredCatalogProducts();
  }

  try {
    const data = await requestCarto<CartoProductRecord[]>("/api/products", {
      method: "GET",
      signal
    });
    const products = data.map((product) => normalizeRemoteProduct(product));
    registerCatalogProducts(products);
    return products;
  } catch {
    return getRegisteredCatalogProducts();
  }
}

export function buildOnlinePairingUrl(cartCode = CART_CODE) {
  if (!cartCode) return "";

  try {
    return new URL(`/pair?cartCode=${encodeURIComponent(cartCode)}`, `${CARTO_WEB_BASE_URL}/`).toString();
  } catch {
    return `${CARTO_WEB_BASE_URL}/pair?cartCode=${encodeURIComponent(cartCode)}`;
  }
}

export function buildWaitingSnapshot(cartCode = CART_CODE, qrData?: CartoQrData | null): CartSnapshot {
  const effectiveCartCode = qrData?.payload.cartCode || cartCode || "CART-001";
  const qrPayload = qrData?.qrValue ?? (CARTO_INTEGRATION_MODE === "mock-online" ? buildOnlinePairingUrl(effectiveCartCode) : "");

  return {
    cartId: effectiveCartCode,
    sessionId: null,
    state: "WAITING_FOR_LIST",
    pairing: {
      cartId: effectiveCartCode,
      pairingCode: qrData?.payload.pairingCode ?? "",
      qrPayload,
      transport: "backend",
      expiresAt: qrData?.expiresAt ?? undefined
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

export function mapActiveSessionToSnapshot(data: CartoActiveSessionData, previousSnapshot: CartSnapshot | null): CartSnapshot {
  const cartItems = mapReceiptItems(data.cartItems);
  const shoppingList = mapShoppingListItems(data, cartItems);
  const subtotal = roundMoney(cartItems.reduce((sum, item) => sum + safeNumber(item.lineTotal), 0));
  const total = roundMoney(Number.isFinite(data.total) ? data.total : subtotal);
  const tax = roundMoney(Math.max(0, total - subtotal));
  const paymentStatus = mapPaymentStatus(data.paymentStatus, total, cartItems.length);
  const snapshotState = mapSnapshotState(paymentStatus);
  const pairing = previousSnapshot?.pairing ?? null;

  return {
    cartId: data.cartCode,
    sessionId: data.sessionId,
    state: snapshotState,
    pairing: {
      cartId: data.cartCode,
      pairingCode: pairing?.pairingCode ?? "",
      qrPayload: pairing?.qrPayload ?? "",
      transport: "backend",
      expiresAt: pairing?.expiresAt
    },
    activeListId: data.cartSessionId,
    shoppingMode: "LIST",
    shoppingList,
    cartItems,
    totals: {
      subtotal,
      discount: 0,
      tax,
      total
    },
    payment: {
      status: paymentStatus,
      amount: total,
      transactionId: data.receiptId ?? undefined,
      updatedAt: new Date().toISOString()
    },
    alerts: previousSnapshot?.alerts ?? []
  };
}

export function mapCheckoutResponseToSnapshot(data: CartoCheckoutData, previousSnapshot: CartSnapshot | null): CartSnapshot {
  const existingCartItems = previousSnapshot?.cartItems ?? [];
  const subtotal = roundMoney(safeNumber(data.subtotal, previousSnapshot?.totals.subtotal ?? 0));
  const tax = roundMoney(safeNumber(data.tax, previousSnapshot?.totals.tax ?? 0));
  const total = roundMoney(safeNumber(data.total, previousSnapshot?.totals.total ?? subtotal + tax));
  const paymentStatus = mapPaymentStatus(data.paymentStatus, total, existingCartItems.length);

  return {
    cartId: data.cartCode || previousSnapshot?.cartId || CART_CODE || "CART-001",
    sessionId: previousSnapshot?.sessionId ?? null,
    state: paymentStatus === "PAID" ? "PAID" : mapSnapshotState(paymentStatus),
    pairing: previousSnapshot?.pairing ?? null,
    activeListId: data.cartSessionId ?? previousSnapshot?.activeListId,
    shoppingMode: previousSnapshot?.shoppingMode ?? "LIST",
    shoppingList: previousSnapshot?.shoppingList ?? [],
    cartItems: existingCartItems,
    totals: {
      subtotal,
      discount: 0,
      tax,
      total
    },
    payment: {
      status: paymentStatus === "NOT_STARTED" ? "PAID" : paymentStatus,
      amount: total,
      transactionId: data.receiptId ?? previousSnapshot?.payment.transactionId,
      updatedAt: new Date().toISOString()
    },
    alerts: previousSnapshot?.alerts ?? []
  };
}

export function resetMockOnlineSession() {
  mockOnlineStartedAt = 0;
}

function normalizeActiveSessionResponse(
  payload: unknown,
  cartCode: string,
  expectedStatus?: "active" | "waiting"
): CartoActiveSessionResponse {
  const data = asRecord(payload);
  if (!data) {
    throw new Error("Malformed active-session response.");
  }

  const status = data.status;
  if (status === "active") {
    const cartItems = Array.isArray(data.cartItems) ? data.cartItems as CartoReceiptItem[] : [];
    const shoppingList = readShoppingListContainer(data);

    const normalized: CartoActiveSessionData = {
      active: true,
      cart: asMaybeCart(data.cart),
      cartCode: String(data.cartCode ?? cartCode),
      cartItems,
      cartSessionId: String(data.cartSessionId ?? ""),
      cartStatus: typeof data.cartStatus === "string" ? data.cartStatus : undefined,
      list: shoppingList.fromList,
      paymentStatus: typeof data.paymentStatus === "string" || data.paymentStatus === null ? data.paymentStatus as string | null : null,
      receiptId: typeof data.receiptId === "string" || data.receiptId === null ? data.receiptId as string | null : null,
      session: asMaybeSession(data.session),
      sessionId: String(data.sessionId ?? ""),
      shoppingList: shoppingList.fromShoppingList,
      status: "active",
      total: safeNumber(data.total)
    };

    return normalized;
  }

  if (expectedStatus === "active") {
    throw new Error("Active cart session response was not returned.");
  }

  return {
    active: false,
    cart: asMaybeCart(data.cart),
    cartCode: String(data.cartCode ?? cartCode),
    cartStatus: typeof data.cartStatus === "string" ? data.cartStatus : undefined,
    status: "waiting"
  };
}

function normalizeRequiredActiveSessionResponse(payload: unknown, cartCode: string) {
  const normalized = normalizeActiveSessionResponse(payload, cartCode, "active");
  if (normalized.status !== "active") {
    throw new Error("Active cart session response was not returned.");
  }
  return normalized;
}

function mapReceiptItems(items: CartoReceiptItem[]) {
  return items.map((item, index) => {
    const productId = String(item.productId ?? item.id ?? item.name ?? `cart-item-${index}`);
    const fallbackProduct = findCatalogProductById(productId);
    const unitPrice = roundMoney(safeNumber(item.price, fallbackProduct?.price ?? 0));
    const quantity = safeQuantity(item.quantity);
    const computedTotal = unitPrice * quantity;
    const lineTotal = roundMoney(safeNumber(item.total, computedTotal));

    return {
      lineId: `cart-line-${productId}-${index}`,
      productId,
      barcode: fallbackProduct?.barcode ?? `carto-${productId}`,
      name: item.name ?? fallbackProduct?.name ?? `Cart item ${index + 1}`,
      unitPrice,
      quantity,
      lineTotal: Number.isFinite(lineTotal) ? lineTotal : 0,
      category: normalizeOptionalString(item.category) ?? fallbackProduct?.category,
      shelfId: fallbackProduct?.shelfId,
      mapNodeId: fallbackProduct?.mapNodeId,
      addedAt: item.scannedAt ?? new Date().toISOString()
    } satisfies ReceiptLine;
  });
}

function mapShoppingListItems(session: CartoActiveSessionData, cartItems: ReceiptLine[]) {
  const listContainer = session.shoppingList ?? session.list ?? null;
  const items = Array.isArray(listContainer?.items) ? listContainer.items : [];
  const inCartByProductId = new Map<string, number>();
  const inCartByName = new Map<string, number>();

  for (const cartItem of cartItems) {
    inCartByProductId.set(cartItem.productId, (inCartByProductId.get(cartItem.productId) ?? 0) + cartItem.quantity);
    const key = normalizeKey(cartItem.name);
    inCartByName.set(key, (inCartByName.get(key) ?? 0) + cartItem.quantity);
  }

  return items.map((item, index) => {
    const productId = String(item.productId ?? item.id ?? item.name ?? `list-item-${index}`);
    const name = item.name ?? `Item ${index + 1}`;
    const quantity = safeQuantity(item.quantity);
    const fallbackProduct = findCatalogProductById(productId);
    const inCartQuantity = inCartByProductId.get(productId)
      ?? inCartByName.get(normalizeKey(name))
      ?? 0;

    return {
      productId,
      name,
      quantity,
      checked: Boolean(item.checked ?? item.isCollected ?? false),
      inCartQuantity,
      status: deriveShoppingItemStatus(inCartQuantity, quantity),
      price: safeMaybeNumber(item.price, fallbackProduct?.price),
      category: normalizeOptionalString(item.category) ?? fallbackProduct?.category,
      shelfId: fallbackProduct?.shelfId,
      mapNodeId: fallbackProduct?.mapNodeId
    } satisfies ShoppingListItem;
  });
}

function deriveShoppingItemStatus(inCartQuantity: number, targetQuantity: number): ShoppingListItemStatus {
  if (inCartQuantity <= 0) return "PENDING";
  if (inCartQuantity < targetQuantity) return "PARTIAL";
  return "IN_CART";
}

function mapPaymentStatus(rawStatus: string | null | undefined, total: number, itemCount: number): PaymentStatus {
  const normalized = rawStatus?.toUpperCase() ?? "";
  if (normalized.includes("PAID")) return "PAID";
  if (normalized.includes("FAIL")) return "FAILED";
  if (normalized.includes("WAIT")) return "WAITING_PAYMENT";
  if (total <= 0 && itemCount <= 0) return "NOT_STARTED";
  return "NOT_STARTED";
}

function mapSnapshotState(paymentStatus: PaymentStatus): CartSnapshot["state"] {
  if (paymentStatus === "PAID") return "PAID";
  if (paymentStatus === "FAILED") return "PAYMENT_FAILED";
  if (paymentStatus === "WAITING_PAYMENT") return "WAITING_PAYMENT";
  return "SHOPPING";
}

function buildAbsoluteUrl(path: string) {
  try {
    return new URL(path, `${CARTO_API_BASE_URL}/`).toString();
  } catch {
    throw new Error("Carto API base URL is invalid. Check CARTO_API_BASE_URL.");
  }
}

async function parseJsonSafely(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function readApiError(payload: unknown, status: number) {
  const record = asRecord(payload);
  if (!record) {
    return `HTTP ${status}`;
  }

  const errorRecord = asRecord(record.error) ?? record;
  const message = normalizeOptionalString(errorRecord.message)
    ?? normalizeOptionalString(errorRecord.error)
    ?? normalizeOptionalString(errorRecord.code);

  return message ?? `HTTP ${status}`;
}

function readShoppingListContainer(data: Record<string, unknown>) {
  const fromShoppingList = asMaybeShoppingList(data.shoppingList);
  const fromList = asMaybeShoppingList(data.list);
  return { fromList, fromShoppingList };
}

function asMaybeShoppingList(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;

  return {
    id: normalizeOptionalString(record.id) ?? undefined,
    items: Array.isArray(record.items) ? record.items as CartoShoppingListItem[] : [],
    name: normalizeOptionalString(record.name) ?? undefined
  } satisfies CartoShoppingListContainer;
}

function asMaybeCart(value: unknown) {
  const record = asRecord(value);
  if (!record) return undefined;

  return {
    cartCode: normalizeOptionalString(record.cartCode) ?? undefined,
    status: normalizeOptionalString(record.status) ?? undefined
  };
}

function asMaybeSession(value: unknown) {
  const record = asRecord(value);
  if (!record) return undefined;

  return {
    endedAt: normalizeOptionalString(record.endedAt),
    id: normalizeOptionalString(record.id) ?? undefined,
    startedAt: normalizeOptionalString(record.startedAt),
    status: normalizeOptionalString(record.status) ?? undefined
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function safeMaybeNumber(value: unknown, fallback?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeQuantity(value: unknown) {
  const quantity = typeof value === "number" && Number.isFinite(value) ? value : 1;
  return Math.max(0, Math.round(quantity));
}

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function ensureCartCode() {
  if (!CART_CODE) {
    throw new Error("Cart code is missing. Set CART_CODE or EXPO_PUBLIC_CART_CODE.");
  }

  return CART_CODE;
}

function buildMockQrData(cartCode: string): CartoQrData {
  return {
    expiresAt: new Date(Date.now() + MOCK_QR_EXPIRES_AT_MS).toISOString(),
    payload: {
      cartCode,
      pairingCode: "MOCK-PAIR",
      type: "cart_pairing"
    },
    qrValue: buildOnlinePairingUrl(cartCode)
  };
}
