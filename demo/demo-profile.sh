#!/bin/zsh
# Starts Zen on a throwaway profile filled with sample spaces, for taking
# screenshots. Each run starts from a fresh profile. Your own profile isn't
# touched, and your normal Zen can stay open.
set -euo pipefail

HERE=${0:A:h}
REPO=${HERE:h}
APP=/Applications/Zen.app
PROFILE="${TMPDIR:-/tmp/}zen-better-spaces-demo"
MARKER="$PROFILE/.zen-better-spaces-demo"

[[ -f "$APP/Contents/Resources/config.js" ]] || { echo "Run ../install.sh first." >&2; exit 1; }

if [[ -e "$PROFILE" ]]; then
  [[ -f "$MARKER" ]] || { echo "$PROFILE exists and isn't a demo profile, leaving it alone." >&2; exit 1; }
  rm -rf "$PROFILE"
fi
mkdir -p "$PROFILE/chrome/JS"
touch "$MARKER"

cat > "$PROFILE/user.js" <<'EOF'
user_pref("zen.welcome-screen.seen", true);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("app.update.auto", false);
EOF

ln -s "$REPO/vendor/fx-autoconfig/utils" "$PROFILE/chrome/utils"
ln -s "$REPO/resources" "$PROFILE/chrome/resources"
ln -s "$REPO/JS/spaces.uc.mjs" "$PROFILE/chrome/JS/spaces.uc.mjs"
ln -s "$HERE/seed.uc.mjs" "$PROFILE/chrome/JS/seed.uc.mjs"

echo "Profile: $PROFILE"
open -n -a "$APP" --args -profile "$PROFILE" -no-remote
