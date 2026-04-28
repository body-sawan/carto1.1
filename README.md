# Carto: AI-Powered Smart Shopping Cart System

Production-ready base for the smart cart software only. There is no admin dashboard, cloud backend, or external shopping-list app in this repo yet.

## Architecture Rule

`cart-edge` is the source of truth. `cart-screen` is display-only.

All business logic, calculations, validation, cart state changes, receipt updates, route updates, shopping-list status updates, checkout, and payment logic live in `apps/cart-edge`.

## Project Structure

- `apps/cart-edge`: Node.js edge service, HTTP API, WebSocket server, state machine, receipt/list/route/payment logic, JSON persistence.
- `apps/cart-screen`: Expo React Native display. It connects to edge WebSocket and renders received `cart.snapshot` messages.
- `packages/shared`: shared TypeScript protocol and domain types.
- `deploy/raspberry-pi`: Raspberry Pi deployment preparation files.

## Install And Run

```powershell
npm install
npm run dev:edge
npm run dev:screen
```

Root scripts:

- `npm run dev:edge`: run the edge service.
- `npm run dev:screen`: run the Expo screen.
- `npm run dev`: run the edge service for local API work.
- `npm run typecheck`: typecheck all workspaces.
- `npm run build`: build shared types and the edge app.

Edge package scripts:

- `npm run dev -w @carto/cart-edge`
- `npm run build -w @carto/cart-edge`
- `npm run start -w @carto/cart-edge`

## Environment

Copy `apps/cart-edge/.env.example` for deployment reference. Defaults are safe if variables are missing.

```env
PORT=4000
HOST=0.0.0.0
CART_ID=cart-01
CART_EDGE_PUBLIC_HOST=localhost
STORAGE_DIR=./data
NODE_ENV=development
BLUETOOTH_MODE=simulator
BLUETOOTH_DEVICE_NAME=Carto-cart-01
BLE_SERVICE_UUID=6e400001-b5a3-f393-e0a9-e50e24dcca9e
BLE_WRITE_CHARACTERISTIC_UUID=6e400002-b5a3-f393-e0a9-e50e24dcca9e
BLE_NOTIFY_CHARACTERISTIC_UUID=6e400003-b5a3-f393-e0a9-e50e24dcca9e
```

The edge listens on `HOST` and `PORT`. `CART_EDGE_PUBLIC_HOST` is used only for the development HTTP fallback URL. The official QR payload is BLE-first.

The screen WebSocket URL can be set with:

```env
EXPO_PUBLIC_CART_EDGE_WS_URL=ws://localhost:4000/ws
```

## Standard Endpoints

- `GET /health`
- `GET /pairing/current`

Development endpoints:

- `GET /dev/snapshot`
- `GET /dev/catalog`
- `POST /dev/session/reset`
- `POST /dev/bluetooth/list`
- `POST /pairing/:pairingCode/list` development HTTP fallback for QR testing
- `POST /dev/scan`
- `POST /dev/remove`
- `POST /dev/move`
- `POST /dev/checkout/start`
- `POST /dev/payment/success`
- `POST /dev/payment/failure`

Backward-compatible endpoints currently kept:

- `POST /dev/snapshot`
- `POST /dev/checkout`

## Final BLE QR Flow

1. Cart screen displays the BLE QR payload.
2. Phone scans the QR code.
3. Phone connects to `bluetoothDeviceName`, for example `Carto-cart-01`.
4. Phone writes UTF-8 shopping-list JSON to `writeCharacteristicUuid`.
5. Cart edge validates `pairingCode` against the active session.
6. Cart edge receives the list, persists the session, broadcasts `cart.snapshot`, and starts `SHOPPING`.

QR payload:

```json
{
  "cartId": "cart-01",
  "sessionId": "...",
  "pairingCode": "123456",
  "transport": "ble",
  "bluetoothDeviceName": "Carto-cart-01",
  "serviceUuid": "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  "writeCharacteristicUuid": "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  "notifyCharacteristicUuid": "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  "expiresAt": "2026-04-29T12:00:00.000Z"
}
```

The phone writes:

```json
{
  "pairingCode": "123456",
  "listId": "list-001",
  "source": "external-web-app",
  "items": [
    { "productId": "p_milk", "name": "Milk 1L", "quantity": 2 }
  ],
  "createdAt": "2026-04-29T12:00:00.000Z"
}
```

## Laptop Development Mode

