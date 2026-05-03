import http from "node:http";
import path from "node:path";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { PairingManager } from "./bluetooth/pairingManager.js";
import { ShoppingListReceiver } from "./bluetooth/shoppingListReceiver.js";
import { CartStateMachine } from "./core/cartStateMachine.js";
import { CheckoutManager } from "./core/checkoutManager.js";
import { ReceiptEngine } from "./core/receiptEngine.js";
import { CartSessionStateError, SessionManager } from "./core/sessionManager.js";
import { ShoppingListEngine, ShoppingListValidationError } from "./core/shoppingListEngine.js";
import { RoutePlanner } from "./navigation/routePlanner.js";
import { PositionSimulator } from "./navigation/positionSimulator.js";
import { PaymentSimulator } from "./payments/paymentSimulator.js";
import { ProductCatalog } from "./products/productCatalog.js";
import { ScreenSocketServer } from "./realtime/screenSocketServer.js";
import { SnapshotBuilder } from "./realtime/snapshotBuilder.js";
import { LocalStore } from "./storage/localStore.js";
import { loadConfig } from "./system/env.js";
import { logger } from "./system/logger.js";
import { BleShoppingListTransport } from "./transports/bleShoppingListTransport.js";
import { DevShoppingListTransport } from "./transports/devShoppingListTransport.js";
import type { ShoppingListTransport } from "./transports/shoppingListTransport.js";
import type { CartAckResponse, CartSession, ShoppingListPayload } from "@carto/shared";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    message: string
  ) {
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
  const pairingManager = new PairingManager(config);
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

  const shoppingListReceiver = new ShoppingListReceiver(sessionManager);
  const devShoppingListTransport = new DevShoppingListTransport();
  const shoppingListTransport: ShoppingListTransport = config.bluetoothMode === "ble"
    ? new BleShoppingListTransport(config)
    : devShoppingListTransport;
  const snapshotBuilder = new SnapshotBuilder();
  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = http.createServer(app);
  const screenServer = new ScreenSocketServer(server, sessionManager);
  screenServer.start();
  const makeIncomingShoppingListHandler = (requirePairingCode: boolean) => async (payload: unknown) => {
    try {
      await acceptShoppingListPayload(payload, sessionManager.current(), shoppingListReceiver, requirePairingCode);
      screenServer.broadcastSnapshot();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown shopping-list receive error";
      await sessionManager.addAlert("error", `Shopping list receive failed: ${message}`);
      screenServer.broadcastSnapshot();
      throw error;
    }
  };
  devShoppingListTransport.onShoppingListReceived(makeIncomingShoppingListHandler(false));
  if (shoppingListTransport !== devShoppingListTransport) {
    shoppingListTransport.onShoppingListReceived(makeIncomingShoppingListHandler(true));
  }
  await shoppingListTransport.start();

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
    const pairingCode = routeParam(req.params.pairingCode);
    assertPairingCodeAndExpiry(session, pairingCode);

    const next = await shoppingListReceiver.receive(req.body);
    screenServer.broadcastSnapshot();
    const receivedList = req.body as ShoppingListPayload;
    const response: CartAckResponse = {
      ok: true,
      cartId: next.cartId,
      sessionId: next.sessionId,
      receivedListId: receivedList.listId,
      itemCount: receivedList.items.length,
      status: "list_received"
    };
    res.json(response);
  }));

  app.get("/dev/snapshot", (_req, res) => res.json(snapshotBuilder.build(sessionManager.current())));
  app.post("/dev/snapshot", (_req, res) => res.json(snapshotBuilder.build(sessionManager.current())));
  app.get("/dev/catalog", (_req, res) => res.json({ products: catalog.all() }));
  app.get("/dev/session/reset", handle(respond(async () => sessionManager.startNewSession(), screenServer)));
  app.post("/dev/session/reset", handle(respond(async () => sessionManager.startNewSession(), screenServer)));
  app.get("/dev/list/sample", handle(async (_req, res) => {
    const next = await shoppingListReceiver.receive(createSampleShoppingList());
    screenServer.broadcastSnapshot();
    const response: CartAckResponse = {
      ok: true,
      cartId: next.cartId,
      sessionId: next.sessionId,
      receivedListId: "list-dev-sample",
      itemCount: next.shoppingList.length,
      status: "list_received"
    };
    res.json(response);
  }));
  app.post("/dev/bluetooth/list", handle(respond(async (req) => {
    await devShoppingListTransport.simulateIncomingShoppingList(req.body);
    return sessionManager.current();
  }, screenServer)));
  app.post("/dev/scan", handle(respond(async (req) => sessionManager.scanProduct(req.body), screenServer)));
  app.post("/dev/remove", handle(respond(async (req) => sessionManager.removeProduct(String(req.body.productId)), screenServer)));
  app.post("/dev/move", handle(respond(async (req) => sessionManager.moveTo(String(req.body.nodeId)), screenServer)));
  app.post("/dev/checkout/start", handle(respond(async () => sessionManager.startCheckout(), screenServer)));
  app.post("/dev/checkout", handle(respond(async () => sessionManager.startCheckout(), screenServer)));
  app.post("/dev/checkout/cancel", handle(respond(async () => sessionManager.cancelCheckout(), screenServer)));
  app.post("/dev/payment/success", handle(respond(async () => sessionManager.paymentSuccess(), screenServer)));
  app.post("/dev/payment/failure", handle(respond(async () => sessionManager.paymentFailure(), screenServer)));

  server.listen(config.port, config.host, () => {
    logger.info("Cart edge listening", {
      http: `http://${config.host}:${config.port}`,
      websocket: `ws://${config.publicHost}:${config.port}/ws`,
      cartId: config.cartId,
      storageDir: config.storageDir,
      nodeEnv: config.nodeEnv,
      bluetoothMode: config.bluetoothMode
    });
  });
}

