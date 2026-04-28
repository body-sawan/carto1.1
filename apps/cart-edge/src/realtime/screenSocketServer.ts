import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";
import type { EdgeMessageType, ProtocolMessage } from "@carto/shared";
import type { SessionManager } from "../core/sessionManager.js";
import { logger } from "../system/logger.js";
import { edgeMessage } from "./protocol.js";
import { SnapshotBuilder } from "./snapshotBuilder.js";

export class ScreenSocketServer {
  private readonly clients = new Set<WebSocket>();
  private readonly snapshots = new SnapshotBuilder();

  constructor(private readonly httpServer: Server, private readonly sessionManager: SessionManager) {}

  start() {
    const server = new WebSocketServer({ server: this.httpServer, path: "/screen" });
    server.on("connection", (socket) => {
      this.clients.add(socket);
      logger.info("Screen connected", { clients: this.clients.size });
      this.sendSnapshot(socket);

      socket.on("message", async (raw) => {
        try {
          await this.handleMessage(socket, JSON.parse(raw.toString()) as ProtocolMessage);
        } catch (error) {
          logger.warn("Invalid screen message", { error: error instanceof Error ? error.message : String(error) });
        }
      });

      socket.on("close", () => {
        this.clients.delete(socket);
        logger.info("Screen disconnected", { clients: this.clients.size });
      });
    });

    setInterval(() => this.broadcast("heartbeat", { ok: true }), 5000);
  }

  broadcastSnapshot() {
    this.broadcast("cart.snapshot", this.snapshots.build(this.sessionManager.current()));
  }

  broadcast(type: EdgeMessageType, payload: unknown) {
    const message = JSON.stringify(edgeMessage(type, this.sessionManager.current(), payload));
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) client.send(message);
    }
  }

  private sendSnapshot(socket: WebSocket) {
    const message = edgeMessage("cart.snapshot", this.sessionManager.current(), this.snapshots.build(this.sessionManager.current()));
    socket.send(JSON.stringify(message));
  }

  private async handleMessage(socket: WebSocket, message: ProtocolMessage) {
    switch (message.type) {
      case "screen.connected":
      case "screen.request_snapshot":
        this.sendSnapshot(socket);
        return;
      case "command.checkout_start":
        await this.sessionManager.startCheckout();
        this.broadcastSnapshot();
        return;
      case "command.payment_confirm":
        await this.sessionManager.paymentSuccess();
        this.broadcastSnapshot();
        return;
      case "command.cancel_checkout":
        await this.sessionManager.cancelCheckout();
        this.broadcastSnapshot();
        return;
      default:
        logger.warn("Unsupported screen message", { type: message.type });
    }
  }
}
