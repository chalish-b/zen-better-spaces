#!/bin/zsh
# Installs fx-autoconfig into Zen and links this folder's scripts into the
# default Zen profile. Safe to rerun, which is needed after every Zen update.
set -euo pipefail

HERE=${0:A:h}
APP=/Applications/Zen.app/Contents/Resources
ZEN_DIR="$HOME/Library/Application Support/zen"
PROFILE_REL=$(awk -F= '/^Default=/{print $2; exit}' "$ZEN_DIR/installs.ini")
PROFILE="$ZEN_DIR/$PROFILE_REL"
CHROME="$PROFILE/chrome"
CACHE="$HOME/Library/Caches/zen/$PROFILE_REL/startupCache"

if pgrep -x zen >/dev/null; then
  echo "Quit Zen first." >&2
  exit 1
fi
[[ -d "$PROFILE" ]] || { echo "Profile not found: $PROFILE" >&2; exit 1; }

echo "App:     $APP"
echo "Profile: $PROFILE"

# Program files. These live inside the app bundle, so Zen updates remove them.
mkdir -p "$APP/defaults/pref"
cp "$HERE/vendor/fx-autoconfig/program/config.js" "$APP/config.js"
cp "$HERE/vendor/fx-autoconfig/program/defaults/pref/config-prefs.js" "$APP/defaults/pref/config-prefs.js"

# Profile folders, linked so edits here are picked up on the next restart.
mkdir -p "$CHROME"
link() {
  local target=$1 name=$2
  if [[ -L "$CHROME/$name" ]]; then
    rm "$CHROME/$name"
  elif [[ -e "$CHROME/$name" ]]; then
    echo "$CHROME/$name already exists and isn't a link, leaving it alone." >&2
    exit 1
  fi
  ln -s "$target" "$CHROME/$name"
}
link "$HERE/vendor/fx-autoconfig/utils" utils
link "$HERE/JS" JS
link "$HERE/resources" resources

rm -rf "$CACHE"
echo "Done. Start Zen."
