#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ARCH="${1:-all}"

cleanup_build_dmg_mounts() {
  local image_path=""
  local device=""
  while IFS= read -r line; do
    case "$line" in
      image-path*)
        image_path="${line#*: }"
        device=""
        ;;
      /dev/disk*)
        if [[ -z "$device" ]]; then device="${line%%[[:space:]]*}"; fi
        ;;
      ===*)
        if [[ "$image_path" == "$ROOT_DIR"/src-tauri/target/*/rw.*.dmg && -n "$device" ]]; then
          hdiutil detach "$device" -force >/dev/null 2>&1 || true
        fi
        image_path=""
        device=""
        ;;
    esac
  done < <(hdiutil info; echo "================================================")
}

trap cleanup_build_dmg_mounts EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

node scripts/sync-version.mjs

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

node scripts/create-update-manifest.mjs "$ARCH"
