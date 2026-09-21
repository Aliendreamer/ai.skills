#!/usr/bin/env bash
# Publish the bundled npx CLI (@aliendreamer/ai-skills) to npm.
# Reads npm_token from config.conf (git-crypt keeps the working copy plaintext locally).
# If the current version is already on npm, this bumps (minor) first, then publishes the new
# version — so it never dead-ends on "already published". Leaves the release commit/tag local;
# run `git push --follow-tags` after (or use `pnpm release:npm`, which also pushes).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[ -f config.conf ] || { echo "✗ config.conf not found — unlock git-crypt first." >&2; exit 1; }

# Read a KEY=VALUE from config.conf without executing the file.
conf() { grep -E "^$1=" config.conf | head -1 | cut -d= -f2- | tr -d '\r'; }

# `|| true` matters: conf() ends in a pipeline, and under `set -euo pipefail` a grep that matches
# nothing makes the assignment fail, so the script would exit 1 with NO message and the guard below
# would never run. That is exactly what a locked git-crypt looks like from here.
NPM_TOKEN="$(conf npm_token || true)"
[ -n "$NPM_TOKEN" ] || {
  echo "✗ npm_token not found in config.conf." >&2
  echo "  If config.conf is still git-crypt encrypted, unlock it first: git-crypt unlock" >&2
  exit 1
}
export NPM_TOKEN   # apps/cli-npx/.npmrc references ${NPM_TOKEN}

# npm versions are immutable — if the current version is already published, bump (minor) first so
# this run publishes a NEW version. Bump BEFORE build so the bundled artifact carries the new version.
VERSION="$(node -p "require('./apps/cli-npx/package.json').version")"
if npm view "@aliendreamer/ai-skills@${VERSION}" version >/dev/null 2>&1; then
  echo "→ ${VERSION} already on npm — bumping (minor) first…"
  npx nx release minor --skip-publish
  VERSION="$(node -p "require('./apps/cli-npx/package.json').version")"
  echo "→ bumped to ${VERSION}"
fi

echo "→ building bundled package…"
npx nx run cli-npx:build

echo "→ publishing @aliendreamer/ai-skills@${VERSION} to npm…"
( cd apps/cli-npx && npm publish )
echo "✓ npm publish complete"
