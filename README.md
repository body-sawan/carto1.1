# Carto: Smart Cart Edge + Screen

`cart-edge` is the source of truth. `cart-screen` is display-only.

All cart state, shopping logic, routing, persistence, pose projection, and WebSocket snapshots live in `apps/cart-edge`. `apps/cart-screen` only renders snapshots received from `cart-edge`. It never talks directly to ROS.

## Project Structure

- `apps/cart-edge`: Node.js edge service, HTTP API, WebSocket server, shopping/cart state, map projection, static map hosting.
- `apps/cart-screen`: Expo React Native shopper display that renders `cart.snapshot`.
- `apps/carto-ros-bridge`: ROS 2 Python package for `ros2 run carto_pose_bridge pose_bridge`.
- `tools/ros/carto_pose_bridge.py`: standalone ROS 2 Python bridge script.
- `packages/shared`: shared TypeScript protocol and domain types.

## Install

```bash
npm install
```

## LiDAR Map and Localization Integration

The user only needs to provide two ROS map files:

- `apps/cart-edge/public/maps/store.yaml`
- `apps/cart-edge/public/maps/store.pgm`

Do not manually create `store.png` or `store.json`.

Those are generated automatically by:

```bash
npm run map:convert
```

### Prepare the map files

```bash
mkdir -p apps/cart-edge/public/maps
cp ~/lidar_ws/maps/my_place.yaml apps/cart-edge/public/maps/store.yaml
cp ~/lidar_ws/maps/my_place.pgm apps/cart-edge/public/maps/store.pgm
npm run map:convert
```

This generates:

- `apps/cart-edge/public/maps/store.png`
- `apps/cart-edge/public/maps/store.json`

The converter:

- reads `store.yaml`
- reads `store.pgm`
- preserves the PGM width and height
- reads `resolution` and `origin` from the YAML
- writes `imageUrl: "/maps/store.png"` into `store.json`

Example generated metadata:

```json
{
  "imageUrl": "/maps/store.png",
  "resolution": 0.05,
  "origin": [-3.2, -4.1, 0],
  "width": 820,
  "height": 640
}
```

If `store.yaml` or `store.pgm` is missing, the converter prints:

```text
Missing map files. Put store.yaml and store.pgm in apps/cart-edge/public/maps then run npm run map:convert
```

## Run cart-edge

```bash
npm run dev:edge
```

or:

```bash
npm run dev -w @carto/cart-edge
```

`cart-edge` serves static map files from:

- `GET /maps/store.png`
- `GET /maps/store.json`

Test them:

```bash
http://localhost:4000/maps/store.png
http://localhost:4000/maps/store.json
```

## Run cart-screen

Set the screen environment:

```env
EXPO_PUBLIC_CART_EDGE_WS_URL=ws://<PI_IP>:4000/ws
EXPO_PUBLIC_CART_EDGE_HTTP_URL=http://<PI_IP>:4000
```

If `EXPO_PUBLIC_CART_EDGE_HTTP_URL` is missing, the screen safely derives it from the WebSocket URL. Example:

`ws://192.168.1.25:4000/ws` becomes `http://192.168.1.25:4000`

Run the screen:

```bash
npm run dev:screen
```

The middle map panel uses `RealStoreMapPanel` and:

- loads `EXPO_PUBLIC_CART_EDGE_HTTP_URL/maps/store.png`
- loads `EXPO_PUBLIC_CART_EDGE_HTTP_URL/maps/store.json`
- overlays the cart marker from snapshot `pixelX` and `pixelY`
- rotates the heading arrow using `yawRad`
- falls back gracefully if the generated map files are unavailable

## Test `/dev/pose`

Start the edge after generating the map:

```bash
npm run dev:edge
```

Send a pose:

```bash
curl -X POST http://localhost:4000/dev/pose \
  -H "Content-Type: application/json" \
  -d '{"x":1.2,"y":-0.4,"yaw":1.57}'
```

Then inspect the snapshot:

```bash
http://localhost:4000/dev/snapshot
```

