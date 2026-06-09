import type {
  CartActiveSessionActive,
  CartActiveSessionResponse,
  CartActiveSessionWaiting,
  CartApiCartItem,
  CartApiShoppingListItem,
  CartSnapshot,
  PaymentStatus,
  ReceiptLine,
  ShoppingListItem,
  ShoppingListItemStatus
} from "@carto/shared";
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

interface CartApiResult<T> {
  data: T;
  error?: string;
  ok: boolean;
}

interface CartApiActionPayload {
  cartSessionId?: string | null;
  productId?: string;
  quantity?: number;
  receiptId?: string | null;
  sessionId?: string | null;
}

interface CartoProductRecord {
  id: string;
  name: string;
  category?: string | null;
  price?: number | null;
  emoji?: string | null;
}

const MOCK_WAIT_MS = 4500;
const MOCK_ACTIVE_SESSION: CartActiveSessionActive = {
  status: "active",
  cartCode: "CART-001",
  sessionId: "MOCK-SESSION-001",
  cartSessionId: "MOCK-CARTSESSION-001",
  receiptId: "MOCK-RECEIPT-001",
  shoppingList: [
    { productId: "milk", name: "Milk", quantity: 1, checked: false },
    { productId: "bread", name: "Bread", quantity: 2, checked: false },
    { productId: "cola", name: "Coca Cola", quantity: 1, checked: false }
  ],
  cartItems: [],
  total: 0
};

let mockOnlineStartedAt = 0;

export async function getActiveSession(
  cartCode = CART_CODE,
  deviceSecret = DEVICE_SECRET,
  signal?: AbortSignal
): Promise<CartApiResult<CartActiveSessionResponse>> {
  if (CARTO_INTEGRATION_MODE === "mock-online") {
    if (!mockOnlineStartedAt) {
      mockOnlineStartedAt = Date.now();
    }

    if ((Date.now() - mockOnlineStartedAt) < MOCK_WAIT_MS) {
      return {
        ok: true,
        data: {
          status: "waiting",
          cartCode: cartCode || MOCK_ACTIVE_SESSION.cartCode
        }
      };
    }

    return {
      ok: true,
      data: {
        ...MOCK_ACTIVE_SESSION,
        cartCode: cartCode || MOCK_ACTIVE_SESSION.cartCode
      }
    };
  }

  const url = `${CARTO_API_BASE_URL}/api/carts/${cartCode}/active-session`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: buildAuthHeaders(deviceSecret),
      signal
    });

    const payload = await response.json().catch(() => null) as CartActiveSessionResponse | ApiEnvelope<CartActiveSessionResponse> | ApiErrorShape | null;

    if (!response.ok) {
      return {
        ok: false,
        error: readApiError(payload, response.status),
        data: { status: "waiting", cartCode }
      };
    }

    const normalized = normalizeActiveSessionPayload(payload, cartCode);
    return {
      ok: true,
      data: normalized
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Backend unavailable.",
      data: { status: "waiting", cartCode }
    };
  }
}

export async function addCartItem(
  cartCode = CART_CODE,
  deviceSecret = DEVICE_SECRET,
  payload: CartApiActionPayload
) {
  return postCartAction(`${CARTO_API_BASE_URL}/api/carts/${cartCode}/items`, deviceSecret, payload);
}

export async function removeCartItem(
  cartCode = CART_CODE,
  deviceSecret = DEVICE_SECRET,
  payload: CartApiActionPayload
) {
  return postCartAction(`${CARTO_API_BASE_URL}/api/carts/${cartCode}/items/remove`, deviceSecret, payload);
}

export async function checkoutCart(
  cartCode = CART_CODE,
  deviceSecret = DEVICE_SECRET,
  payload: CartApiActionPayload
) {
  return postCartAction(`${CARTO_API_BASE_URL}/api/carts/${cartCode}/checkout`, deviceSecret, payload);
}

export async function closeCartSession(
  cartCode = CART_CODE,
  deviceSecret = DEVICE_SECRET,
  payload: CartApiActionPayload
) {
  return postCartAction(`${CARTO_API_BASE_URL}/api/carts/${cartCode}/close-session`, deviceSecret, payload);
}

