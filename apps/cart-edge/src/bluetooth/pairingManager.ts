import crypto from "node:crypto";
import type { CartQrPayload, PairingInfo } from "@carto/shared";
import type { EdgeConfig } from "../system/env.js";

export class PairingManager {
  constructor(private readonly config: EdgeConfig) {}

  createPairing(cartId: string, sessionId: string): PairingInfo {
    const pairingCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const payload = {
      cartId,
      sessionId,
      pairingCode,
      transport: "ble" as const,
      bluetoothDeviceName: this.config.bluetoothDeviceName,
      serviceUuid: this.config.bleServiceUuid,
      writeCharacteristicUuid: this.config.bleWriteCharacteristicUuid,
      notifyCharacteristicUuid: this.config.bleNotifyCharacteristicUuid,
      expiresAt
    };
    const qrPayload: CartQrPayload = {
      cartId,
      pairingCode
    };

    return {
      ...payload,
      receiveListUrl: `http://${this.config.publicHost}:${this.config.port}/pairing/${pairingCode}/list`,
      qrPayload: JSON.stringify(qrPayload)
    };
  }
}
