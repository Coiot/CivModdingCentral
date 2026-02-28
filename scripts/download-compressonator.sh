#!/usr/bin/env sh
set -eu

TARGET_DIR="${1:-/opt/compressonator}"
EXPLICIT_URL="${2:-}"
TMP_DIR="$(mktemp -d)"
ARCHIVE_PATH="$TMP_DIR/compressonator.pkg"

cleanup() {
	rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

mkdir -p "$TARGET_DIR"

if [ -n "$EXPLICIT_URL" ]; then
	ASSET_URL="$EXPLICIT_URL"
else
	echo "Resolving latest Compressonator Linux CLI asset from GitHub releases..."
	RELEASE_JSON="$(curl -fsSL https://api.github.com/repos/GPUOpen-Tools/compressonator/releases/latest)"
	ASSET_URL="$(printf '%s' "$RELEASE_JSON" | grep -oE '"browser_download_url":[[:space:]]*"[^"]+"' | sed -E 's/^"browser_download_url":[[:space:]]*"//;s/"$//' | awk '
		BEGIN { IGNORECASE=1 }
		$0 ~ /linux/ && ($0 ~ /cli/ || $0 ~ /command/ || $0 ~ /compressonator/) && ($0 ~ /\.tar\.gz$/ || $0 ~ /\.tgz$/ || $0 ~ /\.zip$/) { print; exit }
	')"
fi

if [ -z "${ASSET_URL:-}" ]; then
	echo "Unable to resolve a Linux CLI release asset from GPUOpen-Tools/compressonator."
	exit 1
fi

echo "Downloading: $ASSET_URL"
curl -fL "$ASSET_URL" -o "$ARCHIVE_PATH"

case "$ASSET_URL" in
*.zip)
	unzip -q "$ARCHIVE_PATH" -d "$TARGET_DIR"
	;;
*.tar.gz|*.tgz)
	tar -xzf "$ARCHIVE_PATH" -C "$TARGET_DIR"
	;;
*)
	echo "Unsupported archive type for $ASSET_URL"
	exit 1
	;;
esac

BIN_PATH="$(find "$TARGET_DIR" -type f -name 'CompressonatorCLI' | head -n 1 || true)"
if [ -z "$BIN_PATH" ]; then
	echo "CompressonatorCLI binary was not found after extracting archive."
	exit 1
fi

if [ "$BIN_PATH" != "$TARGET_DIR/CompressonatorCLI" ]; then
	cp "$BIN_PATH" "$TARGET_DIR/CompressonatorCLI"
fi
chmod +x "$TARGET_DIR/CompressonatorCLI"

echo "CompressonatorCLI ready at $TARGET_DIR/CompressonatorCLI"
