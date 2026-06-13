## Why

The catalog (sub-project 1) describes what's in the store; the CLIs (sub-projects 3–4) need a
shared, tested way to take a catalog entry and put it on disk in the right place for a given
agent. This change defines that contract and provides a reference TypeScript implementation, so
the `npx` and `dotnet` CLIs install skills identically.

## What Changes

- Add a `libs/install` TypeScript library with three concerns:
  - **Agent adapters** — resolve the destination path for a skill given an agent and scope
    (project vs global). Supported skill targets: `claude`, `codex`, `copilot`, `cursor`.
  - **GitHub fetch** — download a repo tarball from `codeload.github.com` and extract a single
    item subpath, with no dependency on `git`.
  - **Skill install** — copy a fetched skill into the resolved destination (folder copy for
    claude/codex/copilot; single `.mdc` file for cursor).
- Document the contract as the `skill-install` capability so the dotnet CLI can mirror it.
- **Scope:** skills only. Prompt distribution (which needs per-agent format wrapping — Gemini
  TOML, Cursor `.mdc`, Copilot `.prompt.md`) is deferred to a later change. Gemini is excluded
  from skill targets (it has no native skills concept).

## Capabilities

### New Capabilities
- `skill-install`: agent destination resolution, GitHub tarball fetch of an item subpath, and
  installing a skill into a target agent's directory (project or global scope).

### Modified Capabilities
<!-- None. Consumes the existing skill-catalog capability without changing it. -->

## Impact

- New source: `libs/install/`.
- Consumes `@ai-skills/catalog` (`CatalogEntry`, `Agent`).
- Establishes the install contract that sub-projects 3 (npx CLI) and 4 (dotnet CLI) implement.
- No new runtime dependencies expected beyond Node built-ins and a tar extractor.
