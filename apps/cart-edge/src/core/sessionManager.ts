import crypto from "node:crypto";
import type { LocalStore } from "../storage/localStore.js";
import type { CartSession, IncomingShoppingList } from "@carto/shared";
import type { CartStateMachine } from "./cartStateMachine.js";
import type { PairingManager } from "../bluetooth/pairingManager.js";
import type { ShoppingListEngine } from "./shoppingListEngine.js";
import type { ReceiptEngine } from "./receiptEngine.js";
import type { RoutePlanner } from "../navigation/routePlanner.js";
import type { PositionSimulator } from "../navigation/positionSimulator.js";
import type { CheckoutManager } from "./checkoutManager.js";

export class SessionManager {
  private session: CartSession | null = null;

  constructor(
    private readonly cartId: string,
    private readonly store: LocalStore,
    private readonly stateMachine: CartStateMachine,
    private readonly pairingManager: PairingManager,
    private readonly listEngine: ShoppingListEngine,
    private readonly receiptEngine: ReceiptEngine,
    private readonly routePlanner: RoutePlanner,
    private readonly positionSimulator: PositionSimulator,
    private readonly checkoutManager: CheckoutManager
  ) {}

  async boot(): Promise<CartSession> {
    const saved = await this.store.loadSession();
    if (saved && saved.state !== "SESSION_CLOSED") {
      this.session = this.ensureBlePairing(saved);
      if (this.session !== saved) await this.persist();
      return this.session;
    }

    this.session = this.createWaitingSession();
    await this.persist();
    return this.session;
  }

  async startNewSession(): Promise<CartSession> {
    await this.store.clearSession();
    this.session = this.createWaitingSession();
    await this.persist();
    return this.session;
  }

  private createWaitingSession(): CartSession {
    const now = new Date().toISOString();
    const sessionId = `session_${crypto.randomUUID()}`;
    const position = this.positionSimulator.getPosition("entrance");
    const pairing = this.pairingManager.createPairing(this.cartId, sessionId);
    return {
      cartId: this.cartId,
      sessionId,
      state: this.stateMachine.transition("BOOTING", "WAITING_FOR_LIST"),
      pairing,
      shoppingList: [],
      cartItems: [],
      totals: { subtotal: 0, discount: 0, tax: 0, total: 0 },
      position,
      route: { nodes: [], nextTarget: null, distance: 0 },
      payment: { status: "NOT_STARTED", amount: 0 },
      alerts: [{ id: "boot", level: "info", message: "Cart ready. Scan QR code to pair shopping list.", createdAt: now }],
      createdAt: now,
      updatedAt: now
    };
  }

  private ensureBlePairing(session: CartSession): CartSession {
    const pairing = session.pairing as CartSession["pairing"] & { transport?: string };
    if (
      pairing.transport === "ble" &&
      pairing.bluetoothDeviceName &&
      pairing.serviceUuid &&
      pairing.writeCharacteristicUuid &&
      pairing.notifyCharacteristicUuid
    ) {
      return session;
    }

    return {
      ...session,
      pairing: this.pairingManager.createPairing(this.cartId, session.sessionId),
      updatedAt: new Date().toISOString()
    };
  }

  current(): CartSession {
    if (!this.session) throw new Error("Session manager has not booted");
    return this.session;
  }

  async receiveShoppingList(input: unknown): Promise<CartSession> {
    const incoming = this.listEngine.validateIncoming(input) as IncomingShoppingList;
    const session = this.current();
    if (session.state !== "WAITING_FOR_LIST") {
      throw new Error(`Cart is not waiting for a shopping list in state ${session.state}`);
    }
    const shoppingList = this.listEngine.createItems(incoming);
    this.session = {
      ...session,
      state: this.stateMachine.transition(session.state, "SHOPPING"),
      shoppingList,
      route: this.routePlanner.plan(session.position.nodeId, shoppingList),
      alerts: [...session.alerts, this.alert("success", `Shopping list ${incoming.listId} received over Bluetooth.`)],
      updatedAt: new Date().toISOString()
    };
    await this.persist();
    return this.session;
  }

  async scanProduct(input: { barcode?: string; productId?: string }): Promise<CartSession> {
    const session = this.requireShopping();
    const cartItems = this.receiptEngine.addItem(session.cartItems, input);
    const shoppingList = this.listEngine.updateStatuses(session.shoppingList, this.receiptEngine.quantitiesByProduct(cartItems));
    this.session = {
      ...session,
      cartItems,
      shoppingList,
      totals: this.receiptEngine.calculateTotals(cartItems),
      route: this.routePlanner.plan(session.position.nodeId, shoppingList),
      updatedAt: new Date().toISOString()
    };
    await this.persist();
    return this.session;
  }

  async removeProduct(productId: string): Promise<CartSession> {
    const session = this.requireShopping();
    const cartItems = this.receiptEngine.removeItem(session.cartItems, productId);
    const shoppingList = this.listEngine.updateStatuses(session.shoppingList, this.receiptEngine.quantitiesByProduct(cartItems));
    this.session = {
      ...session,
      cartItems,
      shoppingList,
      totals: this.receiptEngine.calculateTotals(cartItems),
      route: this.routePlanner.plan(session.position.nodeId, shoppingList),
      updatedAt: new Date().toISOString()
    };
    await this.persist();
    return this.session;
  }

  async moveTo(nodeId: string): Promise<CartSession> {
    const session = this.current();
    const position = this.positionSimulator.getPosition(nodeId);
    this.session = {
      ...session,
      position,
      route: this.routePlanner.plan(nodeId, session.shoppingList),
      updatedAt: new Date().toISOString()
    };
    await this.persist();
    return this.session;
  }

  async startCheckout(): Promise<CartSession> {
    this.session = this.checkoutManager.start(this.current());
    await this.persist();
    return this.session;
  }

  async paymentSuccess(): Promise<CartSession> {
    this.session = this.checkoutManager.paymentSuccess(this.current());
    await this.persist();
    return this.session;
  }

  async paymentFailure(): Promise<CartSession> {
    this.session = this.checkoutManager.paymentFailure(this.current());
    await this.persist();
    return this.session;
  }

  async retryPayment(): Promise<CartSession> {
    this.session = this.checkoutManager.retry(this.current());
    await this.persist();
    return this.session;
  }

  async addAlert(level: "info" | "warning" | "error" | "success", message: string): Promise<CartSession> {
    const session = this.current();
    this.session = {
      ...session,
      alerts: [...session.alerts, this.alert(level, message)],
      updatedAt: new Date().toISOString()
    };
    await this.persist();
    return this.session;
  }

  async cancelCheckout(): Promise<CartSession> {
    this.session = this.checkoutManager.cancel(this.current());
    await this.persist();
    return this.session;
  }

  private requireShopping(): CartSession {
    const session = this.current();
    if (session.state !== "SHOPPING") throw new Error(`Cart is not accepting scans in state ${session.state}`);
    return session;
  }

  private async persist() {
    await this.store.saveSession(this.current());
  }

  private alert(level: "info" | "warning" | "error" | "success", message: string) {
    return { id: `alert_${crypto.randomUUID()}`, level, message, createdAt: new Date().toISOString() };
  }
}

