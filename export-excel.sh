#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PY="$SCRIPT_DIR/venv/bin/python"

if [ ! -x "$PY" ]; then
  PY=python3
fi

exec "$PY" "$SCRIPT_DIR/export-excel.py" "$@"
