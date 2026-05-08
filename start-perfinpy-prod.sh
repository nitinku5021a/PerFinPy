#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if command -v pkill >/dev/null 2>&1; then
  pkill -f "gunicorn.*wsgi:app" >/dev/null 2>&1 || true
  pkill -f "node build" >/dev/null 2>&1 || true
fi

nohup "$SCRIPT_DIR/prod.sh" > "$SCRIPT_DIR/perfinpy-prod.log" 2>&1 &
echo "PerFinPy production services starting. Log: $SCRIPT_DIR/perfinpy-prod.log"
