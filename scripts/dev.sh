#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
PATH="$ROOT_DIR/scripts:$PATH"

(cd "$ROOT_DIR/web" && corepack pnpm dev) &
WEB_PID="$!"
trap 'kill "$WEB_PID" 2>/dev/null || true' EXIT

cd "$ROOT_DIR"
corepack pnpm dev:server
