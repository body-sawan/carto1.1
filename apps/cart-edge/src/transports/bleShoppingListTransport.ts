import type { EdgeConfig } from "../system/env.js";
import { logger } from "../system/logger.js";
import type { ShoppingListReceivedHandler, ShoppingListTransport } from "./shoppingListTransport.js";

export class BleShoppingListTransport implements ShoppingListTransport {
  private handler: ShoppingListReceivedHandler | null = null;

  constructor(private readonly config: EdgeConfig) {}

  async start(): Promise<void> {
    if (process.platform !== "linux") {
      throw new Error("Real BLE receiver requires Raspberry Pi/Linux BlueZ. Use BLUETOOTH_MODE=simulator on laptop.");
    }

    logger.info("Starting BLE shopping-list receiver", {
      bluetoothDeviceName: this.config.bluetoothDeviceName,
      serviceUuid: this.config.bleServiceUuid,
      writeCharacteristicUuid: this.config.bleWriteCharacteristicUuid,
      notifyCharacteristicUuid: this.config.bleNotifyCharacteristicUuid
    });

    // TODO: Register a BlueZ GATT server advertising bluetoothDeviceName.
    // TODO: Expose serviceUuid with writeCharacteristicUuid for UTF-8 JSON writes.
    // TODO: Parse written JSON and call this.handler with the decoded payload.
    // TODO: Expose notifyCharacteristicUuid for success/error acknowledgements to the phone.
    // TODO: Integrate clean shutdown for advertisement and GATT registration.
    throw new Error("BLE BlueZ GATT receiver is not implemented yet. Keep BLUETOOTH_MODE=simulator until Raspberry Pi BLE support is added.");
  }

  async stop(): Promise<void> {
    return;
  }

  onShoppingListReceived(callback: ShoppingListReceivedHandler): void {
    this.handler = callback;
  }
}