Real BLE receiving is not expected to run on a Windows laptop. Use:

```env
BLUETOOTH_MODE=simulator
```

In simulator mode the edge keeps the same dev endpoints and does not require BLE hardware. Use `POST /dev/bluetooth/list` for fast local testing, or `POST /pairing/:pairingCode/list` as a development HTTP fallback after reading `receiveListUrl` from `GET /pairing/current`.

## Demo Flow

Start edge and screen in separate terminals:

```powershell
npm run dev:edge
npm run dev:screen
```

Health:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

Get active pairing:

```powershell
$pairing = Invoke-RestMethod http://localhost:4000/pairing/current
$pairing
```

Send a shopping list through the dev transport:

```powershell
$list = @{
  listId = "list-001"
  source = "external-web-app"
  pairingCode = $pairing.pairingCode
  items = @(
    @{ productId = "p_milk"; name = "Milk 1L"; quantity = 2 },
    @{ productId = "p_bread"; name = "Bread"; quantity = 1 }
  )
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post http://localhost:4000/dev/bluetooth/list -ContentType "application/json" -Body $list
```

Development HTTP fallback:

```powershell
Invoke-RestMethod -Method Post -Uri $pairing.receiveListUrl -ContentType "application/json" -Body $list
```

Scan products:

```powershell
Invoke-RestMethod -Method Post http://localhost:4000/dev/scan -ContentType "application/json" -Body '{"barcode":"622100000001"}'
Start-Sleep -Milliseconds 900
Invoke-RestMethod -Method Post http://localhost:4000/dev/scan -ContentType "application/json" -Body '{"productId":"p_bread"}'
```

Remove a product:

```powershell
Invoke-RestMethod -Method Post http://localhost:4000/dev/remove -ContentType "application/json" -Body '{"productId":"p_milk"}'
```

Move the cart:

```powershell
Invoke-RestMethod -Method Post http://localhost:4000/dev/move -ContentType "application/json" -Body '{"nodeId":"dairy_01"}'
```

Checkout and payment:

```powershell
Invoke-RestMethod -Method Post http://localhost:4000/dev/checkout/start
Invoke-RestMethod -Method Post http://localhost:4000/dev/payment/success
```

Reset the session:

```powershell
Invoke-RestMethod -Method Post http://localhost:4000/dev/session/reset
```

## Pairing Test

`GET /pairing/current` returns:

```json
{
  "cartId": "cart-01",
  "sessionId": "...",
  "pairingCode": "123456",
  "transport": "ble",
  "bluetoothDeviceName": "Carto-cart-01",
  "serviceUuid": "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  "writeCharacteristicUuid": "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  "notifyCharacteristicUuid": "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  "receiveListUrl": "http://localhost:4000/pairing/123456/list",
  "expiresAt": "2026-04-29T12:00:00.000Z",
  "qrPayload": "{\"cartId\":\"cart-01\",...}"
}
```

The QR payload is the JSON string form of the BLE object. `receiveListUrl` is metadata for development fallback and is not part of the QR payload.

## Raspberry Pi BLE Mode

Use these values on the Raspberry Pi:

```env
BLUETOOTH_MODE=ble
BLUETOOTH_DEVICE_NAME=Carto-cart-01
BLE_SERVICE_UUID=6e400001-b5a3-f393-e0a9-e50e24dcca9e
BLE_WRITE_CHARACTERISTIC_UUID=6e400002-b5a3-f393-e0a9-e50e24dcca9e
BLE_NOTIFY_CHARACTERISTIC_UUID=6e400003-b5a3-f393-e0a9-e50e24dcca9e
```

The real BLE receiver is prepared behind `BleShoppingListTransport`, but the BlueZ GATT server implementation is still marked with TODOs. On unsupported laptop OSes, `BLUETOOTH_MODE=ble` exits with: `Real BLE receiver requires Raspberry Pi/Linux BlueZ. Use BLUETOOTH_MODE=simulator on laptop.`

## Raspberry Pi Notes

- Install Node.js 20 or newer.
- Set `HOST=0.0.0.0`.
- Set `CART_EDGE_PUBLIC_HOST` to the Pi hostname or LAN IP.
- Set `BLUETOOTH_MODE=ble` only when the Raspberry Pi BlueZ implementation is ready.
- Keep `STORAGE_DIR` on a writable local path.
- Build with `npm run build`.
- Use `deploy/raspberry-pi/carto-edge.service.example` as the systemd template.
