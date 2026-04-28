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
```

The edge listens on `HOST` and `PORT`. QR pairing uses `CART_EDGE_PUBLIC_HOST` and `PORT`, so set `CART_EDGE_PUBLIC_HOST` to the Pi hostname or IP during device testing.

The screen WebSocket URL can be set with:

```env
EXPO_PUBLIC_CART_EDGE_WS_URL=ws://localhost:4000/ws
```

## Standard Endpoints

- `GET /health`
- `GET /pairing/current`
- `POST /pairing/:pairingCode/list`

Development endpoints:

- `GET /dev/snapshot`
- `GET /dev/catalog`
- `POST /dev/session/reset`
- `POST /dev/bluetooth/list`
- `POST /dev/scan`
- `POST /dev/remove`
- `POST /dev/move`
- `POST /dev/checkout/start`
- `POST /dev/payment/success`
- `POST /dev/payment/failure`

Backward-compatible endpoints currently kept:

- `POST /dev/snapshot`
- `POST /dev/checkout`

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

Send a shopping list to the QR pairing endpoint:

```powershell
$list = @{
  listId = "list-001"
  source = "local-http"
  items = @(
    @{ productId = "p_milk"; name = "Milk 1L"; quantity = 2 },
    @{ productId = "p_bread"; name = "Bread"; quantity = 1 }
  )
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Depth 5

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

## QR Pairing Test

`GET /pairing/current` returns:

```json
{
  "cartId": "cart-01",
  "sessionId": "...",
  "pairingCode": "123456",
  "transport": "local-http",
  "receiveListUrl": "http://localhost:4000/pairing/123456/list",
  "expiresAt": "2026-04-29T12:00:00.000Z",
  "qrPayload": "{\"cartId\":\"cart-01\",...}"
}
```

The QR payload is the JSON string form of the pairing object without wrapper metadata. During development the screen also shows the receive URL as text.

## Raspberry Pi Notes

- Install Node.js 20 or newer.
- Set `HOST=0.0.0.0`.
- Set `CART_EDGE_PUBLIC_HOST` to the Pi hostname or LAN IP.
- Keep `STORAGE_DIR` on a writable local path.
- Build with `npm run build`.
- Use `deploy/raspberry-pi/carto-edge.service.example` as the systemd template.

Bluetooth is intentionally simulated for now. The current local HTTP pairing flow is structured so a real Bluetooth receiver can call the same shopping-list receiver later.
