#!/usr/bin/env bash
# TestFlight Build 3a — Archive on Mac (Xcode 26). Upload via Organizer or altool.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="ios/App/App.xcodeproj"
SCHEME="App"
ARCHIVE_PATH="$ROOT/build/BetterBit-Build${IOS_BUILD_NUMBER:-5}.xcarchive"

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "[FAIL] xcodebuild not found. Run on Mac with Xcode installed."
  exit 1
fi

echo "=== Xcode ==="
xcodebuild -version

echo ""
echo "=== Prep (test + build + cap:sync) ==="
node scripts/testflight-prep.mjs

mkdir -p "$ROOT/build"

echo ""
echo "=== Archive ==="
xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  archive

echo ""
echo "[OK] Archive: $ARCHIVE_PATH"
echo ""
echo "Upload:"
echo "  1. open $ARCHIVE_PATH  (opens Organizer)"
echo "  2. Distribute App → App Store Connect → Upload"
echo ""
echo "Or CLI (requires API key / app-specific password configured):"
echo "  xcodebuild -exportArchive -archivePath \"$ARCHIVE_PATH\" -exportPath \"$ROOT/build/export\" -exportOptionsPlist ExportOptions.plist"
