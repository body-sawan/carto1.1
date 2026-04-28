# Carto Raspberry Pi Deployment Notes

This folder is preparation material for running `apps/cart-edge` on a Raspberry Pi.

## Basic Steps

1. Install Node.js 20 or newer on the Pi.
2. Clone or copy the Carto project to the Pi.
3. From the project root, run `npm install` and `npm run build`.
4. Copy `carto-edge.service.example` to `/etc/systemd/system/carto-edge.service`.
5. Replace the placeholder user, group, and project path values.
6. Set the environment values for your network, especially `CART_EDGE_PUBLIC_HOST`.
7. Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable carto-edge
sudo systemctl start carto-edge
sudo systemctl status carto-edge
```

The smart cart screen should connect to `ws://<pi-host>:4000/ws`.
