## Why

The repo's authored markdown (skills, prompts, specs, CLAUDE.md) has no style enforcement and
currently trips ~1063 markdownlint violations. We want a committed markdown style config and
**zero warnings** across our authored docs, enforced as a gate.

## What Changes

- Add **markdownlint-cli2** (dev dependency) and a committed config `.markdownlint-cli2.jsonc`:
  all markdownlint **defaults strict**, with the single exception **MD013** set to
  `line_length: 120` and exempt for **code blocks and tables** (the only rule incompatible with
  code/diagram/table content; MD033 inline-HTML already passes since placeholders live in code spans).
- Add `lint:md` / `lint:md:fix` scripts and wire markdown lint into the dev-flow quality gate.
- **Fix all authored markdown to zero warnings** (autofix where possible; hand-fix the rest:
  code-fence languages, list numbering, first-line headings, etc.).
- **Scope:** `skills/`, `prompts/`, `openspec/specs/`, `CLAUDE.md`. **Excluded:** vendored
  `.claude/skills` & `.claude/commands` (from openspec/dev-flow) and `openspec/changes/archive/**`
  (historical records).

## Capabilities

### New Capabilities
- `markdown-quality`: a committed markdown lint config and a zero-warning gate over authored docs.

### Modified Capabilities
<!-- None. -->

## Impact

- New: `.markdownlint-cli2.jsonc`, `markdownlint-cli2` devDependency, `lint:md` scripts, gate wiring.
- Edits across authored `.md` files to satisfy the rules (formatting only — no semantic changes).
- Future markdown is held to the same gate.
