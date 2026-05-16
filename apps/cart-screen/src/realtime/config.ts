const DEFAULT_CART_EDGE_WS_URL = "ws://localhost:4000/ws";
const DEFAULT_CART_EDGE_HTTP_URL = "http://localhost:4000";

export const IS_DEV = process.env.NODE_ENV !== "production";
export const CART_EDGE_WS_URL = stripTrailingSlash(process.env.EXPO_PUBLIC_CART_EDGE_WS_URL ?? DEFAULT_CART_EDGE_WS_URL);
export const CART_EDGE_HTTP_URL = stripTrailingSlash(
  process.env.EXPO_PUBLIC_CART_EDGE_HTTP_URL ?? httpUrlFromWebSocket(CART_EDGE_WS_URL)
);

if (IS_DEV) {
  console.log("[cart-screen] resolved WebSocket URL", CART_EDGE_WS_URL);
  console.log("[cart-screen] resolved HTTP URL", CART_EDGE_HTTP_URL);
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
