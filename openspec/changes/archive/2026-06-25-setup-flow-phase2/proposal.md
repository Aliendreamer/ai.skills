## Why

`setup-flow` previously only injected a MANDATORY workflow block into the agent's instruction file
(CLAUDE.md, AGENTS.md, etc.). Developers onboarding a new repo also need `.claude/settings.json`
configured with the right Serena MCP server, sandbox rules, pre-approved permissions, dev-flow hooks,
and plugins — and today that is a manual, error-prone step done differently each time.

## What Changes

- Add **Phase 2** to `skills/setup-flow/SKILL.md`: a `.claude/settings.json` configuration flow that
  runs immediately after Phase 1 (instruction-file injection).
- Phase 2 detects project type (npm, .NET, Python, Rust, Go) and builds tailored sandbox domain/path
  lists; falls back to a curated npm+Python baseline when nothing is detected.
- Phase 2 detects prettier presence and conditionally includes a PostToolUse formatting hook.
- Phase 2 discovers available plugins from the environment and asks the user which to enable.
- Phase 2 is merge-safe: when `.claude/settings.json` already exists, it asks merge vs. replace and
  unions lists without overwriting existing root flags.
- Bump skill version `0.1.0` → `0.2.0`; regenerate `catalog.json`.

## Capabilities

### Modified Capabilities

- **setup-flow** — extended with Phase 2; now covers both instruction-file and settings.json setup in
  a single invocation.

## Impact

- `skills/setup-flow/SKILL.md` — +263 lines (Phase 2 section + frontmatter update).
- `catalog.json` — regenerated (version, description, tags updated for setup-flow entry).
- No TypeScript, no new dependencies, no other files changed.
