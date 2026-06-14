#!/usr/bin/env bash
# Pack + push the dotnet tool (AiSkills.Cli) to NuGet.
# Reads nuget_key from config.conf (git-crypt keeps the working copy plaintext locally).
# Run AFTER `pnpm release:version` has set the version. Version is taken from the npm
# package so npm + NuGet stay in lockstep.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[ -f config.conf ] || { echo "✗ config.conf not found — unlock git-crypt first." >&2; exit 1; }

conf() { grep -E "^$1=" config.conf | head -1 | cut -d= -f2- | tr -d '\r'; }

NUGET_KEY="$(conf nuget_key)"
[ -n "$NUGET_KEY" ] || { echo "✗ nuget_key missing in config.conf (add: nuget_key=...)" >&2; exit 1; }

VERSION="$(node -p "require('./apps/cli-npx/package.json').version")"
echo "→ packing AiSkills.Cli@${VERSION}…"
dotnet pack apps/cli-dotnet/AiSkills.slnx -c Release -p:Version="$VERSION" -o apps/cli-dotnet/dist
echo "→ pushing to NuGet…"
dotnet nuget push "apps/cli-dotnet/dist/"*.nupkg \
  -s https://api.nuget.org/v3/index.json -k "$NUGET_KEY" --skip-duplicate
echo "✓ nuget push complete"
