import path from "node:path";

export interface EdgeConfig {
  port: number;
  host: string;
  cartId: string;
  publicHost: string;
  storageDir: string;
  nodeEnv: string;
  bluetoothMode: "simulator" | "ble";
  bluetoothDeviceName: string;
  bleServiceUuid: string;
  bleWriteCharacteristicUuid: string;
  bleNotifyCharacteristicUuid: string;
}

export function loadConfig(): EdgeConfig {
  const port = Number(process.env.PORT ?? 4000);
  const cartId = process.env.CART_ID || "cart-01";
  const bluetoothMode = process.env.BLUETOOTH_MODE === "ble" ? "ble" : "simulator";
  return {
    port: Number.isFinite(port) && port > 0 ? port : 4000,
    host: process.env.HOST || "0.0.0.0",
    cartId,
    publicHost: process.env.CART_EDGE_PUBLIC_HOST || "localhost",
    storageDir: path.resolve(process.cwd(), process.env.STORAGE_DIR || "./data"),
    nodeEnv: process.env.NODE_ENV || "development",
    bluetoothMode,
    bluetoothDeviceName: process.env.BLUETOOTH_DEVICE_NAME || `Carto-${cartId}`,
    bleServiceUuid: process.env.BLE_SERVICE_UUID || "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
    bleWriteCharacteristicUuid: process.env.BLE_WRITE_CHARACTERISTIC_UUID || "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    bleNotifyCharacteristicUuid: process.env.BLE_NOTIFY_CHARACTERISTIC_UUID || "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
  };
}
