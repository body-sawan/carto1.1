# Carto: Smart Cart Edge + Screen + ROS Map Bridge

`cart-edge` is the source of truth. `cart-screen` is display-only.

This repo now supports a real ROS 2 localization flow:

`ROS localization -> carto_pose_bridge -> POST /dev/pose -> cart-edge snapshot -> cart-screen live map marker`

`cart-screen` never talks to ROS directly.

## Project Structure

- `apps/cart-edge`: Node.js edge service, HTTP API, WebSocket server, session state, shopping logic, route logic, JSON persistence, static map hosting.
- `apps/cart-screen`: Expo React Native display app. It renders only the latest `cart.snapshot` from `cart-edge`.
- `apps/carto-ros-bridge`: ROS 2 Python package that forwards `/amcl_pose` to `cart-edge`.
- `packages/shared`: shared TypeScript protocol and domain types.

## Map Assets

Static map files live in:

`apps/cart-edge/public/maps`

Expected files:

- `store.pgm`
- `store.yaml`
- `store.png`
- `store.json`

Current workflow:

1. Copy your ROS map files into `apps/cart-edge/public/maps` as `store.pgm` and `store.yaml`.
2. Run:

```bash
npm run map:convert
```

That script:

- reads `store.pgm`
- reads `store.yaml`
- generates `store.png`
- generates `store.json`
- preserves the map dimensions
- colors occupied cells dark, free cells light, and unknown cells light gray

`store.json` shape:

```json
{
  "imageUrl": "/maps/store.png",
  "resolution": 0.05,
  "origin": [0.0, 0.0, 0.0],
  "width": 168,
  "height": 186
}
```

Important:

- The repo includes a placeholder `apps/cart-edge/public/maps/store.yaml` if your original ROS YAML was not present on this machine.
- Replace that file with the real ROS YAML from your localization workspace and rerun `npm run map:convert` for exact meter-to-pixel alignment.

## Install

```bash
npm install
```

## Run cart-edge

```bash
npm run dev:edge
```

or:

```bash
npm run dev -w @carto/cart-edge
```

`cart-edge` serves:

- HTTP API on `http://<host>:4000`
- WebSocket on `ws://<public-host>:4000/ws`
- static map files on `/maps`

Examples:

- `GET /maps/store.png`
- `GET /maps/store.json`

## Run cart-screen

Set these environment variables for the screen:

```env
EXPO_PUBLIC_CART_EDGE_HTTP_URL=http://<PI_IP>:4000
EXPO_PUBLIC_CART_EDGE_WS_URL=ws://<PI_IP>:4000/ws
```

Then run:

```bash
npm run dev:screen
```

The screen will:

- keep using WebSocket snapshots from `cart-edge`
- load the real map image from `EXPO_PUBLIC_CART_EDGE_HTTP_URL/maps/store.png`
- overlay the live cart marker using `snapshot.position.pixelX`, `snapshot.position.pixelY`, and `snapshot.position.yawRad`
- fall back to the route overview panel when live LiDAR pose data is not available yet

## Run the ROS Pose Bridge

The ROS package lives in:

`apps/carto-ros-bridge`

Copy or symlink it into your ROS workspace:

```bash
cp -r apps/carto-ros-bridge ~/lidar_ws/src/carto_pose_bridge
```

Then build it:

```bash
cd ~/lidar_ws
colcon build --packages-select carto_pose_bridge
source install/setup.bash
```

Run it:

```bash
ros2 run carto_pose_bridge pose_bridge --ros-args \
  -p edge_url:=http://localhost:4000/dev/pose \
  -p topic:=/amcl_pose
```

Supported parameters:

- `edge_url` default `http://localhost:4000/dev/pose`
- `topic` default `/amcl_pose`
- `publish_hz` default `5.0`

The node:

- subscribes to `geometry_msgs/PoseWithCovarianceStamped`
- converts quaternion orientation to yaw radians
- POSTs `{ "x": ..., "y": ..., "yaw": ... }` to `cart-edge`
- throttles updates to about 5 Hz

## Runtime Flow

1. ROS 2 publishes `/amcl_pose`.
2. `carto_pose_bridge` reads the pose and yaw.
3. `carto_pose_bridge` POSTs to `http://localhost:4000/dev/pose`.
4. `cart-edge` loads `store.json`, projects meters to map pixels, updates the session position, persists it, and broadcasts a fresh `cart.snapshot`.
5. `cart-screen` receives the snapshot over WebSocket and redraws the live marker on the real store map.

## Position Model

The shared `Position` model keeps the original fields:

- `nodeId`
- `x`
- `y`