async function acceptShoppingListPayload(
  payload: unknown,
  activeSession: CartSession,
  receiver: ShoppingListReceiver,
  requirePairingCode: boolean
) {
  const pairingCode = readOptionalPairingCode(payload);
  if (requirePairingCode && !pairingCode) {
    throw new HttpError(400, "INVALID_LIST_PAYLOAD", "pairingCode is required.");
  }
  if (pairingCode) {
    assertPairingCodeAndExpiry(activeSession, pairingCode);
  }
  return receiver.receive(payload);
}

function assertPairingCodeAndExpiry(session: CartSession, pairingCode: string) {
  if (pairingCode !== session.pairing.pairingCode) {
    throw new HttpError(403, "INVALID_PAIRING_CODE", "Invalid pairing code.");
  }

  const expiresAt = Date.parse(session.pairing.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new HttpError(410, "PAIRING_EXPIRED", "This cart pairing session has expired.");
  }
}

function readOptionalPairingCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const pairingCode = (payload as { pairingCode?: unknown }).pairingCode;
  if (pairingCode === undefined) return undefined;
  if (typeof pairingCode !== "string" || pairingCode.length === 0) {
    throw new HttpError(400, "INVALID_LIST_PAYLOAD", "pairingCode must be a non-empty string when provided.");
  }
  return pairingCode;
}

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function createSampleShoppingList(): ShoppingListPayload {
  return {
    listId: "list-dev-sample",
    source: "dev-link",
    createdAt: new Date().toISOString(),
    items: [
      { productId: "p_milk", name: "Milk 1L", quantity: 1 },
      { productId: "p_bread", name: "Bread", quantity: 2 },
      { productId: "p_apples", name: "Apples 1kg", quantity: 1 }
    ]
  };
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
      const httpError = toHttpError(error);
      const response: CartAckResponse = {
        ok: false,
        error: httpError.errorCode,
        message: httpError.message
      };
      logger.warn("Request failed", { status: httpError.status, error: httpError.errorCode, message: httpError.message });
      res.status(httpError.status).json(response);
    });
  };
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;

  if (error instanceof ShoppingListValidationError) {
    if (error.code === "UNKNOWN_PRODUCT") {
      return new HttpError(422, "UNKNOWN_PRODUCT", error.message);
    }
    return new HttpError(400, "INVALID_LIST_PAYLOAD", error.message);
  }

  if (error instanceof CartSessionStateError) {
    return new HttpError(409, "CART_NOT_WAITING_FOR_LIST", error.message);
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return new HttpError(500, "ERROR", message);
}

main().catch((error) => {
  logger.error("Cart edge failed to start", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
