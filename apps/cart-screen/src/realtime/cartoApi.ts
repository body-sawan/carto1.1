import type { CartSnapshot, PaymentStatus, ReceiptLine, ShoppingListItem, ShoppingListItemStatus } from "@carto/shared";
import { CARTO_API_BASE_URL, CARTO_WEB_BASE_URL, CART_CODE, DEVICE_SECRET } from "./config";
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

interface CartoResponseInfo {
  payload: unknown;
  status: number;
  url: string;
}

export interface CartApiResult<T> {
  data: T;
  error?: string;
  errorKind?: "auth" | "cart_not_found" | "cors" | "network" | "response";
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

export interface CartoPaymentQrData {
  amount?: number;
  cartSessionId?: string | null;
  currency?: string | null;
  paymentStatus?: string | null;
  paymentUrl?: string | null;
  qrValue?: string | null;
  receiptId?: string | null;
}

export interface CartoPaymentStatusData {
  amount?: number;
  cartSessionId?: string | null;
  currency?: string | null;
  paymentStatus: string;
  paymentUrl?: string | null;
  qrValue?: string | null;
  receiptId: string;
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

export interface CartoReceiptSummary {
  id?: string | null;
  items?: CartoReceiptItem[] | null;
  paymentStatus?: string | null;
  status?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
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
  receipt?: CartoReceiptSummary | null;
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

class CartoRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
    readonly payload: unknown
  ) {
    super(message);
    this.name = "CartoRequestError";
  }
}

export async function requestCarto<T>(
  path: string,
  options: (RequestInit & { auth?: boolean; onResponse?: (info: CartoResponseInfo) => void }) = {}
): Promise<T> {
  const { auth = true, headers, onResponse, ...requestInit } = options;
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
  onResponse?.({ payload, status: response.status, url });

  if (!response.ok) {
    throw new CartoRequestError(readApiError(payload, response.status), response.status, readApiErrorCode(payload), payload);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.success === false) {
      throw new CartoRequestError(readApiError(envelope, response.status), response.status, readApiErrorCode(envelope), envelope);
    }
    if (envelope.success === true) {
      return envelope.data as T;
    }
  }

  return payload as T;
}

export async function fetchCartoQr(cartCode = CART_CODE, signal?: AbortSignal): Promise<CartoQrData> {
  if (!cartCode) {
    throw new Error("Cart code is missing. Set CART_CODE or EXPO_PUBLIC_CART_CODE.");
  }

  const requestPath = `/api/carts/${encodeURIComponent(cartCode)}/qrcode?t=${Date.now()}`;
  console.log("[cart-screen] QR fetch URL", buildAbsoluteUrl(requestPath));

  const data = await requestCarto<CartoQrData>(requestPath, {
    cache: "no-store",
    method: "GET",
    onResponse: ({ payload, status }) => {
      console.log("[cart-screen] QR fetch status code", status);
      console.log("[cart-screen] QR response payload", payload);
    },
    signal
  });

  if (!data?.payload && !data?.qrValue) {
    throw new Error("QR code is unavailable from backend.");
  }

  const normalized = normalizeCartPairingQrData(data);
  console.log("[cart-screen] qrValue displayed", normalized.qrValue);
  console.log("[cart-screen] expiresAt", normalized.expiresAt ?? null);
  return normalized;
}

export async function getCartQrCode(cartCode = CART_CODE, signal?: AbortSignal) {
  return fetchCartoQr(cartCode, signal);
}