Expected `position` fields include:

- `xMeters`
- `yMeters`
- `yawRad`
- `pixelX`
- `pixelY`
- `source: "lidar"`

`/dev/pose` behavior:

- validates `x` and `y` as finite numbers
- defaults `yaw` to `0`
- loads `store.json`
- projects world meters into image pixels
- persists the session
- broadcasts a fresh `cart.snapshot` through the existing WebSocket system

If `store.json` is missing, the server does not crash. `/dev/pose` returns:

```text
Map metadata not found. Run npm run map:convert after placing store.yaml and store.pgm.
```

## Run the ROS pose bridge

You can use either the standalone script or the ROS package.

### Standalone script

Run this inside a ROS 2 environment:

```bash
python3 tools/ros/carto_pose_bridge.py \
  --edge-url http://localhost:4000/dev/pose \
  --topic /amcl_pose
```

The script:

- subscribes to `/amcl_pose`
- reads `geometry_msgs/PoseWithCovarianceStamped`
- converts quaternion orientation to yaw
- POSTs JSON to `cart-edge`
- throttles updates to about 5 Hz
- logs subscribe/start, pose sent, and pose-send failures

### ROS package

The repo also includes a ROS 2 package in `apps/carto-ros-bridge`.

Example:

```bash
cp -r apps/carto-ros-bridge ~/lidar_ws/src/carto_pose_bridge
cd ~/lidar_ws
colcon build --packages-select carto_pose_bridge
source install/setup.bash
ros2 run carto_pose_bridge pose_bridge --ros-args \
  -p edge_url:=http://localhost:4000/dev/pose \
  -p topic:=/amcl_pose
```

## Runtime Flow

`ROS localization -> pose bridge -> POST /dev/pose -> cart-edge snapshot -> cart-screen map marker`

More explicitly:

1. ROS publishes `/amcl_pose`.
2. The bridge reads position and yaw.
3. The bridge POSTs `{ x, y, yaw }` to `http://localhost:4000/dev/pose`.
4. `cart-edge` loads `store.json`, projects meters to pixels, updates `session.position`, persists it, and broadcasts a fresh snapshot.
5. `cart-screen` receives the snapshot via WebSocket and redraws the shopper-friendly marker on the real store map.

## Compatibility

These flows remain intact:

- BLE QR pairing
- dev session reset
- `/dev/move`
- `/dev/scan`
- `/dev/remove`
- `/dev/snapshot`
- shopping list logic
- cart totals and checkout
- WebSocket snapshot protocol

The snapshot protocol only adds optional pose fields. Existing fields stay compatible.

## Useful Endpoints

- `GET /health`
- `GET /pairing/current`
- `GET /dev/snapshot`
- `POST /dev/snapshot`
- `POST /dev/session/reset`
- `GET /dev/reset`
- `POST /dev/reset`
- `POST /dev/move`
- `POST /dev/scan`
- `POST /dev/remove`
- `POST /dev/pose`
- `POST /dev/checkout/start`
- `POST /dev/payment/success`
- `POST /dev/payment/failure`

## Environment

Edge defaults:

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

Screen defaults:

```env
EXPO_PUBLIC_CART_EDGE_WS_URL=ws://localhost:4000/ws
EXPO_PUBLIC_CART_EDGE_HTTP_URL=http://localhost:4000
```

## Troubleshooting

If the marker does not move:

- check that `/amcl_pose` is publishing
- check that the pose bridge is running
- test `POST /dev/pose` manually
- inspect `GET /dev/snapshot`

If the map does not load:

- check `http://localhost:4000/maps/store.png`
- check `http://localhost:4000/maps/store.json`
- rerun `npm run map:convert`
- verify `EXPO_PUBLIC_CART_EDGE_HTTP_URL`

If `/dev/pose` fails:

- make sure `store.yaml` and `store.pgm` exist in `apps/cart-edge/public/maps`
- rerun `npm run map:convert`
- verify that `store.json` was generated

## Checks

Run:

```bash
npm run typecheck
npm run build
```
