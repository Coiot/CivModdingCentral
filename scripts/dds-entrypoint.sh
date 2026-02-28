#!/usr/bin/env sh
set -eu

# Prefer explicit env override first.
if [ "${CMC_DDS_NATIVE_BIN:-}" != "" ] && [ -x "${CMC_DDS_NATIVE_BIN}" ]; then
	exec "$@"
fi

# Make common native encoder paths discoverable.
export PATH="/opt/compressonator:/opt/compressonator/bin:${PATH}"

# Fallback to bundled Compressonator path in the container.
if [ -x "/opt/compressonator/CompressonatorCLI" ]; then
	export CMC_DDS_NATIVE_BIN="/opt/compressonator/CompressonatorCLI"
	echo "Using native DDS encoder: ${CMC_DDS_NATIVE_BIN}"
else
	echo "Native encoder not found; service will use dxt-js backend unless a native binary is configured."
fi

exec "$@"
