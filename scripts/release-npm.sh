#!/usr/bin/env bash
# Release the npm package: (gates) -> bump + CHANGELOG + tag -> publish npm -> push.
#
# The version bump is taken from the CURRENT shared workspace version and incremented:
# minor by default (e.g. 0.2.0 -> 0.3.0), or patch/major when requested. This sets the
# single shared workspace version; `release:nuget` then ships that same version.
#
# Usage: scripts/release-npm.sh [--patch|--minor|--major] [--no-bump] [--skip-checks]
#   --patch|--minor|--major : which level to bump (default: minor).
#   --no-bump               : publish the current version as-is (e.g. after `pnpm release:version`).
#   --skip-checks           : skip the pre-flight quality gates.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NO_BUMP=0
SKIP_CHECKS=0
LEVEL=minor
for arg in "$@"; do
  case "$arg" in
    --patch)       LEVEL=patch ;;
    --minor)       LEVEL=minor ;;
    --major)       LEVEL=major ;;
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
  # Bump the single shared workspace version from its current value (nx's own commit-based
  # detection is per-project and misses store content in skills/ and prompts/, so we pass the
  # level explicitly). Default is a minor bump, e.g. 0.2.0 -> 0.3.0.
  OLD_VERSION="$(node -p "require('./apps/cli-npx/package.json').version")"
  echo "→ bumping ${LEVEL} from ${OLD_VERSION}…"
  npx nx release "${LEVEL}" --skip-publish
  NEW_VERSION="$(node -p "require('./apps/cli-npx/package.json').version")"
  echo "→ bumped ${LEVEL}: ${OLD_VERSION} → ${NEW_VERSION}"
fi

echo "→ publishing to npm…"
bash scripts/publish-npm.sh

echo "→ pushing commit + tags…"
git push --follow-tags

echo "✓ npm release complete"
