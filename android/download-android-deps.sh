#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LIBS="$ROOT/app/libs"
mkdir -p "$LIBS"
FILE="$LIBS/sherpa-onnx-static-link-onnxruntime-1.13.8.aar"
URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.8/sherpa-onnx-static-link-onnxruntime-1.13.8.aar"
SHA256="b22c3fc1b6a45666d28892bb2f7694beeb77a8362d7ebd77c1a5431ec9435471"

if [[ -f "$FILE" ]] && echo "$SHA256  $FILE" | sha256sum --check --status; then
  echo "Pinned sherpa-onnx AAR already present."
  exit 0
fi
TMP="$FILE.part"
rm -f "$TMP"
curl --fail --location --retry 3 --output "$TMP" "$URL"
echo "$SHA256  $TMP" | sha256sum --check
mv "$TMP" "$FILE"
echo "Downloaded and verified sherpa-onnx 1.13.8 static AAR."
