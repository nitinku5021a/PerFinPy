#!/usr/bin/env sh
set -eu

# First-run interactive setup (writes .env locally).
python3 "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/install-wizard.py"

cat <<'EOF'

Setup complete. You can now run:
  ./prod.sh   (production-style)
EOF

