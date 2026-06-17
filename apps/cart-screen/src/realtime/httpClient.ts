import type { Product } from "@carto/shared";
import { CART_EDGE_HTTP_URL, CARTO_INTEGRATION_MODE } from "./config";
import { addCartoItem, fetchCartoCatalog, removeCartoItem } from "./cartoApi";
import { findCatalogProductById } from "./cartCatalog";
import {
  addLocalProduct,
  cancelLocalGuestCheckout,
  confirmLocalGuestPayment,
  failLocalGuestPayment,
  removeLocalProduct
} from "./localCartActions";
import { useCartUiStore } from "../store/cartUiStore";

interface EdgeErrorResponse {
  ok?: boolean;
  error?: string;
  message?: string;
}

export interface CatalogResponse {
  products: Product[];
}

export interface HealthResponse {
  ok: boolean;
  cartId: string;
  state: string;
  sessionId: string | null;
  screenClients: number;
  uptimeSeconds: number;
  timestamp: string;
}

export async function fetchCatalog() {
  if (CARTO_INTEGRATION_MODE === "online-api" || CARTO_INTEGRATION_MODE === "mock-online") {
    const products = await fetchCartoCatalog();
    return { products };
  }

  const response = await fetch(`${CART_EDGE_HTTP_URL}/dev/catalog`);
  return readJsonResponse<CatalogResponse>(response);
}

export async function fetchHealthStatus(signal?: AbortSignal) {
  const response = await fetch(`${CART_EDGE_HTTP_URL}/health`, { signal });
  return readJsonResponse<HealthResponse>(response);
}

export async function postDevAction<T = unknown>(path: string, body: unknown = {}) {
  if (CARTO_INTEGRATION_MODE === "online-api" || CARTO_INTEGRATION_MODE === "mock-online") {
    return postCartoLocalAction<T>(path, body);
  }

  const response = await fetch(`${CART_EDGE_HTTP_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return readJsonResponse<T>(response);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null) as EdgeErrorResponse | T | null;
  if (!response.ok && data && typeof data === "object") {
    const error = data as EdgeErrorResponse;
    throw new Error(error.message ?? error.error ?? `HTTP ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return data as T;
}

async function postCartoLocalAction<T>(path: string, body: unknown) {
  const payload = (body && typeof body === "object" ? body : {}) as { barcode?: string; productId?: string };
  const {
    addDeviceCartItem,
    removeDeviceCartItem,
    sessionControlMode,
    snapshot,
    setBackendStatus,
    setConnected,
    setSessionControlMode,
    setSnapshot
  } = useCartUiStore.getState();
  const product = payload.productId ? findCatalogProductById(payload.productId) : undefined;
  const isLocalGuest = sessionControlMode === "local_guest";

  if (path === "/dev/scan") {
    if (isLocalGuest) {
      addLocalProduct(payload.productId, payload.barcode);
    } else {
      const nextSnapshot = await addCartoItem({
        category: product?.category,
        name: product?.name,
        price: product?.price,
        productId: payload.productId,
        quantity: 1
      }, snapshot);
      if (product) {
        addDeviceCartItem({
          barcode: product.barcode,
          category: product.category,
          mapNodeId: product.mapNodeId,
          name: product.name,
          productId: product.id,
          quantity: 1,
          shelfId: product.shelfId,
          unitPrice: product.price
        });
      }
      setConnected(true);
      setBackendStatus("active");
      setSessionControlMode("full");
      setSnapshot(nextSnapshot);
    }
    return { ok: true } as T;
  }

  if (path === "/dev/remove") {
    if (isLocalGuest) {
      removeLocalProduct(payload.productId, payload.barcode);
    } else {
      const nextSnapshot = await removeCartoItem({
        name: product?.name,
        productId: payload.productId,
        quantity: 1
      }, snapshot);
      if (payload.productId) {
        removeDeviceCartItem(payload.productId, 1);
      }
      setConnected(true);
      setBackendStatus("active");
      setSessionControlMode("full");
      setSnapshot(nextSnapshot);
    }
    return { ok: true } as T;
  }

  if (path === "/dev/payment/success") {
    confirmLocalGuestPayment();
    return { ok: true } as T;
  }

  if (path === "/dev/payment/failure") {
    failLocalGuestPayment();
    return { ok: true } as T;
  }

  if (path === "/dev/payment/cancel") {
    cancelLocalGuestCheckout();
    return { ok: true } as T;
  }

  throw new Error("This developer action is only available in edge mode.");
}
