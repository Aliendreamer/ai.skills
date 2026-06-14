#!/usr/bin/env bash
# Release the dotnet tool: (gates) -> pack + push to NuGet -> push commit & tags.
#
# This does NOT bump the version — it ships the single shared workspace version that
# `release:npm` (or `pnpm release:version`) already set, read from the npm package.
# So run `pnpm release:npm` (or `release:version`) first. Requires nuget_key in config.conf.
#
# Usage: scripts/release-nuget.sh [--skip-checks]
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

echo "→ publishing to NuGet…"
bash scripts/publish-nuget.sh

echo "→ pushing commit + tags…"
git push --follow-tags

echo "✓ nuget release complete"
