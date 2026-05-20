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

## Navigation-style map UI

`cart-screen` uses `RealStoreMapPanel` for the middle map panel.

The map view is designed to behave like a navigation app:

- the user/cart marker stays fixed in the center of the panel
- the map image moves underneath the fixed marker
- the map rotates under the marker using snapshot `yawRad`
- the screen reads `pixelX` and `pixelY` from the `cart-edge` snapshot only
- `cart-screen` does not talk directly to ROS

The panel loads:

- `EXPO_PUBLIC_CART_EDGE_HTTP_URL/maps/store.png`
- `EXPO_PUBLIC_CART_EDGE_HTTP_URL/maps/store.json`
- `EXPO_PUBLIC_CART_EDGE_HTTP_URL/maps/store-zones.json` when available

Debug mode is available during development:

```powershell
$env:EXPO_PUBLIC_MAP_DEBUG="true"
```

That shows container size, map size, projected pixel position, scale, yaw, and the active asset URLs without changing the normal shopper UI.

## Simulated supermarket map

For local UI and simulator testing, the repo includes a large fake supermarket map generator:

```bash
npm run map:simulate
```

That writes:

- `apps/cart-edge/public/maps/store.yaml`
- `apps/cart-edge/public/maps/store.pgm`
- `apps/cart-edge/public/maps/store.png`
- `apps/cart-edge/public/maps/store.json`
- `apps/cart-edge/public/maps/store-zones.json`

Use the simulated map for Windows laptop UI testing.

For real ROS integration, the Raspberry Pi map used by AMCL must replace `store.yaml` and `store.pgm`. Then run:

```bash
npm run map:convert
```

## Run cart-edge

For local supermarket-map testing, generate the simulated map first:

```bash
npm run map:simulate
```

Then start the edge:

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

Do not run `npx expo start -c` from the repo root. That starts Expo in the monorepo root instead of `apps/cart-screen` and fails with `Unable to resolve "../../App" from "node_modules/expo/AppEntry.js"`.

`npm run dev:screen` is the correct root command. It runs the `@carto/cart-screen` workspace `dev` script, which starts Expo from `apps/cart-screen` with `--web --clear`.

PowerShell example:

```powershell
$env:EXPO_PUBLIC_CART_EDGE_WS_URL="ws://localhost:4000/ws"
$env:EXPO_PUBLIC_CART_EDGE_HTTP_URL="http://localhost:4000"
npm run dev:screen
```

The middle map panel uses `RealStoreMapPanel` and:

- loads `EXPO_PUBLIC_CART_EDGE_HTTP_URL/maps/store.png`
- loads `EXPO_PUBLIC_CART_EDGE_HTTP_URL/maps/store.json`
- keeps the user marker fixed in the center of the viewport
- moves the map under the marker using snapshot `pixelX` and `pixelY`
- rotates the map under the marker using `yawRad`
- can show zone labels from `store-zones.json`
- falls back gracefully if the generated map files are unavailable

## Test `/dev/pose`

Start the edge after generating the map:

```bash
npm run map:simulate
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

## Simulate movement without ROS

After `cart-edge` and `cart-screen` are running, start the pose stream in another terminal:

```bash
npm run dev:simulate-pose
```

or:

```bash
node tools/simulate-pose-stream.mjs --edge-url http://localhost:4000/dev/pose
```

The simulator:

- posts to `/dev/pose`
- uses the generated supermarket map origin and resolution
- moves along aisle-friendly waypoints at 5 Hz by default
- keeps exercising the same snapshot flow that real ROS integration uses

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

For real Raspberry Pi to Windows-laptop testing, point the bridge at the laptop:

```bash
python3 tools/ros/carto_pose_bridge.py \
  --edge-url http://LAPTOP_IP:4000/dev/pose \
  --topic /amcl_pose
```

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
- `GET /dev/list/sample`
- `POST /dev/list/sample`
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

PowerShell backend checks:

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/health"
Invoke-RestMethod -Uri "http://localhost:4000/maps/store.json"
curl.exe -I http://localhost:4000/maps/store.png
```

Pose check:

```powershell
$body = @{
  x = 1.2
  y = -0.4
  yaw = 1.57
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/dev/pose" -Method Post -ContentType "application/json" -Body $body

$snapshot = Invoke-RestMethod -Uri "http://localhost:4000/dev/snapshot"
$snapshot.position
```

Screen run:

```powershell
$env:EXPO_PUBLIC_CART_EDGE_WS_URL="ws://localhost:4000/ws"
$env:EXPO_PUBLIC_CART_EDGE_HTTP_URL="http://localhost:4000"
$env:EXPO_PUBLIC_MAP_DEBUG="true"
npm run dev:screen
```

Pose simulation run:

```bash
npm run dev:simulate-pose
```

Expected:

- `/health` `screenClients` should become `1` after the screen opens.
- the screen should show `Online`, not `Offline`.
- the map should render instead of staying on an infinite spinner
- the user marker should stay centered while the map moves and rotates underneath it

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
npm run map:simulate
npm run typecheck
npm run build
```
