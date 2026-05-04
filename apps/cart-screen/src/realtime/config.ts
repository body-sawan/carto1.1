export const CART_EDGE_WS_URL = process.env.EXPO_PUBLIC_CART_EDGE_WS_URL ?? "ws://localhost:4000/ws";
export const CART_EDGE_HTTP_URL = process.env.EXPO_PUBLIC_CART_EDGE_HTTP_URL ?? httpUrlFromWebSocket(CART_EDGE_WS_URL);

function httpUrlFromWebSocket(url: string) {
  try {
    const parsed = new URL(url);
    parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:4000";
  }
}
