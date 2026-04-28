import crypto from "node:crypto";
import type { PairingInfo } from "@carto/shared";

export class PairingManager {
  createPairing(cartId: string, sessionId: string): PairingInfo {
    const pairingCode = crypto.randomInt(100000, 999999).toString();
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    return {
      pairingCode,
      expiresAt,
      qrPayload: JSON.stringify({
        app: "carto",
        protocolVersion: "1.0",
        cartId,
        sessionId,
        pairingCode,
        token,
        transport: "bluetooth"
      })
    };
  }
}

