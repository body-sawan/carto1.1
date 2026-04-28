# Carto Raspberry Pi Deployment Notes

This folder is preparation material for running `apps/cart-edge` on a Raspberry Pi.

## Basic Steps

1. Install Node.js 20 or newer on the Pi.
2. Clone or copy the Carto project to the Pi.
3. From the project root, run `npm install` and `npm run build`.
4. Copy `carto-edge.service.example` to `/etc/systemd/system/carto-edge.service`.
5. Replace the placeholder user, group, and project path values.
6. Set the environment values for your network and Bluetooth mode.
7. Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable carto-edge
sudo systemctl start carto-edge
sudo systemctl status carto-edge
```

The smart cart screen should connect to `ws://<pi-host>:4000/ws`.

## BLE Mode

The final pairing architecture is BLE-first. Use these values when the Raspberry Pi BlueZ GATT receiver implementation is ready:

```ini
Environment=BLUETOOTH_MODE=ble
Environment=BLUETOOTH_DEVICE_NAME=Carto-cart-01
Environment=BLE_SERVICE_UUID=6e400001-b5a3-f393-e0a9-e50e24dcca9e
Environment=BLE_WRITE_CHARACTERISTIC_UUID=6e400002-b5a3-f393-e0a9-e50e24dcca9e
Environment=BLE_NOTIFY_CHARACTERISTIC_UUID=6e400003-b5a3-f393-e0a9-e50e24dcca9e
```

For laptop development, keep `BLUETOOTH_MODE=simulator`. Real BLE receiving is intentionally not faked.
