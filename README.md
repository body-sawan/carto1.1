# Carto Smart Shopping Cart

Carto is a tablet-first smart shopping cart monorepo with:

- `apps/cart-edge`: the existing local backend and WebSocket session engine
- `apps/cart-screen`: the mounted cart screen UI
- `packages/shared`: shared TypeScript types and protocol models

The cart UI is now prepared for three integration modes:

- `local-edge`: current local `cart-edge` WebSocket/dev flow
- `mock-online`: future online flow simulated locally for UI testing
- `online-api`: future teammate backend flow using HTTP polling and adapters

## Current Shopper Experience

- QR-based welcome screen
- Continue without list
- Brand transition into the shopping dashboard
- Three-column dashboard:
  - left: shopping list
  - center: static interactive map
  - right: cart items and compact checkout summary
- Rear-camera/manual product flow
- Smart receipt and success flow

## Static Map Only

The cart screen now uses a bundled static map image from:

- `apps/cart-screen/assets/store-map-friendly.png`

Supported map behavior:

- pan
- zoom in
- zoom out
- reset

Removed or disabled behavior:

- current location marker
- robot marker
- user/cart marker
- yaw-based rotation
- live localization
- AMCL
- SLAM
- RF2O
- LiDAR tracking
- ROS subscriptions and pose displays
- `/amcl_pose`
- `/odom`
- `/tf`
- `/scan`

Legacy localization references may still exist in older docs or backend comments, but they are not part of the current cart UI flow.

## Integration Modes

### `local-edge`

Uses the current local `cart-edge` backend:

- WebSocket snapshots
- local pairing / session lifecycle
- local dev scan/remove/checkout endpoints

This is the safest default mode and keeps the current local stack working.

### `mock-online`

Prepares the future teammate backend flow without requiring any backend deployment:

- QR value points to `${CARTO_WEB_BASE_URL}/pair?cartCode=${CART_CODE}`
- the screen polls a mock active-session adapter
- it waits briefly, then activates a fake online shopping session
- add/remove/checkout/close continue to work locally for UI testing

Use this mode to test:

- QR screen
- waiting state
- session activation transition
- shopping list rendering
- cart item rendering
- add/remove overlays
- checkout/reset flow

### `online-api`

Prepares the future teammate backend flow:

- QR value points to `${CARTO_WEB_BASE_URL}/pair?cartCode=${CART_CODE}`
- the cart polls `GET ${CARTO_API_BASE_URL}/api/carts/${CART_CODE}/active-session`
- requests include `Authorization: Bearer ${DEVICE_SECRET}`
- cart item / checkout / close actions are routed through API adapters

If the backend is unavailable, the UI stays safe and shows offline/waiting state instead of crashing.

## Environment Variables

The cart screen supports both plain and Expo-public names, but because the UI runs in Expo web, prefer the `EXPO_PUBLIC_*` variables.

Example local UI testing with mock online mode:

```env
EXPO_PUBLIC_CARTO_INTEGRATION_MODE=mock-online
EXPO_PUBLIC_CART_CODE=CART-001
EXPO_PUBLIC_DEVICE_SECRET=dev-device-secret
EXPO_PUBLIC_CARTO_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_CARTO_WEB_BASE_URL=http://localhost:3000
EXPO_PUBLIC_CART_EDGE_WS_URL=ws://localhost:4000/ws
EXPO_PUBLIC_CART_EDGE_HTTP_URL=http://localhost:4000
```

Example current local-edge mode:

```env
EXPO_PUBLIC_CARTO_INTEGRATION_MODE=local-edge
EXPO_PUBLIC_CART_EDGE_WS_URL=ws://localhost:4000/ws
EXPO_PUBLIC_CART_EDGE_HTTP_URL=http://localhost:4000
```

Example future teammate Vercel mode:

```env
EXPO_PUBLIC_CARTO_INTEGRATION_MODE=online-api
EXPO_PUBLIC_CART_CODE=CART-001
EXPO_PUBLIC_DEVICE_SECRET=dev-device-secret
EXPO_PUBLIC_CARTO_API_BASE_URL=https://teammate-vercel-url.vercel.app
EXPO_PUBLIC_CARTO_WEB_BASE_URL=https://teammate-vercel-url.vercel.app
```

## Online Pairing Model

- The QR contains the cart pairing URL only.
- The QR does not contain the shopping list.
- The cart expects the backend to return JSON responses, not JSON files.
- In online mode, the cart polls the active-session endpoint while waiting.

Expected future QR value:

```text
${CARTO_WEB_BASE_URL}/pair?cartCode=${CART_CODE}
```

Expected future waiting response:

```json
{
  "status": "waiting",
  "cartCode": "CART-001"
}
```

Expected future active response:

```json
{
  "status": "active",
  "cartCode": "CART-001",
  "sessionId": "SESSION-123",
  "cartSessionId": "CARTSESSION-999",
  "receiptId": "RECEIPT-1001",
  "shoppingList": [
    {
      "productId": "p1",
      "name": "Milk",
      "quantity": 1,
      "checked": false
    }
  ],
  "cartItems": [],
  "total": 0
}
```

## Install

```bash
npm install
```

## Run The App

Start the local backend:

```bash
npm run dev:edge
```

Start the cart screen:

```bash
npm run dev:screen
```

## Useful Commands

Typecheck everything:

```bash
npm run typecheck
```

Build shared packages and backend:

```bash
npm run build
```

Export the cart screen web build:

```bash
cd apps/cart-screen
npx expo export -p web
```

## Local-Edge Endpoints

Health:

```text
GET /health
```

Current pairing:

```text
GET /pairing/current
```

Send a shopping list using the pairing code:

```text
POST /pairing/:pairingCode/list
```

Development helpers:

```text
GET  /dev/catalog
GET  /dev/snapshot
POST /dev/session/reset
POST /dev/list/sample
POST /dev/scan
POST /dev/remove
POST /dev/checkout/start
POST /dev/checkout
POST /dev/checkout/cancel
POST /dev/payment/success
POST /dev/payment/failure
```

## Current Verification

Verified with:

```bash
npm run typecheck
npm run build
cd apps/cart-screen
npx expo export -p web
```
