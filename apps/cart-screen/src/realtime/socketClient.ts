import type { ProtocolMessage, ScreenMessageType } from "@carto/shared";
import { IS_DEV } from "./config";

type Handler = (message: ProtocolMessage) => void;

export class CartSocketClient {
  private socket: WebSocket | null = null;
  private sequence = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private closedManually = false;

  constructor(
    private readonly url: string,
    private readonly onMessage: Handler,
    private readonly onConnectionChange: (connected: boolean) => void
  ) {}

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.closedManually = false;
    logDebug("[cart-screen] connecting websocket ...", this.url);

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.reconnectAttempts = 0;
      logDebug("[cart-screen] websocket open", this.url);
      this.onConnectionChange(true);
      this.send("screen.connected", {});
      this.send("screen.request_snapshot", {});
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      try {
        const rawData = typeof event.data === "string" ? event.data : String(event.data);
        const message = JSON.parse(rawData) as ProtocolMessage;
        logDebug("[cart-screen] websocket message", message.type);
        this.onMessage(message);
      } catch (error) {
        logError("[cart-screen] websocket message parse error", error);
      }
    };

    socket.onclose = (event) => {
      if (this.socket === socket) {
        this.socket = null;
      }

      this.onConnectionChange(false);

      logDebug(
        "[cart-screen] websocket close",
        `code=${event.code}`,
        event.reason ? `reason=${event.reason}` : "reason=<none>"
      );

      if (!this.closedManually) {
        this.scheduleReconnect();
      }
    };

    socket.onerror = (event) => {
      if (this.socket !== socket) return;
      this.onConnectionChange(false);
      logError("[cart-screen] websocket error", event);
    };
  }

  close() {
    this.closedManually = true;
    this.reconnectAttempts = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const socket = this.socket;
    this.socket = null;
    this.onConnectionChange(false);

    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      socket.close();
    }
  }

  send(type: ScreenMessageType, payload: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.sequence += 1;
    const message: ProtocolMessage<ScreenMessageType> = {
      type,
      protocolVersion: "1.0",
      cartId: "cart-01",
      sessionId: null,
      sequence: this.sequence,
      timestamp: new Date().toISOString(),
      payload
    };
    this.socket.send(JSON.stringify(message));
  }

  startCheckout() {
    this.send("command.checkout_start", {});
  }

  startShopping() {
    this.send("command.start_shopping", { sentAt: new Date().toISOString() });
  }

  retryPayment() {
    this.send("command.payment_retry", {});
  }

  cancelCheckout() {
    this.send("command.cancel_checkout", {});
  }

  resetSession() {
    this.send("command.session_reset", {});
  }

  private scheduleReconnect() {
    if (this.closedManually || this.reconnectTimer) return;

    const delayMs = Math.min(5000, 1500 + (this.reconnectAttempts * 500));
    this.reconnectAttempts += 1;
    logDebug("[cart-screen] websocket reconnect scheduled", `${delayMs}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }
}

function logDebug(...args: unknown[]) {
  if (!IS_DEV) return;
  console.log(...args);
}

function logError(...args: unknown[]) {
  if (!IS_DEV) return;
  console.error(...args);
}
