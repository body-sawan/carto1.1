import crypto from "node:crypto";
import type { PairingInfo } from "@carto/shared";

export class PairingManager {
  constructor(private readonly publicHost: string, private readonly port: number) {}

  createPairing(cartId: string, sessionId: string): PairingInfo {
    const pairingCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const receiveListUrl = `http://${this.publicHost}:${this.port}/pairing/${pairingCode}/list`;
    const payload = {
      cartId,
      sessionId,
      pairingCode,
      transport: "local-http" as const,
      receiveListUrl,
      expiresAt
    };
    return {
      cartId,
      sessionId,
      pairingCode,
      transport: "local-http",
      receiveListUrl,
      expiresAt,
      qrPayload: JSON.stringify(payload)
    };
  }
}

