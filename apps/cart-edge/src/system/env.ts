import path from "node:path";

export interface EdgeConfig {
  port: number;
  host: string;
  cartId: string;
  publicHost: string;
  storageDir: string;
  nodeEnv: string;
}

export function loadConfig(): EdgeConfig {
  const port = Number(process.env.PORT ?? 4000);
  return {
    port: Number.isFinite(port) && port > 0 ? port : 4000,
    host: process.env.HOST || "0.0.0.0",
    cartId: process.env.CART_ID || "cart-01",
    publicHost: process.env.CART_EDGE_PUBLIC_HOST || "localhost",
    storageDir: path.resolve(process.cwd(), process.env.STORAGE_DIR || "./data"),
    nodeEnv: process.env.NODE_ENV || "development"
  };
}