export async function fetchCartoActiveSession(
  cartCode = CART_CODE,
  signal?: AbortSignal
): Promise<CartoActiveSessionResponse> {
  if (!cartCode) {
    throw new Error("Cart code is missing. Set CART_CODE or EXPO_PUBLIC_CART_CODE.");
  }

  const requestPath = `/api/carts/${encodeURIComponent(cartCode)}/active-session?t=${Date.now()}`;
  console.log("[cart-screen] active-session poll URL", buildAbsoluteUrl(requestPath));

  const data = await requestCarto<unknown>(requestPath, {
    cache: "no-store",
    method: "GET",
    onResponse: ({ payload, status }) => {
      console.log("[cart-screen] active-session status code", status);
      console.log("[cart-screen] active-session response", payload);
    },
    signal
  });

  const normalized = normalizeActiveSessionResponse(data, cartCode);
  const listContainer = normalized.status === "active" ? (normalized.shoppingList ?? normalized.list ?? null) : null;
  const itemCount = Array.isArray(listContainer?.items) ? listContainer.items.length : 0;
  console.log("[cart-screen] active true/false", normalized.status === "active");
  console.log("[cart-screen] shoppingList item count", itemCount);
  return normalized;
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
        cartCode: cartCode || "cart-01",
        status: "waiting"
      },
      error: error instanceof Error ? error.message : "Backend unavailable.",
      errorKind: getCartoErrorKind(error)
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

export async function requestPaymentQr(
  payload: { cartSessionId: string; receiptId: string },
  cartCode = CART_CODE
): Promise<CartoPaymentQrData> {
  if (!cartCode) {
    throw new Error("Cart code is missing. Set CART_CODE or EXPO_PUBLIC_CART_CODE.");
  }

  const requestPath = `/api/carts/${encodeURIComponent(cartCode)}/payment-qr`;
  console.log("[cart-screen] payment QR request URL", buildAbsoluteUrl(requestPath));
  console.log("[cart-screen] payment QR request meta", {
    cartCode,
    cartSessionId: payload.cartSessionId,
    hasReceiptId: Boolean(payload.receiptId)
  });

  const data = await requestCarto<unknown>(requestPath, {
    body: JSON.stringify(payload),
    cache: "no-store",
    method: "POST",
    onResponse: ({ payload: responsePayload, status }) => {
      console.log("[cart-screen] payment QR status code", status);
      console.log("[cart-screen] payment QR response", responsePayload);
    }
  });

  return normalizePaymentQrResponse(data);
}

export async function fetchPaymentStatus(
  receiptId: string,
  cartCode = CART_CODE,
  signal?: AbortSignal
): Promise<CartoPaymentStatusData> {
  if (!cartCode) {
    throw new Error("Cart code is missing. Set CART_CODE or EXPO_PUBLIC_CART_CODE.");
  }

  if (!receiptId) {
    throw new Error("Receipt is not ready yet.");
  }

  const requestPath = `/api/carts/${encodeURIComponent(cartCode)}/payment-status?receiptId=${encodeURIComponent(receiptId)}&t=${Date.now()}`;
  console.log("[cart-screen] payment-status request URL", buildAbsoluteUrl(requestPath));

  const data = await requestCarto<unknown>(requestPath, {
    cache: "no-store",
    method: "GET",
    onResponse: ({ payload, status }) => {
      console.log("[cart-screen] payment-status status code", status);
      console.log("[cart-screen] payment-status response", payload);
    },
    signal
  });

  return normalizePaymentStatusResponse(data, receiptId);
}

export async function disconnectCart(cartCode = CART_CODE) {
  if (!cartCode) {
    throw new Error("Cart code is missing. Set CART_CODE or EXPO_PUBLIC_CART_CODE.");
  }

  const requestPath = `/api/carts/${encodeURIComponent(cartCode)}/disconnect`;
  console.log("[cart-screen] disconnect request URL", buildAbsoluteUrl(requestPath));

  return requestCarto<{ activeSessionReleased?: boolean; cartCode?: string; cartStatus?: string }>(requestPath, {
    cache: "no-store",
    method: "POST",
    onResponse: ({ payload, status }) => {
      console.log("[cart-screen] disconnect request status", status);
      console.log("[cart-screen] disconnect response", payload);
    }
  });
}

