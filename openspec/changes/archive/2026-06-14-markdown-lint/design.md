## Context

A strict-defaults markdownlint run over authored docs reported 1063 violations: 591 MD013 (line
length, mostly unwrappable code/table lines), then ~472 structural rules that are largely
auto-fixable (MD022 headings-blanks 165, MD031 fence-blanks 99, MD032 list-blanks 91, MD040
fence-language 27, plus small MD041/MD029/MD004/MD047/MD058). MD033 (inline HTML) did **not**
fire — `<placeholder>` tokens live inside code spans.

## Goals / Non-Goals

**Goals:**
- One committed config; zero warnings across authored docs; a repeatable gate.
- Keep edits purely cosmetic (no meaning changes to skills/prompts).

**Non-Goals:**
- Linting vendored `.claude/*` content or archived openspec changes.
- Prettier-style reflow of prose; wrapping code/tables.

## Decisions

- **markdownlint-cli2** with `.markdownlint-cli2.jsonc` (config + globs + ignores in one file).
- **Rules**: `default: true` (all strict) except
  `MD013: { line_length: 120, code_blocks: false, tables: false }`. This keeps heading, list,
  fence, and spacing discipline while not fighting code/diagram/table lines.
- **Scope via globs**, not a per-project Nx target (markdown spans the repo):
  `skills/**/*.md`, `prompts/**/*.md`, `openspec/specs/**/*.md`, `CLAUDE.md`; ignore
  `node_modules`, `dist`, `.nx`, `.claude/**`, `openspec/changes/archive/**`.
- **Fix strategy**: run `markdownlint-cli2 --fix` first (resolves the spacing/blank-line bulk),
  then hand-fix the residue (add languages to bare ```fences, list-numbering MD029, any MD041).
- **Gate**: root `lint:md` script; add it to the dev-flow Stop hook so a markdown regression is
  caught alongside `nx lint/test`.

## Risks / Trade-offs

- [Autofix touching many files] → changes are whitespace/formatting only; review the diff; content
  diffs stay semantic-free.
- [MD013 at 120 still flags a few long prose lines] → wrap those few by hand; tables/code exempt.
- [New gate slows the Stop hook slightly] → markdownlint-cli2 is fast; acceptable.

## Open Questions

- Whether to also lint prompt/skill bodies for spelling (cspell) later — out of scope here.
