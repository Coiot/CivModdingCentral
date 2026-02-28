#!/usr/bin/env sh
set -eu

TARGET_DIR="${1:-/opt/compressonator}"
EXPLICIT_URL="${2:-}"
TMP_DIR="$(mktemp -d)"
ARCHIVE_PATH="$TMP_DIR/compressonator.pkg"
USER_AGENT="cmc-dds-converter/1.0"

cleanup() {
	rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

mkdir -p "$TARGET_DIR"

if [ -n "$EXPLICIT_URL" ]; then
	ASSET_URL="$EXPLICIT_URL"
else
	echo "Resolving latest Compressonator Linux CLI asset from GitHub releases (API first, then HTML fallback)..."
	RELEASE_JSON="$(curl -fsSL -H "User-Agent: $USER_AGENT" https://api.github.com/repos/GPUOpen-Tools/compressonator/releases/latest || true)"
	ASSET_URL="$(printf '%s' "$RELEASE_JSON" | grep -oE '"browser_download_url":[[:space:]]*"[^"]+"' | sed -E 's/^"browser_download_url":[[:space:]]*"//;s/"$//' | awk '
		BEGIN { IGNORECASE=1 }
		$0 ~ /linux/ && $0 ~ /compressonator/ && ($0 ~ /\.tar\.gz$/ || $0 ~ /\.tgz$/ || $0 ~ /\.zip$/) { print; exit }
	')"
	if [ -z "${ASSET_URL:-}" ]; then
		LATEST_HTML="$(curl -fsSL -H "User-Agent: $USER_AGENT" https://github.com/GPUOpen-Tools/compressonator/releases/latest || true)"
		ASSET_PATH="$(printf '%s' "$LATEST_HTML" | grep -oE '/GPUOpen-Tools/compressonator/releases/download/[^"]*Linux[^"]*\.(tar\.gz|tgz|zip)' | head -n 1 || true)"
		if [ -n "$ASSET_PATH" ]; then
			ASSET_URL="https://github.com${ASSET_PATH}"
		fi
	fi
fi

if [ -z "${ASSET_URL:-}" ]; then
	echo "Unable to resolve a Linux CLI release asset from GPUOpen-Tools/compressonator."
	echo "Provide a build arg COMPRESSONATOR_TARBALL_URL with a direct asset URL."
	exit 1
fi

echo "Downloading: $ASSET_URL"
curl -fL -H "User-Agent: $USER_AGENT" "$ASSET_URL" -o "$ARCHIVE_PATH"

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

BIN_PATH="$(
	find "$TARGET_DIR" -type f \( -iname 'CompressonatorCLI' -o -iname 'compressonatorcli' -o -iname '*compressonator*cli*' \) | head -n 1 || true
)"
if [ -z "$BIN_PATH" ]; then
	echo "Contents extracted under $TARGET_DIR:"
	find "$TARGET_DIR" -maxdepth 4 -type f | sed -n '1,120p' || true
	echo "CompressonatorCLI binary was not found after extracting archive."
	exit 1
fi

if [ "$BIN_PATH" != "$TARGET_DIR/CompressonatorCLI" ]; then
	cp "$BIN_PATH" "$TARGET_DIR/CompressonatorCLI"
fi
chmod +x "$TARGET_DIR/CompressonatorCLI"

echo "CompressonatorCLI ready at $TARGET_DIR/CompressonatorCLI"
