#!/usr/bin/env bash
# Release the npm package: (gates) -> publish to npm -> push commit & tags.
#
# Version + CHANGELOG + tag are created separately by `pnpm release:version`
# (one shared workspace version). Run that first, then this.
#
# Usage: scripts/release-npm.sh [--skip-checks]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_CHECKS=0
for arg in "$@"; do
  case "$arg" in
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

echo "→ publishing to npm…"
bash scripts/publish-npm.sh

echo "→ pushing commit + tags…"
git push --follow-tags

echo "✓ npm release complete"