export async function closeCartoSession(): Promise<CartSnapshot> {
  const cartCode = ensureCartCode();
  await disconnectCart(cartCode);

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
  const normalizedQrData = qrData ? normalizeCartPairingQrData(qrData) : null;
  const effectiveCartCode = normalizedQrData?.payload.cartCode || cartCode || "cart-01";
  const qrPayload = normalizedQrData?.qrValue ?? "";

  return {
    cartId: effectiveCartCode,
    sessionId: null,
    state: "WAITING_FOR_LIST",
    pairing: {
      cartId: effectiveCartCode,
      pairingCode: normalizedQrData?.payload.pairingCode ?? "",
      qrPayload,
      transport: "backend",
      expiresAt: normalizedQrData?.expiresAt ?? undefined
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

function normalizeCartPairingQrData(data: CartoQrData): CartoQrData {
  const parsedQrValue = parseCartPairingQrValue(data.qrValue);
  const cartCode = data.payload?.cartCode ?? parsedQrValue?.cartCode;
  const pairingCode = data.payload?.pairingCode ?? parsedQrValue?.pairingCode;

  if (!cartCode || !pairingCode) {
    throw new Error("QR response missing cartCode or pairingCode");
  }

  const qrValue = JSON.stringify({
    type: "cart_pairing",
    cartCode: String(cartCode),
    pairingCode: String(pairingCode)
  });

  return {
    ...data,
    payload: {
      type: "cart_pairing",
      cartCode: String(cartCode),
      pairingCode: String(pairingCode)
    },
    qrValue
  };
}

function parseCartPairingQrValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<CartoQrData["payload"]>;
    if (!parsed?.cartCode || !parsed?.pairingCode) {
      return null;
    }

    return {
      cartCode: String(parsed.cartCode),
      pairingCode: String(parsed.pairingCode)
    };
  } catch {
    return null;
  }
}

export function mapActiveSessionToSnapshot(data: CartoActiveSessionData, previousSnapshot: CartSnapshot | null): CartSnapshot {
  const cartItems = resolveActiveSessionCartItems(data);
  const shoppingList = mapShoppingListItems(data, cartItems);
  const subtotal = roundMoney(cartItems.reduce((sum, item) => sum + safeNumber(item.lineTotal), 0));
  const total = roundMoney(
    safeNumber(
      data.receipt?.total,
      safeNumber(data.total, subtotal)
    )
  );
  const tax = roundMoney(Math.max(0, total - subtotal));
  const paymentStatus = mapActiveSessionPaymentStatus(data.paymentStatus);
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
    cartId: data.cartCode || previousSnapshot?.cartId || CART_CODE || "cart-01",
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

export function applyPaymentSessionToSnapshot(
  snapshot: CartSnapshot,
  paymentSession: {
    amount?: number;
    paymentUrl?: string | null;
    paymentStatus?: string | null;
    qrValue?: string | null;
    receiptId?: string | null;
    status?: "idle" | "creating" | "pending" | "success" | "failed";
  } | null
): CartSnapshot {
  if (!paymentSession) {
    return snapshot;
  }

  const baseAmount = safeNumber(paymentSession.amount, snapshot.payment.amount || snapshot.totals.total);
  const hasPaymentQr = Boolean(
    (typeof paymentSession.qrValue === "string" && paymentSession.qrValue.length > 0)
    || (typeof paymentSession.paymentUrl === "string" && paymentSession.paymentUrl.length > 0)
  );
  const normalizedStatus = paymentSession.status === "success"
    ? "PAID"
    : paymentSession.status === "failed"
      ? (hasPaymentQr ? "FAILED" : snapshot.payment.status)
      : hasPaymentQr
        ? (mapPaymentStatus(paymentSession.paymentStatus, baseAmount, snapshot.cartItems.length) === "NOT_STARTED"
          ? "WAITING_PAYMENT"
          : mapPaymentStatus(paymentSession.paymentStatus, baseAmount, snapshot.cartItems.length))
        : snapshot.payment.status;

  return {
    ...snapshot,
    state: mapSnapshotState(normalizedStatus),
    payment: {
      ...snapshot.payment,
      amount: baseAmount,
      status: normalizedStatus,
      transactionId: paymentSession.receiptId ?? snapshot.payment.transactionId,
      updatedAt: new Date().toISOString()
    }
  };
}

export function resetMockOnlineSession() {
  // The device app always uses the backend as the source of truth now.
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
      receipt: asMaybeReceipt(data.receipt),
      receiptId: typeof data.receiptId === "string" || data.receiptId === null ? data.receiptId as string | null : null,
      session: asMaybeSession(data.session),
      sessionId: String(data.sessionId ?? ""),
      shoppingList: shoppingList.fromShoppingList ?? shoppingList.fromList,
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

function resolveActiveSessionCartItems(session: CartoActiveSessionData) {
  const shoppingListItems = Array.isArray((session.shoppingList ?? session.list ?? null)?.items)
    ? (session.shoppingList ?? session.list ?? null)?.items ?? []
    : [];
  const mappedCartItems = mapReceiptItems(session.cartItems ?? []);
  const mappedReceiptItems = mapReceiptItems(session.receipt?.items ?? []);
  const sanitizedCartItems = filterMirroredShoppingListItems(mappedCartItems, shoppingListItems);
  const sanitizedReceiptItems = filterMirroredShoppingListItems(mappedReceiptItems, shoppingListItems);

  if (sanitizedCartItems.length > 0) {
    return sanitizedCartItems;
  }

  if (sanitizedReceiptItems.length > 0) {
    return sanitizedReceiptItems;
  }

  return [];
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

function filterMirroredShoppingListItems(cartItems: ReceiptLine[], shoppingListItems: CartoShoppingListItem[]) {
  if (!cartItems.length || !shoppingListItems.length) {
    return cartItems;
  }

  const shoppingListKeys = new Set(
    shoppingListItems.map((item) => buildShoppingListMatchKey(item.name, item.category))
  );

  return cartItems.filter((item) => {
    const hasCheckoutValue = item.unitPrice > 0 || item.lineTotal > 0;
    if (hasCheckoutValue) {
      return true;
    }

    return !shoppingListKeys.has(buildShoppingListMatchKey(item.name, item.category));
  });
}

function deriveShoppingItemStatus(inCartQuantity: number, targetQuantity: number): ShoppingListItemStatus {
  if (inCartQuantity <= 0) return "PENDING";
  if (inCartQuantity < targetQuantity) return "PARTIAL";
  return "IN_CART";
}

function mapActiveSessionPaymentStatus(rawStatus: string | null | undefined): PaymentStatus {
  const normalized = rawStatus?.toUpperCase() ?? "";
  if (normalized.includes("PAID")) return "PAID";
  if (normalized.includes("COMPLETE")) return "PAID";
  if (normalized.includes("FAIL")) return "FAILED";
  if (normalized.includes("CANCEL")) return "CANCELLED";
  return "NOT_STARTED";
}

function mapPaymentStatus(rawStatus: string | null | undefined, total: number, itemCount: number): PaymentStatus {
  const normalized = rawStatus?.toUpperCase() ?? "";
  if (normalized.includes("PAID")) return "PAID";
  if (normalized.includes("COMPLETE")) return "PAID";
  if (normalized.includes("FAIL")) return "FAILED";
  if (normalized.includes("CANCEL")) return "CANCELLED";
  if (normalized.includes("WAIT")) return "WAITING_PAYMENT";
  if (normalized.includes("PEND")) return "WAITING_PAYMENT";
  if (normalized.includes("PROCESS")) return "WAITING_PAYMENT";
  if (total <= 0 && itemCount <= 0) return "NOT_STARTED";
  return "NOT_STARTED";
}

function mapSnapshotState(paymentStatus: PaymentStatus): CartSnapshot["state"] {
  if (paymentStatus === "PAID") return "PAID";
  if (paymentStatus === "FAILED") return "PAYMENT_FAILED";
  if (paymentStatus === "CANCELLED") return "PAYMENT_FAILED";
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

function readApiErrorCode(payload: unknown) {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const errorRecord = asRecord(record.error) ?? record;
  return normalizeOptionalString(errorRecord.code);
}

function readShoppingListContainer(data: Record<string, unknown>) {
  const fromShoppingList = asMaybeShoppingList(data.shoppingList);
  const fromList = asMaybeShoppingList(data.list);
  return { fromList, fromShoppingList };
}

function normalizePaymentQrResponse(payload: unknown): CartoPaymentQrData {
  const data = asRecord(payload);
  if (!data) {
    throw new Error("Could not create payment QR. Try again.");
  }

  const receiptId = normalizeOptionalString(data.receiptId);
  const cartSessionId = normalizeOptionalString(data.cartSessionId);
  const qrValue = normalizeOptionalString(data.qrValue) ?? normalizeOptionalString(data.paymentUrl);

  if (!receiptId || !cartSessionId || !qrValue) {
    throw new Error("Could not create payment QR. Try again.");
  }

  return {
    amount: safeNumber(data.amount),
    cartSessionId,
    currency: normalizeOptionalString(data.currency) ?? "EGP",
    paymentStatus: normalizeOptionalString(data.paymentStatus) ?? "PENDING",
    paymentUrl: normalizeOptionalString(data.paymentUrl) ?? qrValue,
    qrValue,
    receiptId
  };
}

function normalizePaymentStatusResponse(payload: unknown, requestedReceiptId: string): CartoPaymentStatusData {
  const data = asRecord(payload);
  if (!data) {
    throw new Error("Could not load payment status. Retrying...");
  }

  const paymentStatus = normalizeOptionalString(data.paymentStatus);
  if (!paymentStatus) {
    throw new Error("Could not load payment status. Retrying...");
  }

  return {
    amount: safeNumber(data.amount),
    cartSessionId: normalizeOptionalString(data.cartSessionId),
    currency: normalizeOptionalString(data.currency) ?? "EGP",
    paymentStatus,
    paymentUrl: normalizeOptionalString(data.paymentUrl),
    qrValue: normalizeOptionalString(data.qrValue),
    receiptId: normalizeOptionalString(data.receiptId) ?? requestedReceiptId
  };
}

export function getCartoErrorKind(error: unknown): "auth" | "cart_not_found" | "cors" | "network" | "response" {
  if (error instanceof CartoRequestError) {
    if (error.code === "CART_NOT_FOUND") {
      return "cart_not_found";
    }

    if (
      error.code === "DEVICE_SECRET_REQUIRED"
      || error.code === "INVALID_DEVICE_SECRET"
      || error.status === 401
      || error.status === 403
    ) {
      return "auth";
    }
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (
    isBrowserRuntime()
    && (message.includes("failed to fetch") || message.includes("network request failed") || message.includes("load failed"))
  ) {
    return "cors";
  }

  if (
    message.includes("network request failed")
    || message.includes("failed to fetch")
    || message.includes("load failed")
    || message.includes("fetch failed")
    || message.includes("backend unavailable")
  ) {
    return "network";
  }

  return "response";
}

function isBrowserRuntime() {
  return typeof window !== "undefined" && typeof document !== "undefined";
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

function asMaybeReceipt(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;

  return {
    id: normalizeOptionalString(record.id),
    items: Array.isArray(record.items) ? record.items as CartoReceiptItem[] : [],
    paymentStatus: normalizeOptionalString(record.paymentStatus),
    status: normalizeOptionalString(record.status),
    subtotal: safeMaybeNumber(record.subtotal),
    tax: safeMaybeNumber(record.tax),
    total: safeMaybeNumber(record.total)
  } satisfies CartoReceiptSummary;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function buildShoppingListMatchKey(name: string | null | undefined, category: string | null | undefined) {
  return `${normalizeKey(name ?? "")}::${normalizeKey(category ?? "")}`;
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
