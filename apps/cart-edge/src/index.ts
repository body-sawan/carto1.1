import http from "node:http";
import path from "node:path";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { BluetoothSimulator } from "./bluetooth/bluetoothSimulator.js";
import { PairingManager } from "./bluetooth/pairingManager.js";
import { ShoppingListReceiver } from "./bluetooth/shoppingListReceiver.js";
import { CartStateMachine } from "./core/cartStateMachine.js";
import { CheckoutManager } from "./core/checkoutManager.js";
import { ReceiptEngine } from "./core/receiptEngine.js";
import { SessionManager } from "./core/sessionManager.js";
import { ShoppingListEngine } from "./core/shoppingListEngine.js";
import { RoutePlanner } from "./navigation/routePlanner.js";
import { PositionSimulator } from "./navigation/positionSimulator.js";
import { PaymentSimulator } from "./payments/paymentSimulator.js";
import { ProductCatalog } from "./products/productCatalog.js";
import { ScreenSocketServer } from "./realtime/screenSocketServer.js";
import { SnapshotBuilder } from "./realtime/snapshotBuilder.js";
import { LocalStore } from "./storage/localStore.js";
import { loadConfig } from "./system/env.js";
import { logger } from "./system/logger.js";

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function main() {
  const config = loadConfig();
  const catalog = new ProductCatalog();
  const stateMachine = new CartStateMachine();
  const receiptEngine = new ReceiptEngine(catalog);
  const listEngine = new ShoppingListEngine(catalog);
  const routePlanner = new RoutePlanner(catalog);
  const positionSimulator = new PositionSimulator();
  const paymentSimulator = new PaymentSimulator();
  const checkoutManager = new CheckoutManager(stateMachine, paymentSimulator);
  const store = new LocalStore(path.join(config.storageDir, "session.json"));
  const pairingManager = new PairingManager(config.publicHost, config.port);
  const sessionManager = new SessionManager(
    config.cartId,
    store,
    stateMachine,
    pairingManager,
    listEngine,
    receiptEngine,
    routePlanner,
    positionSimulator,
    checkoutManager
  );

  await sessionManager.boot();

  const bluetooth = new BluetoothSimulator(new ShoppingListReceiver(sessionManager));
  const snapshotBuilder = new SnapshotBuilder();
  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = http.createServer(app);
  const screenServer = new ScreenSocketServer(server, sessionManager);
  screenServer.start();

  app.get("/health", (_req, res) => {
    const session = sessionManager.current();
    res.json({
      ok: true,
      cartId: config.cartId,
      state: session.state,
      sessionId: session.sessionId,
      screenClients: screenServer.clientCount(),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  app.get("/pairing/current", (_req, res) => res.json(sessionManager.current().pairing));

  app.post("/pairing/:pairingCode/list", handle(async (req, res) => {
    const session = sessionManager.current();
    if (req.params.pairingCode !== session.pairing.pairingCode) {
      throw new HttpError(403, "Invalid pairing code");
    }
    if (session.state !== "WAITING_FOR_LIST") {
      throw new HttpError(409, `Cart is not waiting for a shopping list in state ${session.state}`);
    }
    assertIncomingListBody(req.body);

    const next = await sessionManager.receiveShoppingList(req.body);
    screenServer.broadcastSnapshot();
    res.json({ ok: true, session: next });
  }));

  app.get("/dev/snapshot", (_req, res) => res.json(snapshotBuilder.build(sessionManager.current())));
  app.post("/dev/snapshot", (_req, res) => res.json(snapshotBuilder.build(sessionManager.current())));
  app.get("/dev/catalog", (_req, res) => res.json({ products: catalog.all() }));
  app.post("/dev/session/reset", handle(respond(async () => sessionManager.startNewSession(), screenServer)));
  app.post("/dev/bluetooth/list", handle(respond(async (req) => bluetooth.simulateIncomingShoppingList(req.body), screenServer)));
  app.post("/dev/scan", handle(respond(async (req) => sessionManager.scanProduct(req.body), screenServer)));
  app.post("/dev/remove", handle(respond(async (req) => sessionManager.removeProduct(String(req.body.productId)), screenServer)));
  app.post("/dev/move", handle(respond(async (req) => sessionManager.moveTo(String(req.body.nodeId)), screenServer)));
  app.post("/dev/checkout/start", handle(respond(async () => sessionManager.startCheckout(), screenServer)));
  app.post("/dev/checkout", handle(respond(async () => sessionManager.startCheckout(), screenServer)));
  app.post("/dev/payment/success", handle(respond(async () => sessionManager.paymentSuccess(), screenServer)));
  app.post("/dev/payment/failure", handle(respond(async () => sessionManager.paymentFailure(), screenServer)));

  server.listen(config.port, config.host, () => {
    logger.info("Cart edge listening", {
      http: `http://${config.host}:${config.port}`,
      websocket: `ws://${config.publicHost}:${config.port}/ws`,
      cartId: config.cartId,
      storageDir: config.storageDir,
      nodeEnv: config.nodeEnv
    });
  });
}

function assertIncomingListBody(body: unknown) {
  if (!body || typeof body !== "object") throw new HttpError(400, "Invalid body: expected JSON object");
  const list = body as { listId?: unknown; items?: unknown };
  if (typeof list.listId !== "string" || list.listId.length === 0) {
    throw new HttpError(400, "Invalid body: listId is required");
  }
  if (!Array.isArray(list.items)) throw new HttpError(400, "Invalid body: items array is required");
  for (const [index, item] of list.items.entries()) {
    if (!item || typeof item !== "object") throw new HttpError(400, `Invalid body: items[${index}] must be an object`);
    const candidate = item as { productId?: unknown; name?: unknown; quantity?: unknown };
    if (typeof candidate.productId !== "string" || candidate.productId.length === 0) {
      throw new HttpError(400, `Invalid body: items[${index}].productId is required`);
    }
    if (typeof candidate.name !== "string" || candidate.name.length === 0) {
      throw new HttpError(400, `Invalid body: items[${index}].name is required`);
    }
    if (typeof candidate.quantity !== "number" || !Number.isFinite(candidate.quantity)) {
      throw new HttpError(400, `Invalid body: items[${index}].quantity is required`);
    }
  }
}

function respond(action: (req: Request) => Promise<unknown>, sockets: ScreenSocketServer) {
  return async (req: Request, res: Response) => {
    const session = await action(req);
    sockets.broadcastSnapshot();
    res.json({ ok: true, session });
  };
}

function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((error) => {
      const status = error instanceof HttpError ? error.status : 400;
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.warn("Request failed", { status, error: message });
      res.status(status).json({ ok: false, error: message });
    });
  };
}

main().catch((error) => {
  logger.error("Cart edge failed to start", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
