#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ARCH="${1:-all}"

build_target() {
  local target="$1"
  rustup target add "$target"
  npm run tauri -- build --target "$target" --bundles dmg
}

if [[ ! -d node_modules ]]; then
  npm install
fi

case "$ARCH" in
  all)
    build_target x86_64-apple-darwin
    build_target aarch64-apple-darwin
    ;;
  x64|x86_64)
    build_target x86_64-apple-darwin
    ;;
  arm64|aarch64)
    build_target aarch64-apple-darwin
    ;;
  *)
    echo "Usage: $0 [all|x64|arm64]" >&2
    exit 2
    ;;
esac

echo "DMG files:"
find src-tauri/target -path '*/release/bundle/dmg/*.dmg' -type f -print
