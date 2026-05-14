# carto_pose_bridge

ROS 2 Humble helper package that forwards `/amcl_pose` updates to `cart-edge`.

## What it does

`carto_pose_bridge` subscribes to `geometry_msgs/PoseWithCovarianceStamped`, converts the quaternion orientation to yaw in radians, and POSTs:

```json
{
  "x": 1.2,
  "y": -0.4,
  "yaw": 1.57
}
```

to `cart-edge` at roughly 5 Hz.

## Install into your ROS workspace

Copy or symlink this folder into your ROS 2 workspace:

```bash
cp -r apps/carto-ros-bridge ~/lidar_ws/src/carto_pose_bridge
```

Then build and source it:

```bash
cd ~/lidar_ws
colcon build --packages-select carto_pose_bridge
source install/setup.bash
```

## Run

```bash
ros2 run carto_pose_bridge pose_bridge --ros-args \
  -p edge_url:=http://localhost:4000/dev/pose \
  -p topic:=/amcl_pose
```

Optional parameter:

- `publish_hz` default `5.0`

Example:

```bash
ros2 run carto_pose_bridge pose_bridge --ros-args \
  -p edge_url:=http://192.168.1.50:4000/dev/pose \
  -p topic:=/amcl_pose \
  -p publish_hz:=5.0
```

## Notes

- `cart-screen` never talks to ROS directly.
- `cart-edge` remains the only bridge target.
- If POSTs fail, the node keeps running and logs throttled warnings.
