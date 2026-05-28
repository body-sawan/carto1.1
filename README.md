# Carto Smart Shopping Cart

Carto is a tablet-first smart shopping cart experience built as a monorepo with:

- `apps/cart-edge`: the local backend and session engine
- `apps/cart-screen`: the mounted tablet web UI
- `packages/shared`: shared TypeScript types and protocol models

The cart tablet now uses a static interactive indoor map only.

Localization and live positioning were removed because the previous accuracy was not reliable enough for a dependable shopper experience. The map is now only for visual browsing, store layout viewing, and section awareness.

## What The App Does

- Shows a QR-based welcome screen for pairing a shopping list
- Lets shoppers continue without a list
- Plays a Carto brand transition before the main shopping dashboard
- Displays a 3-column tablet dashboard:
  - shopping list
  - static interactive map
  - cart items
- Keeps the rear-camera scanning workflow
- Shows smart receipt and payment confirmation flow
- Supports three UI themes:
  - `Carto Blue Green`
  - `Premium Light`
  - `Friendly Supermarket`

## What Was Removed

The tablet UI and map no longer depend on:

- AMCL
- SLAM
- RF2O
- LiDAR
- ROS map topics
- `/map`
- `/amcl_pose`
- `/odom`
- `/tf`
- `/scan`
- live pose updates
- map to odom to base_link transforms
- current position marker
- robot marker
- "you are here"
- pose displays such as `x`, `y`, `theta`
- localization status
- localization accuracy circles
- route drawing from current location

## Static Map

The indoor map is loaded from:

- `apps/cart-edge/public/maps/store-map.png`

The tablet map supports:

- drag and pan
- zoom in
- zoom out
- reset view
- responsive tablet layout

The map is static and interactive only. It does not depend on ROS or backend localization.

## Session Flow

The main shopper flow is:

1. QR / welcome screen
2. Optional "Continue without list"
3. Carto brand transition
4. Main shopping dashboard
5. Scan / cart / map / settings as needed
6. Smart receipt / checkout screen
7. Payment success feedback
8. Automatic return to the QR screen with session reset

## Monorepo Structure

```text
apps/
  cart-edge/      Express + WebSocket cart backend
  cart-screen/    Expo web tablet UI
packages/
  shared/         Shared protocol and data models
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Environment Variables

For `apps/cart-screen`, set:

```env
EXPO_PUBLIC_CART_EDGE_WS_URL=ws://localhost:4000/ws
EXPO_PUBLIC_CART_EDGE_HTTP_URL=http://localhost:4000
EXPO_PUBLIC_CUSTOMER_WEBAPP_URL=https://carto.com
```

If you do not set them, the tablet app defaults to localhost for `cart-edge`.

## Install

```bash
npm install
```

## Run The App

Start the backend:

```bash
npm run dev:edge
```

Start the tablet UI:

```bash
npm run dev:screen
```

Open the web tablet UI from the Expo output, or export the web build locally with:

```bash
cd apps/cart-screen
npx expo export -p web
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

## Backend Endpoints

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

## Notes For Integration

- `cart-edge` remains the source of truth for cart state, shopping lists, totals, checkout, and session lifecycle.
- `cart-screen` listens to WebSocket snapshots and renders the shopper UI.
- QR pairing already exists in the backend session manager and is reused by the current UI.
- The static map is front-end only and does not require backend localization.

## Theme Switching

Use the tablet `Settings` screen to switch between:

- `Carto Blue Green`
- `Premium Light`
- `Friendly Supermarket`

## Current Verification

The current app was verified with:

```bash
npm run typecheck
npm run build
cd apps/cart-screen
npx expo export -p web
```

## TODO

- Replace the QR welcome card with the final production logo asset when branding files are available
- Replace the camera placeholder with the final live camera surface where supported
- Connect any future real payment confirmation UI to the existing checkout backend events
- If a customer web app URL changes, update `EXPO_PUBLIC_CUSTOMER_WEBAPP_URL`
