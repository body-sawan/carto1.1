import type { ProtocolMessage, ScreenMessageType } from "@carto/shared";

type Handler = (message: ProtocolMessage) => void;

export class CartSocketClient {
  private socket: WebSocket | null = null;
  private sequence = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly url: string,
    private readonly onMessage: Handler,
    private readonly onConnectionChange: (connected: boolean) => void
  ) {}

  connect() {
    this.socket = new WebSocket(this.url);
    this.socket.onopen = () => {
      this.onConnectionChange(true);
      this.send("screen.connected", {});
      this.send("screen.request_snapshot", {});
    };
    this.socket.onmessage = (event) => this.onMessage(JSON.parse(event.data));
    this.socket.onclose = () => {
      this.onConnectionChange(false);
      this.scheduleReconnect();
    };
    this.socket.onerror = () => this.onConnectionChange(false);
  }

  close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
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
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1500);
  }
}
