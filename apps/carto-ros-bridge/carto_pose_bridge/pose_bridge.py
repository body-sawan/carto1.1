import json
import math
import time
import urllib.error
import urllib.request

import rclpy
from geometry_msgs.msg import PoseWithCovarianceStamped
from rclpy.node import Node


class PoseBridge(Node):
    def __init__(self) -> None:
        super().__init__("carto_pose_bridge")

        self.declare_parameter("edge_url", "http://localhost:4000/dev/pose")
        self.declare_parameter("topic", "/amcl_pose")
        self.declare_parameter("publish_hz", 5.0)

        self.edge_url = self.get_parameter("edge_url").get_parameter_value().string_value
        self.topic = self.get_parameter("topic").get_parameter_value().string_value
        self.publish_hz = self.get_parameter("publish_hz").get_parameter_value().double_value
        self.min_publish_period = 1.0 / max(self.publish_hz, 0.1)
        self.last_sent_at = 0.0
        self.last_warning_at = 0.0

        self.subscription = self.create_subscription(
            PoseWithCovarianceStamped,
            self.topic,
            self.handle_pose,
            10,
        )

        self.get_logger().info(
            f"Forwarding {self.topic} to {self.edge_url} at up to {self.publish_hz:.2f} Hz."
        )

    def handle_pose(self, message: PoseWithCovarianceStamped) -> None:
        now = time.monotonic()
        if now - self.last_sent_at < self.min_publish_period:
            return

        position = message.pose.pose.position
        orientation = message.pose.pose.orientation
        yaw = quaternion_to_yaw(orientation.x, orientation.y, orientation.z, orientation.w)
        payload = json.dumps(
            {
                "x": float(position.x),
                "y": float(position.y),
                "yaw": float(yaw),
            }
        ).encode("utf-8")

        request = urllib.request.Request(
            self.edge_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=1.5) as response:
                if response.status >= 400:
                    raise RuntimeError(f"HTTP {response.status}")
            self.last_sent_at = now
        except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError) as error:
            self.log_warning(f"Failed to POST pose to cart-edge: {error}")

    def log_warning(self, message: str) -> None:
        now = time.monotonic()
        if now - self.last_warning_at < 2.0:
            return
        self.last_warning_at = now
        self.get_logger().warn(message)


def quaternion_to_yaw(x: float, y: float, z: float, w: float) -> float:
    siny_cosp = 2.0 * (w * z + x * y)
    cosy_cosp = 1.0 - 2.0 * (y * y + z * z)
    return math.atan2(siny_cosp, cosy_cosp)


def main(args=None) -> None:
    rclpy.init(args=args)
    node = PoseBridge()

    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()
