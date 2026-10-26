#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mobility-tracker}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mobility}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
target="$BACKUP_DIR/mobility-$(date +%Y-%m-%d_%H-%M).db"

node -e '
const { DatabaseSync } = require("node:sqlite");
const [src, dst] = process.argv.slice(1);
const db = new DatabaseSync(src, { readOnly: true });
const q = "\x27";
db.exec("VACUUM INTO " + q + dst.split(q).join(q + q) + q);
db.close();
' "$APP_DIR/data/mobility.db" "$target"

gzip "$target"
if [ -d "$APP_DIR/data/uploads" ]; then
  tar -czf "${target%.db}-uploads.tar.gz" -C "$APP_DIR/data" uploads
fi
find "$BACKUP_DIR" -name 'mobility-*' -mtime +"$KEEP_DAYS" -delete
echo "Backup: $target.gz"
