const DEFAULT_CART_EDGE_WS_URL = "ws://localhost:4000/ws";
const DEFAULT_CART_EDGE_HTTP_URL = "http://localhost:4000";
const DEFAULT_CARTO_API_BASE_URL = "http://localhost:3000";
const DEFAULT_CARTO_WEB_BASE_URL = "http://localhost:3000";

export const IS_DEV = process.env.NODE_ENV !== "production";
export const CART_EDGE_WS_URL = stripTrailingSlash(process.env.EXPO_PUBLIC_CART_EDGE_WS_URL ?? DEFAULT_CART_EDGE_WS_URL);
export const CART_EDGE_HTTP_URL = stripTrailingSlash(
  process.env.EXPO_PUBLIC_CART_EDGE_HTTP_URL ?? httpUrlFromWebSocket(CART_EDGE_WS_URL)
);
export const CARTO_API_BASE_URL = stripTrailingSlash(process.env.EXPO_PUBLIC_CARTO_API_BASE_URL ?? DEFAULT_CARTO_API_BASE_URL);
export const CARTO_WEB_BASE_URL = stripTrailingSlash(process.env.EXPO_PUBLIC_CARTO_WEB_BASE_URL ?? DEFAULT_CARTO_WEB_BASE_URL);
export const CART_CODE = process.env.EXPO_PUBLIC_CART_CODE?.trim().toUpperCase() ?? "";
export const DEVICE_SECRET = process.env.EXPO_PUBLIC_DEVICE_SECRET?.trim() ?? "";
export const CART_SCREEN_BACKEND_MODE = resolveBackendMode();

if (IS_DEV) {
  console.log("[cart-screen] resolved backend mode", CART_SCREEN_BACKEND_MODE);
  console.log("[cart-screen] resolved WebSocket URL", CART_EDGE_WS_URL);
  console.log("[cart-screen] resolved HTTP URL", CART_EDGE_HTTP_URL);
  console.log("[cart-screen] resolved Carto API URL", CARTO_API_BASE_URL);
  console.log("[cart-screen] resolved Carto web URL", CARTO_WEB_BASE_URL);
  console.log("[cart-screen] resolved cart code", CART_CODE || "<empty>");
}

function httpUrlFromWebSocket(url: string) {
  try {
    const parsed = new URL(url);
    parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return DEFAULT_CART_EDGE_HTTP_URL;
  }
}

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/u, "");
}

function resolveBackendMode() {
  const explicitMode = process.env.EXPO_PUBLIC_CART_SCREEN_BACKEND_MODE?.trim().toLowerCase();
  if (explicitMode === "edge" || explicitMode === "carto") {
    return explicitMode;
  }

  if (CART_CODE && DEVICE_SECRET) {
    return "carto";
  }

  return "edge";
}
