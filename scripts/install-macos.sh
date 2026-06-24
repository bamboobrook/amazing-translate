#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Amazing Translate"
DEFAULT_REPO="bamboobrook/amazing-translate"
DEFAULT_INSTALL_DIR="$HOME/Applications/AmazingTranslate"

REPO="${AMAZING_TRANSLATE_REPO:-$DEFAULT_REPO}"
INSTALL_DIR="${AMAZING_TRANSLATE_INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"
ZIP_URL="${AMAZING_TRANSLATE_ZIP_URL:-}"
SKIP_OPEN="${AMAZING_TRANSLATE_SKIP_OPEN:-0}"

say() {
  printf '%s\n' "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but was not found."
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  die "This installer is for macOS only."
fi

need_command curl
need_command unzip
need_command ditto
need_command open

if [[ "$INSTALL_DIR" != *"AmazingTranslate"* && "${AMAZING_TRANSLATE_ALLOW_CUSTOM_DIR:-0}" != "1" ]]; then
  die "Refusing to install into '$INSTALL_DIR'. Set AMAZING_TRANSLATE_ALLOW_CUSTOM_DIR=1 if this custom path is intentional."
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/amazing-translate.XXXXXX")"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

curl_args=(-fsSL)
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  curl_args+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
fi

latest_release_json() {
  local api_url="https://api.github.com/repos/${REPO}/releases/latest"
  curl "${curl_args[@]}" "$api_url"
}

json_value() {
  local key="$1"
  sed -nE "s/.*\"${key}\":[[:space:]]*\"([^\"]+)\".*/\\1/p" | head -n 1
}

find_release_zip_url() {
  local release_json="$1"
  printf '%s\n' "$release_json" \
    | sed -nE 's/.*"browser_download_url":[[:space:]]*"([^"[:space:]]*amazing-translate-[^"[:space:]]*\.zip)".*/\1/p' \
    | head -n 1
}

download_zip() {
  local url="$1"
  local output="$2"
  curl "${curl_args[@]}" -fL -o "$output" "$url"
}

if [[ -z "$ZIP_URL" ]]; then
  say "Fetching latest ${APP_NAME} release from ${REPO}..."
  if ! release_json="$(latest_release_json)"; then
    die "Could not read the latest GitHub Release. Make sure the repo has a Release, or set AMAZING_TRANSLATE_ZIP_URL to a direct zip URL."
  fi

  release_tag="$(printf '%s\n' "$release_json" | json_value tag_name || true)"
  ZIP_URL="$(find_release_zip_url "$release_json")"
  [[ -n "$ZIP_URL" ]] || die "No amazing-translate-*.zip asset found in the latest GitHub Release."
else
  release_tag="custom zip"
fi

ZIP_PATH="$TMP_DIR/amazing-translate.zip"
UNPACK_DIR="$TMP_DIR/unpacked"

say "Downloading ${APP_NAME} (${release_tag:-latest})..."
download_zip "$ZIP_URL" "$ZIP_PATH"

say "Unpacking extension..."
mkdir -p "$UNPACK_DIR"
unzip -q "$ZIP_PATH" -d "$UNPACK_DIR"

[[ -f "$UNPACK_DIR/manifest.json" ]] || die "The zip does not look like an unpacked Chrome extension: manifest.json is missing at the zip root."

manifest_name="$(sed -nE 's/.*"name":[[:space:]]*"([^"]+)".*/\1/p' "$UNPACK_DIR/manifest.json" | head -n 1)"
[[ "$manifest_name" == "$APP_NAME" ]] || die "Unexpected extension name in manifest.json: ${manifest_name:-unknown}."

if [[ -e "$INSTALL_DIR" ]]; then
  if [[ -f "$INSTALL_DIR/manifest.json" ]]; then
    installed_name="$(sed -nE 's/.*"name":[[:space:]]*"([^"]+)".*/\1/p' "$INSTALL_DIR/manifest.json" | head -n 1)"
    [[ "$installed_name" == "$APP_NAME" ]] || die "'$INSTALL_DIR' contains a different extension: ${installed_name:-unknown}. Choose another AMAZING_TRANSLATE_INSTALL_DIR."
  elif [[ ! -f "$INSTALL_DIR/.amazing-translate-install" ]]; then
    die "'$INSTALL_DIR' already exists and does not look like an Amazing Translate install directory. Move it aside or choose another AMAZING_TRANSLATE_INSTALL_DIR."
  fi
fi

say "Installing to: $INSTALL_DIR"
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
ditto "$UNPACK_DIR" "$INSTALL_DIR"
touch "$INSTALL_DIR/.amazing-translate-install"

say ""
say "${APP_NAME} files are ready."
say ""
say "Chrome blocks scripts from silently installing unpacked extensions, so finish these manual steps:"
say ""
say "1. In Chrome, open: chrome://extensions/"
say "2. Enable Developer mode in the top-right corner."
say "3. Click Load unpacked."
say "4. Select this folder:"
say "   $INSTALL_DIR"
say "5. Open the Amazing Translate side panel and enter your own DeepSeek or GLM API Key."
say ""
say "For upgrades, run this script again and click Reload on the Amazing Translate card in chrome://extensions/."
say "Keeping the same install path helps Chrome keep the same local extension storage."
say "No API Key is included in this package."

if [[ "$SKIP_OPEN" != "1" ]]; then
  open "$INSTALL_DIR" >/dev/null 2>&1 || true
  open -a "Google Chrome" "chrome://extensions/" >/dev/null 2>&1 || open "chrome://extensions/" >/dev/null 2>&1 || true
fi
