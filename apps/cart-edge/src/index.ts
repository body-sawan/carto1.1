import http from "node:http";
import path from "node:path";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { fileURLToPath } from "node:url";
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
import { logger } from "./system/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 4000);
const CART_ID = process.env.CART_ID ?? "cart-01";

async function main() {
  const catalog = new ProductCatalog();
  const stateMachine = new CartStateMachine();
  const receiptEngine = new ReceiptEngine(catalog);
  const listEngine = new ShoppingListEngine(catalog);
  const routePlanner = new RoutePlanner(catalog);
  const positionSimulator = new PositionSimulator();
  const paymentSimulator = new PaymentSimulator();
  const checkoutManager = new CheckoutManager(stateMachine, paymentSimulator);
  const store = new LocalStore(path.join(__dirname, "..", "data", "session.json"));
  const sessionManager = new SessionManager(
    CART_ID,
    store,
    stateMachine,
    new PairingManager(),
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

  app.get("/health", (_req, res) => res.json({ ok: true, cartId: CART_ID, state: sessionManager.current().state }));
  app.get("/dev/catalog", (_req, res) => res.json({ products: catalog.all() }));
  app.post("/dev/snapshot", (_req, res) => res.json(snapshotBuilder.build(sessionManager.current())));

  const server = http.createServer(app);
  const screenServer = new ScreenSocketServer(server, sessionManager);
  screenServer.start();

  app.post("/dev/bluetooth/list", handle(respond(async (req) => bluetooth.simulateIncomingShoppingList(req.body), screenServer)));
  app.post("/dev/scan", handle(respond(async (req) => sessionManager.scanProduct(req.body), screenServer)));
  app.post("/dev/remove", handle(respond(async (req) => sessionManager.removeProduct(String(req.body.productId)), screenServer)));
  app.post("/dev/move", handle(respond(async (req) => sessionManager.moveTo(String(req.body.nodeId)), screenServer)));
  app.post("/dev/checkout", handle(respond(async () => sessionManager.startCheckout(), screenServer)));
  app.post("/dev/payment/success", handle(respond(async () => sessionManager.paymentSuccess(), screenServer)));
  app.post("/dev/payment/failure", handle(respond(async () => sessionManager.paymentFailure(), screenServer)));
  app.post("/dev/session/reset", handle(respond(async () => sessionManager.startNewSession(), screenServer)));

  server.listen(PORT, () => {
    logger.info("Cart edge listening", {
      http: `http://localhost:${PORT}`,
      websocket: `ws://localhost:${PORT}/screen`
    });
  });
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
      logger.warn("Simulator command failed", { error: error instanceof Error ? error.message : String(error) });
      res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
    });
  };
}

main().catch((error) => {
  logger.error("Cart edge failed to start", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

