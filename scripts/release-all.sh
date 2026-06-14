#!/usr/bin/env bash
# Release everything in one shot: npm (bumps the single shared version) then NuGet (same version).
#
# Runs the npm release first — it owns the version bump, CHANGELOG, tag, and push — then the NuGet
# release at that same version. Gates run once (in the npm step); the NuGet step skips re-running them.
#
# Usage: scripts/release-all.sh [--patch|--minor|--major] [--no-bump] [--skip-checks]
#   (flags are forwarded to release-npm.sh; default bump is minor)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash scripts/release-npm.sh "$@"
bash scripts/release-nuget.sh --skip-checks

echo "✓ full release complete (npm + nuget)"
