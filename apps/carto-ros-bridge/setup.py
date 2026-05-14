from setuptools import setup

package_name = "carto_pose_bridge"

setup(
    name=package_name,
    version="0.1.0",
    packages=[package_name],
    data_files=[
        ("share/ament_index/resource_index/packages", [f"resource/{package_name}"]),
        (f"share/{package_name}", ["package.xml", "README.md"]),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="Carto",
    maintainer_email="opensource@example.com",
    description="Forward AMCL pose updates from ROS 2 to cart-edge.",
    license="MIT",
    entry_points={
        "console_scripts": [
            "pose_bridge = carto_pose_bridge.pose_bridge:main",
        ],
    },
)
