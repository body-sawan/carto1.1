import type { Product } from "@carto/shared";
import { CART_EDGE_HTTP_URL } from "./config";

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
  const response = await fetch(`${CART_EDGE_HTTP_URL}/dev/catalog`);
  return readJsonResponse<CatalogResponse>(response);
}

export async function fetchHealthStatus(signal?: AbortSignal) {
  const response = await fetch(`${CART_EDGE_HTTP_URL}/health`, { signal });
  return readJsonResponse<HealthResponse>(response);
}

export async function postDevAction<T = unknown>(path: string, body: unknown = {}) {
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