export async function fetchCartoCatalog(signal?: AbortSignal) {
  if (CARTO_INTEGRATION_MODE === "mock-online") {
    return getRegisteredCatalogProducts();
  }

  try {
    const data = await readJson<CartoProductRecord[]>(`${CARTO_API_BASE_URL}/api/products`, DEVICE_SECRET, signal);
    const products = data.map((product) => normalizeRemoteProduct(product));
    registerCatalogProducts(products);
    return products;
  } catch {
    return getRegisteredCatalogProducts();
  }
}

export function buildOnlinePairingUrl(cartCode = CART_CODE) {
  return `${CARTO_WEB_BASE_URL}/pair?cartCode=${encodeURIComponent(cartCode || "CART-001")}`;
}

export function buildWaitingSnapshot(cartCode = CART_CODE): CartSnapshot {
  const effectiveCartCode = cartCode || "CART-001";
  return {
    cartId: effectiveCartCode,
    sessionId: null,
    state: "WAITING_FOR_LIST",
    pairing: {
      cartId: effectiveCartCode,
      pairingCode: "",
      qrPayload: buildOnlinePairingUrl(effectiveCartCode),
      transport: "backend"
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

export function mapActiveSessionToSnapshot(data: CartActiveSessionActive, previousSnapshot: CartSnapshot | null): CartSnapshot {
  const cartItems = mapCartItems(data.cartItems);
  const shoppingList = mapShoppingListItems(data.shoppingList, cartItems);
  const subtotal = roundMoney(cartItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const total = roundMoney(data.total ?? subtotal);
  const tax = roundMoney(Math.max(0, total - subtotal));
  const paymentStatus = mapPaymentStatus(total, cartItems.length);
  const snapshotState = mapSnapshotState(paymentStatus);

  return {
    cartId: data.cartCode,
    sessionId: data.sessionId,
    state: snapshotState,
    pairing: previousSnapshot?.pairing
      ? {
        ...previousSnapshot.pairing,
        cartId: data.cartCode,
        qrPayload: buildOnlinePairingUrl(data.cartCode)
      }
      : {
        cartId: data.cartCode,
        pairingCode: "",
        qrPayload: buildOnlinePairingUrl(data.cartCode),
        transport: "backend"
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

export function resetMockOnlineSession() {
  mockOnlineStartedAt = 0;
}

async function postCartAction(url: string, deviceSecret: string, body: CartApiActionPayload) {
  if (CARTO_INTEGRATION_MODE === "mock-online") {
    return { ok: true, data: { mocked: true } };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...buildAuthHeaders(deviceSecret),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => null) as ApiEnvelope<unknown> | ApiErrorShape | null;
    if (!response.ok) {
      return {
        ok: false,
        error: readApiError(payload, response.status),
        data: null
      };
    }

    return {
      ok: true,
      data: payload
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Backend unavailable.",
      data: null
    };
  }
}

async function readJson<T>(url: string, deviceSecret: string, signal?: AbortSignal) {
  const response = await fetch(url, {
    method: "GET",
    headers: buildAuthHeaders(deviceSecret),
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

function normalizeActiveSessionPayload(
  payload: CartActiveSessionResponse | ApiEnvelope<CartActiveSessionResponse> | ApiErrorShape | null,
  cartCode: string
): CartActiveSessionResponse {
  if (!payload || typeof payload !== "object") {
    return { status: "waiting", cartCode };
  }

  const data = "data" in payload && payload.data ? payload.data : payload;
  if (!data || typeof data !== "object") {
    return { status: "waiting", cartCode };
  }

  if ("status" in data && data.status === "active") {
    return {
      status: "active",
      cartCode: String(data.cartCode ?? cartCode),
      sessionId: String(data.sessionId ?? ""),
      cartSessionId: String(data.cartSessionId ?? ""),
      receiptId: (data.receiptId as string | null | undefined) ?? null,
      shoppingList: normalizeShoppingList((data.shoppingList as unknown[]) ?? []),
      cartItems: normalizeCartItems((data.cartItems as unknown[]) ?? []),
      total: typeof data.total === "number" ? data.total : 0
    };
  }

  return {
    status: "waiting",
    cartCode: String(("cartCode" in data ? data.cartCode : cartCode) ?? cartCode)
  };
}

function normalizeShoppingList(items: unknown[]): CartApiShoppingListItem[] {
  return items.map((item, index) => {
    const normalized = item as Record<string, unknown>;
    return {
      productId: String(normalized.productId ?? `item-${index}`),
      name: String(normalized.name ?? `Item ${index + 1}`),
      quantity: typeof normalized.quantity === "number" ? normalized.quantity : 1,
      checked: typeof normalized.checked === "boolean" ? normalized.checked : false
    };
  });
}

function normalizeCartItems(items: unknown[]): CartApiCartItem[] {
  return items.map((item, index) => {
    const normalized = item as Record<string, unknown>;
    const productId = String(normalized.productId ?? `cart-item-${index}`);
    const fallbackProduct = findCatalogProductById(productId);
    const price = typeof normalized.price === "number" ? normalized.price : (fallbackProduct?.price ?? 0);
    const quantity = typeof normalized.quantity === "number" ? normalized.quantity : 1;

    return {
      productId,
      name: String(normalized.name ?? fallbackProduct?.name ?? `Cart item ${index + 1}`),
      price,
      quantity,
      total: typeof normalized.total === "number" ? normalized.total : roundMoney(price * quantity)
    };
  });
}

function mapCartItems(items: CartApiCartItem[]) {
  return items.map((item) => {
    const fallbackProduct = findCatalogProductById(item.productId);
    return {
      lineId: `cart-line-${item.productId}`,
      productId: item.productId,
      barcode: fallbackProduct?.barcode ?? `carto-${item.productId}`,
      name: item.name,
      unitPrice: roundMoney(item.price),
      quantity: item.quantity,
      lineTotal: roundMoney(item.total),
      category: fallbackProduct?.category,
      shelfId: fallbackProduct?.shelfId,
      mapNodeId: fallbackProduct?.mapNodeId,
      addedAt: new Date().toISOString()
    } satisfies ReceiptLine;
  });
}

function mapShoppingListItems(items: CartApiShoppingListItem[], cartItems: ReceiptLine[]) {
  const inCartByProductId = new Map<string, number>();
  const inCartByName = new Map<string, number>();

  for (const cartItem of cartItems) {
    inCartByProductId.set(cartItem.productId, (inCartByProductId.get(cartItem.productId) ?? 0) + cartItem.quantity);
    const key = normalizeKey(cartItem.name);
    inCartByName.set(key, (inCartByName.get(key) ?? 0) + cartItem.quantity);
  }

  return items.map((item) => {
    const fallbackProduct = findCatalogProductById(item.productId);
    const inCartQuantity = inCartByProductId.get(item.productId)
      ?? inCartByName.get(normalizeKey(item.name))
      ?? 0;

    return {
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      checked: item.checked,
      inCartQuantity,
      status: deriveShoppingItemStatus(inCartQuantity, item.quantity),
      price: fallbackProduct?.price,
      category: fallbackProduct?.category,
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

function mapPaymentStatus(total: number, itemCount: number): PaymentStatus {
  if (total <= 0 && itemCount <= 0) return "NOT_STARTED";
  return "NOT_STARTED";
}

function mapSnapshotState(paymentStatus: PaymentStatus): CartSnapshot["state"] {
  if (paymentStatus === "PAID") return "PAID";
  if (paymentStatus === "FAILED") return "PAYMENT_FAILED";
  if (paymentStatus === "WAITING_PAYMENT") return "WAITING_PAYMENT";
  return "SHOPPING";
}

function buildAuthHeaders(deviceSecret: string) {
  return {
    Authorization: `Bearer ${deviceSecret}`
  };
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function readApiError(payload: ApiEnvelope<unknown> | ApiErrorShape | CartActiveSessionResponse | null | undefined, status: number) {
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
