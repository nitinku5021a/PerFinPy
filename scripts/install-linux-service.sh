#!/usr/bin/env sh
set -eu

if [ "$(id -u)" -eq 0 ]; then
  echo "Run this as the app user, not root. It will call sudo only where needed." >&2
  exit 1
fi

APP_USER=${PERFINPY_SERVICE_USER:-$(id -un)}
APP_DIR=${PERFINPY_APP_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)}
ENV_DIR=${PERFINPY_ENV_DIR:-/etc/perfinpy}
ENV_FILE="$ENV_DIR/perfinpy.env"
SERVICE_FILE=/etc/systemd/system/perfinpy.service

sudo mkdir -p "$ENV_DIR"
if [ ! -f "$ENV_FILE" ]; then
  sudo cp "$APP_DIR/deploy/perfinpy.env.example" "$ENV_FILE"
  sudo chown root:root "$ENV_FILE"
  sudo chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE. Edit SECRET_KEY, DATABASE_URL, and bind hosts before starting."
fi

sudo tee "$SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=PerFinPy
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=-$ENV_FILE
ExecStart=/usr/bin/python3 $APP_DIR/prod.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable perfinpy.service

echo "Installed perfinpy.service for $APP_USER at $APP_DIR."
echo "Start with: sudo systemctl start perfinpy"
echo "Logs: sudo journalctl -u perfinpy -f"
