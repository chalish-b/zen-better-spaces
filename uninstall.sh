#!/bin/zsh
# Removes everything install.sh added. The profile's other files are untouched.
set -euo pipefail

APP=/Applications/Zen.app/Contents/Resources
ZEN_DIR="$HOME/Library/Application Support/zen"
PROFILE_REL=$(awk -F= '/^Default=/{print $2; exit}' "$ZEN_DIR/installs.ini")
CHROME="$ZEN_DIR/$PROFILE_REL/chrome"
CACHE="$HOME/Library/Caches/zen/$PROFILE_REL/startupCache"

if pgrep -x zen >/dev/null; then
  echo "Quit Zen first." >&2
  exit 1
fi

rm -f "$APP/config.js" "$APP/defaults/pref/config-prefs.js"
rmdir "$APP/defaults/pref" "$APP/defaults" 2>/dev/null || true
for name in utils JS resources; do
  [[ -L "$CHROME/$name" ]] && rm "$CHROME/$name"
done
rm -rf "$CACHE"
echo "Removed."
