#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mobility-tracker}"

sudo -u mobility git -C "$APP_DIR" pull --ff-only
sudo systemctl restart mobility
sleep 1
systemctl --no-pager --lines=5 status mobility
