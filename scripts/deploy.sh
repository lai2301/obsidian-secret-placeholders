#!/usr/bin/env bash
# Build and copy the plugin into an Obsidian vault for testing.
#
# The target vault is resolved in this order:
#   1. --vault <path>      command-line flag
#   2. $VAULT              environment variable
#   3. scripts/.deploy-local   a gitignored file that sets VAULT=...
# If none is set the script exits with an error - there is no hardcoded
# default, so this file is safe to commit to a public repo.
#
# Usage:
#   VAULT=/path/to/vault ./scripts/deploy.sh  # build once, deploy
#   ./scripts/deploy.sh --vault /path/to/vault
#   ./scripts/deploy.sh --skip-build          # just copy existing main.js
#   ./scripts/deploy.sh --watch               # poll main.js mtime, redeploy on change
#                                             # (run alongside `npm run dev`)
#   ./scripts/deploy.sh --remove-legacy       # also delete v0.1 obsidian-openbao install
#
# To avoid retyping the path, create scripts/.deploy-local (gitignored):
#   echo 'VAULT="$HOME/path/to/your/vault"' > scripts/.deploy-local
#
# The script is idempotent.  It never touches data.json (your settings + the
# encrypted token survive redeploys).

set -euo pipefail

# --- config --------------------------------------------------------------

PLUGIN_ID="secret-placeholders"
LEGACY_PLUGIN_ID="obsidian-openbao"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Resolve VAULT: env var wins; otherwise source the local (untracked) config.
if [[ -z "${VAULT:-}" && -f "$SCRIPT_DIR/.deploy-local" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.deploy-local"
fi
VAULT="${VAULT:-}"

SKIP_BUILD=0
WATCH=0
REMOVE_LEGACY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1 ;;
    --watch) WATCH=1 ;;
    --remove-legacy) REMOVE_LEGACY=1 ;;
    --vault) VAULT="$2"; shift ;;
    -h|--help)
      # Print the leading comment block (up to the first non-comment line).
      awk 'NR==1 {next} /^#/ {sub(/^# ?/, ""); print; next} {exit}' "$0"
      exit 0
      ;;
    *)
      echo "unknown arg: $1" >&2
      exit 2
      ;;
  esac
  shift
done

# --- preflight -----------------------------------------------------------

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

if [[ -z "$VAULT" ]]; then
  echo "ERROR: no target vault set." >&2
  echo "  Set it one of these ways:" >&2
  echo "    VAULT=/path/to/vault ./scripts/deploy.sh" >&2
  echo "    ./scripts/deploy.sh --vault /path/to/vault" >&2
  echo "    echo 'VAULT=\"\$HOME/path/to/vault\"' > scripts/.deploy-local" >&2
  exit 1
fi

if [[ ! -d "$VAULT/.obsidian" ]]; then
  echo "ERROR: $VAULT does not look like an Obsidian vault (no .obsidian/ dir)" >&2
  exit 1
fi

TARGET="$VAULT/.obsidian/plugins/$PLUGIN_ID"

echo "Repo:   $REPO_DIR"
echo "Vault:  $VAULT"
echo "Target: $TARGET"

# --- legacy cleanup (opt-in) --------------------------------------------

if [[ "$REMOVE_LEGACY" == "1" ]]; then
  LEGACY="$VAULT/.obsidian/plugins/$LEGACY_PLUGIN_ID"
  if [[ -d "$LEGACY" ]]; then
    echo "Removing legacy plugin: $LEGACY"
    rm -rf "$LEGACY"
  else
    echo "No legacy plugin folder at $LEGACY (already clean)"
  fi
fi

# --- build + copy --------------------------------------------------------

build() {
  if [[ "$SKIP_BUILD" == "1" ]]; then
    return
  fi
  echo "Building..."
  npm run build --silent
}

deploy() {
  mkdir -p "$TARGET"
  # rsync so we copy ONLY the listed files; never deletes data.json or
  # anything else the user has put in the plugin dir.
  rsync -a --no-perms --no-owner --no-group \
    manifest.json main.js styles.css versions.json \
    "$TARGET/"
  echo "Deployed at $(date '+%H:%M:%S')."
}

build
deploy

# --- watch mode ----------------------------------------------------------

if [[ "$WATCH" == "1" ]]; then
  if [[ ! -f main.js ]]; then
    echo "main.js missing; run \`npm run dev\` in another terminal first." >&2
    exit 1
  fi
  echo
  echo "Watch mode: polling main.js mtime every 2s."
  echo "Run \`npm run dev\` in another terminal to keep main.js fresh."
  echo "Press Ctrl+C to exit."
  LAST=$(stat -c %Y main.js 2>/dev/null || stat -f %m main.js)
  while sleep 2; do
    CUR=$(stat -c %Y main.js 2>/dev/null || stat -f %m main.js)
    if [[ "$CUR" != "$LAST" ]]; then
      LAST="$CUR"
      deploy
    fi
  done
fi

echo
echo "Next step: in Obsidian, Settings -> Community plugins -> reload."
echo "If 'Secret Placeholders' isn't listed yet, click 'Refresh' then enable it."
