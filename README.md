# Carto: AI-Powered Smart Shopping Cart System

Carto is a production-minded foundation for the smart cart side of the graduation project. The cart edge is the source of truth. The tablet/screen only displays snapshots and sends user commands.

## Apps

- `apps/cart-edge`: Node.js + TypeScript edge service, WebSocket server, local state, receipt/list/navigation/payment logic, JSON persistence, and simulator HTTP endpoints.
- `apps/cart-screen`: Expo React Native screen simulator. It connects to the edge over WebSocket and renders full snapshots only.
- `packages/shared`: shared TypeScript domain and protocol types used by both apps.

## Setup

```bash
npm install
npm run dev:edge
npm run dev:screen
```

Root scripts:

- `npm run dev:edge`: starts the cart edge server.
- `npm run dev:screen`: starts the Expo screen simulator.
- `npm run typecheck`: typechecks all workspaces.
- `npm run build`: builds `packages/shared` first, then `apps/cart-edge`.

Default edge URLs:

- HTTP simulator API: `http://localhost:4000`
- Screen WebSocket: `ws://localhost:4000/screen`

For Expo Web, open the URL printed by Expo, usually `http://localhost:8081`.

## Simulator Flow

Start the edge and screen, then call these HTTP endpoints:

```bash
curl -X POST http://localhost:4000/dev/bluetooth/list `
  -H "Content-Type: application/json" `
  -d "{\"listId\":\"list-001\",\"source\":\"external-web-app\",\"items\":[{\"productId\":\"p_milk\",\"name\":\"Milk 1L\",\"quantity\":2},{\"productId\":\"p_bread\",\"name\":\"Bread\",\"quantity\":1}],\"createdAt\":\"2026-04-28T00:00:00.000Z\"}"

curl -X POST http://localhost:4000/dev/scan -H "Content-Type: application/json" -d "{\"barcode\":\"622100000001\"}"
curl -X POST http://localhost:4000/dev/scan -H "Content-Type: application/json" -d "{\"barcode\":\"622100000002\"}"
curl -X POST http://localhost:4000/dev/remove -H "Content-Type: application/json" -d "{\"productId\":\"p_milk\"}"
curl -X POST http://localhost:4000/dev/move -H "Content-Type: application/json" -d "{\"nodeId\":\"dairy_01\"}"
curl -X POST http://localhost:4000/dev/checkout
curl -X POST http://localhost:4000/dev/payment/success
curl -X POST http://localhost:4000/dev/session/reset
```

PowerShell users can also use `Invoke-RestMethod` with the same JSON bodies.

## Edge Principles

- The edge owns all business logic, totals, route updates, validation, and payment state.
- The screen updates from `cart.snapshot` messages and requests a snapshot after reconnect.
- The screen imports shared snapshot/protocol types, but it does not validate products, calculate totals, or make cart decisions.
- Every WebSocket message is typed, versioned, sequenced, timestamped, and cart/session scoped.
- JSON storage is isolated behind `LocalStore` so SQLite can replace it later.

## Current Simulator Endpoints

- `POST /dev/bluetooth/list`: simulate a Bluetooth shopping list payload.
- `POST /dev/scan`: simulate barcode or product scan with `{ "barcode": "..." }` or `{ "productId": "..." }`.
- `POST /dev/remove`: simulate product removal with `{ "productId": "..." }`.
- `POST /dev/move`: move cart position with `{ "nodeId": "..." }`.
- `POST /dev/checkout`: start checkout.
- `POST /dev/payment/success`: force payment success.
- `POST /dev/payment/failure`: force payment failure.
- `POST /dev/session/reset`: start a fresh QR waiting session for another demo.
- `POST /dev/snapshot`: return the current edge snapshot.
