#!/bin/bash
set -euo pipefail
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This build requires macOS 12 or later and Xcode Command Line Tools." >&2
  exit 1
fi
if ! xcrun --find swiftc >/dev/null 2>&1; then
  echo "Install Xcode Command Line Tools with: xcode-select --install" >&2
  exit 1
fi
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/output"
APP="$OUT/Canopy Browser.app"
ICONSET="$OUT/AppIcon.iconset"
mkdir -p "$OUT"
rm -rf "$APP" "$ICONSET"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$ICONSET"
cp "$HERE/Resources/Info.plist" "$APP/Contents/Info.plist"
MACOSX_DEPLOYMENT_TARGET=12.0 xcrun swiftc -O -framework Cocoa -framework WebKit "$HERE/Sources/main.swift" -o "$APP/Contents/MacOS/CanopyBrowser"
xcrun swift "$HERE/Sources/IconGenerator.swift" "$ICONSET"
xcrun iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"
rm -rf "$ICONSET"
echo "Built: $APP"
echo "Open it with: open \"$APP\""