and now supports optional real-localization fields:

- `xMeters`
- `yMeters`
- `yawRad`
- `pixelX`
- `pixelY`
- `source`
- `updatedAt`

`source` is either:

- `"simulator"`
- `"lidar"`

Compatibility is preserved:

- BLE QR flow still works
- dev session reset still works
- `/dev/move` still works
- shopping list, cart, checkout, and payment logic still live only in `cart-edge`
- the WebSocket snapshot protocol is unchanged except for added optional fields

## Key Endpoints

Standard:

- `GET /health`
- `GET /pairing/current`

Development:

- `GET /dev/snapshot`
- `POST /dev/snapshot`
- `GET /dev/catalog`
- `POST /dev/session/reset`
- `POST /dev/bluetooth/list`
- `POST /dev/scan`
- `POST /dev/remove`
- `POST /dev/move`
- `POST /dev/pose`
- `POST /dev/checkout/start`
- `POST /dev/checkout`
- `POST /dev/checkout/cancel`
- `POST /dev/payment/success`
- `POST /dev/payment/failure`

## Test the Pose Endpoint

```bash
curl -X POST http://localhost:4000/dev/pose \
  -H "Content-Type: application/json" \
  -d '{"x":1.2,"y":-0.4,"yaw":1.57}'
```

Then verify:

```bash
curl http://localhost:4000/dev/snapshot
```

You should see `position` include values like:

```json
{
  "nodeId": "entrance",
  "x": 1.2,
  "y": -0.4,
  "xMeters": 1.2,
  "yMeters": -0.4,
  "yawRad": 1.57,
  "pixelX": 24,
  "pixelY": 194,
  "source": "lidar",
  "updatedAt": "2026-05-14T12:00:00.000Z"
}
```

## Typical Local Demo Flow

Start the services:

```bash
npm run dev:edge
npm run dev:screen
```

Load a list:

```bash
curl -X GET http://localhost:4000/dev/list/sample
```

Drive a simulated node move:

```bash
curl -X POST http://localhost:4000/dev/move \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"dairy_01"}'
```

Switch to real localization input:

```bash
curl -X POST http://localhost:4000/dev/pose \
  -H "Content-Type: application/json" \
  -d '{"x":1.2,"y":-0.4,"yaw":1.57}'
```

## BLE / Shopping Compatibility

The cart still keeps the original pairing and shopping flow:

1. The screen displays the QR payload while state is `WAITING_FOR_LIST`.
2. A phone pairs the cart.
3. A shopping list arrives through BLE or the dev transport.
4. `cart-edge` validates and stores it.
5. The screen receives a fresh `cart.snapshot`.

`cart-screen` still does not calculate totals, validate items, or own cart state locally.

## Environment

Edge:

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

Screen:

```env
EXPO_PUBLIC_CART_EDGE_HTTP_URL=http://localhost:4000
EXPO_PUBLIC_CART_EDGE_WS_URL=ws://localhost:4000/ws
EXPO_PUBLIC_CUSTOMER_WEBAPP_URL=https://carto.com
```

## Validation Commands

```bash
npm run typecheck
npm run build
```

Optional map regeneration:

```bash
npm run map:convert
```

## Troubleshooting

If the marker does not move:

- check that `/amcl_pose` is publishing
- check that `ros2 run carto_pose_bridge pose_bridge ...` is running
- check `POST /dev/pose` manually with `curl`
- check `GET /dev/snapshot` and confirm `position.source` is `"lidar"`

If the map image does not load:

- check `GET /maps/store.png`
- check `GET /maps/store.json`
- rerun `npm run map:convert`
- make sure `EXPO_PUBLIC_CART_EDGE_HTTP_URL` points to the correct edge host

If the screen cannot connect:

- check `EXPO_PUBLIC_CART_EDGE_WS_URL`
- check `GET /health`
- check that the device running the screen can reach the Pi IP and port

If `/dev/pose` fails:

- confirm `store.json` exists in `apps/cart-edge/public/maps`
- confirm the request body uses finite numbers
- confirm the map metadata came from the correct ROS YAML

If the live marker looks offset:

- replace the placeholder `store.yaml` with the real ROS map YAML
- rerun `npm run map:convert`
- verify `resolution` and `origin` in `store.json`

## Raspberry Pi Notes

- Install Node.js 20 or newer.
- Set `HOST=0.0.0.0`.
- Set `CART_EDGE_PUBLIC_HOST` to the Pi hostname or LAN IP.
- Keep `STORAGE_DIR` on a writable local path.
- Build with `npm run build`.
- Use `deploy/raspberry-pi/carto-edge.service.example` as the systemd template.
