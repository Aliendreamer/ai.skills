#!/usr/bin/env bash
# Release the npm package: (gates) -> auto-bump + CHANGELOG + tag -> publish npm -> push.
#
# The version bump is derived automatically from Conventional Commits since the last tag
# (a `feat:` bumps minor, a `fix:` bumps patch, `!`/BREAKING bumps major). This sets the
# single shared workspace version; `release:nuget` then ships that same version.
#
# Usage: scripts/release-npm.sh [--no-bump] [--skip-checks]
#   --no-bump     : publish the current version as-is (e.g. after `pnpm release:version`).
#   --skip-checks : skip the pre-flight quality gates.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NO_BUMP=0
SKIP_CHECKS=0
for arg in "$@"; do
  case "$arg" in
    --no-bump)     NO_BUMP=1 ;;
    --skip-checks) SKIP_CHECKS=1 ;;
    *) echo "✗ unknown arg: $arg" >&2; exit 2 ;;
  esac
done

if [ "$SKIP_CHECKS" -eq 0 ]; then
  echo "→ gates (lint, test, build, typecheck, markdownlint, catalog)…"
  npx nx run-many -t lint test build typecheck
  pnpm lint:md
  npx nx run catalog:validate
fi

if [ "$NO_BUMP" -eq 0 ]; then
  # nx's own detection is per-project (only apps/cli-npx/**); store content lives in skills/ and
  # prompts/, so derive the bump from REPO-WIDE conventional commits and pass it explicitly.
  last_tag="$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || true)"
  range="${last_tag:+$last_tag..}HEAD"
  log="$(git log $range --format='%s%n%b')"
  if printf '%s' "$log" | grep -qE '^[a-z]+(\([^)]*\))?!:|BREAKING CHANGE'; then
    spec=major
  elif printf '%s' "$log" | grep -qE '^feat(\([^)]*\))?:'; then
    spec=minor
  elif printf '%s' "$log" | grep -qE '^fix(\([^)]*\))?:'; then
    spec=patch
  else
    echo "• no releasable (feat/fix/breaking) commits since ${last_tag:-the start} — nothing to publish"
    exit 0
  fi
  echo "→ bumping ${spec} (repo-wide conventional commits since ${last_tag:-start})…"
  npx nx release "${spec}" --skip-publish
fi

echo "→ publishing to npm…"
bash scripts/publish-npm.sh

echo "→ pushing commit + tags…"
git push --follow-tags

echo "✓ npm release complete"
