#!/usr/bin/env python3

import argparse
import json
import math
import time
import urllib.error
import urllib.request

import rclpy
from geometry_msgs.msg import PoseWithCovarianceStamped
from rclpy.node import Node


class CartoPoseBridge(Node):
    def __init__(self, edge_url: str, topic: str) -> None:
        super().__init__("carto_pose_bridge")
        self.edge_url = edge_url
        self.topic = topic
        self.min_publish_period = 1.0 / 5.0
        self.last_sent_at = 0.0
        self.last_log_at = 0.0

        self.subscription = self.create_subscription(
            PoseWithCovarianceStamped,
            self.topic,
            self.handle_pose,
            10,
        )

        self.get_logger().info(f"Subscribed to {self.topic}")
        self.get_logger().info(f"Forwarding poses to {self.edge_url}")

    def handle_pose(self, message: PoseWithCovarianceStamped) -> None:
        now = time.monotonic()
        if now - self.last_sent_at < self.min_publish_period:
            return

        position = message.pose.pose.position
        orientation = message.pose.pose.orientation
        yaw = quaternion_to_yaw(orientation.x, orientation.y, orientation.z, orientation.w)
        payload = json.dumps({
            "x": float(position.x),
            "y": float(position.y),
            "yaw": float(yaw),
        }).encode("utf-8")

        request = urllib.request.Request(
            self.edge_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=1.5) as response:
                response.read()
                self.last_sent_at = now
                self.log_pose(float(position.x), float(position.y), float(yaw), response.status)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            self.get_logger().warning(f"Failed to send pose: {error}")

    def log_pose(self, x_meters: float, y_meters: float, yaw_rad: float, status: int) -> None:
        now = time.monotonic()
        if now - self.last_log_at < 1.0:
            return
        self.last_log_at = now
        self.get_logger().info(
            f"Pose sent: x={x_meters:.3f} y={y_meters:.3f} yaw={yaw_rad:.3f} status={status}"
        )


def quaternion_to_yaw(x_value: float, y_value: float, z_value: float, w_value: float) -> float:
    siny_cosp = 2.0 * (w_value * z_value + x_value * y_value)
    cosy_cosp = 1.0 - 2.0 * (y_value * y_value + z_value * z_value)
    return math.atan2(siny_cosp, cosy_cosp)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Forward /amcl_pose updates to cart-edge /dev/pose.")
    parser.add_argument("--edge-url", default="http://localhost:4000/dev/pose")
    parser.add_argument("--topic", default="/amcl_pose")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rclpy.init(args=None)
    node = CartoPoseBridge(edge_url=args.edge_url, topic=args.topic)

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        node.get_logger().info("Shutting down pose bridge.")
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
