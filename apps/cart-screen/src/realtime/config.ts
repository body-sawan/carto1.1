const DEFAULT_CART_EDGE_WS_URL = "ws://localhost:4000/ws";
const DEFAULT_CART_EDGE_HTTP_URL = "http://localhost:4000";
const DEFAULT_CARTO_API_BASE_URL = "http://localhost:3000";
const DEFAULT_CARTO_WEB_BASE_URL = "http://localhost:3000";
const DEFAULT_BACKEND_MODE = "edge";

export type CartScreenBackendMode = "edge" | "carto";
export type LegacyIntegrationMode = "local-edge" | "online-api" | "mock-online";

export const IS_DEV = process.env.NODE_ENV !== "production";
export const CART_EDGE_WS_URL = stripTrailingSlash(readConfig("EXPO_PUBLIC_CART_EDGE_WS_URL", "CART_EDGE_WS_URL") ?? DEFAULT_CART_EDGE_WS_URL);
export const CART_EDGE_HTTP_URL = stripTrailingSlash(
  readConfig("EXPO_PUBLIC_CART_EDGE_HTTP_URL", "CART_EDGE_HTTP_URL") ?? httpUrlFromWebSocket(CART_EDGE_WS_URL)
);
export const CARTO_API_BASE_URL = stripTrailingSlash(readConfig("EXPO_PUBLIC_CARTO_API_BASE_URL", "CARTO_API_BASE_URL") ?? DEFAULT_CARTO_API_BASE_URL);
export const CARTO_WEB_BASE_URL = stripTrailingSlash(readConfig("EXPO_PUBLIC_CARTO_WEB_BASE_URL", "CARTO_WEB_BASE_URL") ?? DEFAULT_CARTO_WEB_BASE_URL);
export const CART_CODE = readConfig("EXPO_PUBLIC_CART_CODE", "CART_CODE")?.trim().toUpperCase() ?? "";
export const DEVICE_SECRET = readConfig("EXPO_PUBLIC_DEVICE_SECRET", "DEVICE_SECRET")?.trim() ?? "";
export const CART_SCREEN_BACKEND_MODE = resolveBackendMode();
export const CART_SCREEN_LEGACY_MODE = resolveLegacyMode();
export const CARTO_INTEGRATION_MODE = CART_SCREEN_LEGACY_MODE ?? (CART_SCREEN_BACKEND_MODE === "carto" ? "online-api" : "local-edge");

if (IS_DEV) {
  console.log("[cart-screen] resolved backend mode", CART_SCREEN_BACKEND_MODE);
  console.log("[cart-screen] resolved legacy mode", CART_SCREEN_LEGACY_MODE ?? "<none>");
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

function resolveBackendMode(): CartScreenBackendMode {
  const explicitMode = readConfig("EXPO_PUBLIC_CART_SCREEN_BACKEND_MODE", "CART_SCREEN_BACKEND_MODE")?.trim().toLowerCase();
  if (explicitMode === "edge" || explicitMode === "carto") {
    return explicitMode;
  }

  const legacyMode = resolveLegacyMode();
  if (legacyMode === "online-api" || legacyMode === "mock-online") {
    return "carto";
  }

  return DEFAULT_BACKEND_MODE;
}

function resolveLegacyMode(): LegacyIntegrationMode | null {
  const explicitMode = readConfig("EXPO_PUBLIC_CARTO_INTEGRATION_MODE", "CARTO_INTEGRATION_MODE")?.trim().toLowerCase();
  if (explicitMode === "local-edge" || explicitMode === "online-api" || explicitMode === "mock-online") {
    return explicitMode;
  }
  return null;
}

function readConfig(publicName: string, legacyName: string) {
  const publicValue = process.env[publicName];
  if (publicValue && publicValue.trim().length > 0) {
    return publicValue;
  }

  const legacyValue = process.env[legacyName];
  if (legacyValue && legacyValue.trim().length > 0) {
    return legacyValue;
  }

  return undefined;
}
