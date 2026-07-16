#!/usr/bin/env bash
# Builds a Chrome Web Store-ready zip containing only what the extension needs
# to run. Docs, source tooling, and git history are excluded — the store package
# is the shipped artifact, not the repo.
set -euo pipefail

cd "$(dirname "$0")"

VERSION=$(grep -o '"version": *"[^"]*"' manifest.json | cut -d'"' -f4)
OUT="gloss-${VERSION}.zip"
STAGE=$(mktemp -d)

# Ship list. Anything not named here does not go in the package.
FILES=(manifest.json background.js content.js options.html options.js)
DIRS=(icons)

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || { echo "missing: $f"; exit 1; }
  cp "$f" "$STAGE/"
done
for d in "${DIRS[@]}"; do
  [[ -d "$d" ]] || { echo "missing: $d/"; exit 1; }
  cp -r "$d" "$STAGE/"
done

rm -f "$OUT"
# Zip from inside the staging dir so the archive has no wrapping folder —
# Chrome rejects packages where manifest.json isn't at the root.
(cd "$STAGE" && zip -rq "$OLDPWD/$OUT" . -x '.*' '*/.*')
rm -rf "$STAGE"

echo "built $OUT ($(du -h "$OUT" | cut -f1))"
echo
# -Z1 lists bare entry names, one per line, identically on macOS and Linux.
# Captured up front rather than piped: `grep -q` exits on first match, which
# SIGPIPEs unzip, which `set -o pipefail` then reports as a failed pipeline.
LIST=$(unzip -Z1 "$OUT")

echo "contents:"
echo "$LIST" | sort | sed 's/^/  /'
echo

if grep -qx 'manifest.json' <<< "$LIST"; then
  echo "manifest.json is at the root — good"
else
  echo "manifest.json is NOT at the root — Chrome will reject this"
  exit 1
fi
