#!/usr/bin/env bash
# Launch the Azure DevOps MCP server, authenticating with the PAT from a secrets file —
# the single source of truth. No secret is stored in committed config; the token is read at launch
# and exported as PERSONAL_ACCESS_TOKEN (what @azure-devops/mcp expects). The organization is read
# from the secrets file too (no hardcoded org).
#
# All inputs are overridable via env so this works in any repo / CI:
#   ADO_SECRETS  path to the secrets JSON   (default: .claude/secrets.json, relative to repo root)
#   ADO_ORG      Azure DevOps organization  (default: .organization from the secrets file)
#
# secrets file shape: { "AzurePat": "<pat — scope matches mode: Read, or Read & Write>",
#   "AzureEmail": "you@example.com", "organization": "<your-ado-organization>", "mode": "read", ... }
set -euo pipefail

# Resolve repo root from this script's location so cwd doesn't matter.
cd "$(dirname "$0")/../.."

# `ado-mcp-start.sh install` — one-time, idempotent registration with Claude Code: register this
# launcher only if it isn't already registered, then prompt for a restart. With no argument the
# script serves the MCP server (how `claude mcp` invokes it).
if [ "${1:-}" = "install" ]; then
  if claude mcp list 2>/dev/null | grep -q '^azure-devops'; then
    echo "azure-devops already registered — nothing to do."
  else
    claude mcp add azure-devops -- bash "$(pwd)/.claude/scripts/ado-mcp-start.sh"
    echo "Registered azure-devops. Restart Claude Code to load the tools."
  fi
  exit 0
fi

command -v jq >/dev/null 2>&1 || { echo "ado-mcp-start: 'jq' is required but not installed." >&2; exit 1; }

SECRETS=${ADO_SECRETS:-.claude/secrets.json}
if [ ! -f "$SECRETS" ]; then
  echo "ado-mcp-start: $SECRETS not found — create it with AzurePat and organization (or set ADO_SECRETS/ADO_ORG)." >&2
  exit 1
fi

EMAIL=$(jq -r '.AzureEmail // empty' "$SECRETS"); EMAIL=${EMAIL:-$(git config user.email 2>/dev/null || true)}
PAT=$(jq -r '.AzurePat // empty' "$SECRETS")
ORG=${ADO_ORG:-$(jq -r '.organization // empty' "$SECRETS")}
if [ -z "$PAT" ]; then
  echo "ado-mcp-start: AzurePat is empty in $SECRETS." >&2
  exit 1
fi
if [ -z "$ORG" ]; then
  echo "ado-mcp-start: organization is empty — set .organization in $SECRETS or the ADO_ORG env var." >&2
  exit 1
fi

# base64 without line wrapping, portable across GNU (-w0) and BSD/macOS (no -w flag).
PERSONAL_ACCESS_TOKEN=$(printf '%s:%s' "$EMAIL" "$PAT" | base64 | tr -d '\n')
export PERSONAL_ACCESS_TOKEN
exec npx -y @azure-devops/mcp "$ORG" --authentication pat
