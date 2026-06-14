#!/usr/bin/env bash
# Publish the bundled npx CLI (@aliendreamer/ai-skills) to npm.
# Reads npm_token from config.conf (git-crypt keeps the working copy plaintext locally).
# Run AFTER `pnpm release:version` has set the version + tag.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[ -f config.conf ] || { echo "✗ config.conf not found — unlock git-crypt first." >&2; exit 1; }

# Read a KEY=VALUE from config.conf without executing the file.
conf() { grep -E "^$1=" config.conf | head -1 | cut -d= -f2- | tr -d '\r'; }

NPM_TOKEN="$(conf npm_token)"
[ -n "$NPM_TOKEN" ] || { echo "✗ npm_token missing in config.conf" >&2; exit 1; }
export NPM_TOKEN   # apps/cli-npx/.npmrc references ${NPM_TOKEN}

echo "→ building bundled package…"
npx nx run cli-npx:build

VERSION="$(node -p "require('./apps/cli-npx/package.json').version")"
echo "→ publishing @aliendreamer/ai-skills@${VERSION} to npm…"
( cd apps/cli-npx && npm publish )
echo "✓ npm publish complete"
