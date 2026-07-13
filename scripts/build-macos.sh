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
  local arch_suffix="$2"
  rustup target add "$target"
  npm run tauri -- build --target "$target" --bundles app,dmg

  local bundle_dir="$ROOT_DIR/src-tauri/target/$target/release/bundle"
  local dmg_dir="$bundle_dir/dmg"
  local dmg_script="$dmg_dir/bundle_dmg.sh"
  local app_dir="$bundle_dir/macos"
  local staging_dir
  local version
  version="$(node -p "require('./package.json').version")"
  local dmg_path="$dmg_dir/Mineradio_${version}_${arch_suffix}.dmg"
  staging_dir="$(mktemp -d "${TMPDIR:-/tmp}/mineradio-dmg.XXXXXX")"

  rm -f "$dmg_path"
  if "$dmg_script" \
      --volname "Mineradio $version" \
      --background "$ROOT_DIR/build/dmg-background.jpg" \
      --window-size 660 400 \
      --icon-size 96 \
      --add-folder "Mineradio.app" "$app_dir/Mineradio.app" 180 190 \
      --hide-extension "Mineradio.app" \
      --app-drop-link 480 190 \
      --add-file "安装前必看.txt" "$ROOT_DIR/build/安装前必看.txt" 330 305 \
      "$dmg_path" \
      "$staging_dir"; then
    rm -rf "$staging_dir"
  else
    local status=$?
    rm -rf "$staging_dir"
    return "$status"
  fi
}

if [[ ! -d node_modules ]]; then
  npm install
fi

case "$ARCH" in
  all)
    build_target x86_64-apple-darwin x64
    build_target aarch64-apple-darwin aarch64
    ;;
  x64|x86_64)
    build_target x86_64-apple-darwin x64
    ;;
  arm64|aarch64)
    build_target aarch64-apple-darwin aarch64
    ;;
  *)
    echo "Usage: $0 [all|x64|arm64]" >&2
    exit 2
    ;;
esac

node scripts/create-update-manifest.mjs "$ARCH"
