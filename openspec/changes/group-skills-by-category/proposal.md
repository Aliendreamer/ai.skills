## Why

All 24 skills sit side by side in `skills/`, so the store no longer reads at a glance: workflow skills, frontend
audits, dependency checks and agent-setup tooling are interleaved alphabetically. Grouping them by logical target makes
the tree navigable for authors and lets the CLIs show users the same grouping.

## What Changes

- Skill items move from `skills/<id>/` to `skills/<category>/<id>/`. Initial categories and members:
  - `workflow` — developer-flow, setup-flow, azure-devops-workflow, conventional-commits, complexity-sizing, clear-git,
    daily-activity-log, daily-log-check
  - `frontend` — audit-tv-focus, compact-tv-check, norigin-focus, scaffold-tv-screen, use-effect-guard,
    semantic-html-audit, design-review
  - `dependencies` — audit-package-version, circular-check, monorepo-hygiene
  - `quality` — graphql-audit, web-security-audit, md-files-audit
  - `agent-setup` — context-hooks, llm-setup-audit, skill-optimizer
- The catalog generator scans one category level under `skills/` and emits a new `category` field on skill entries,
  derived from the folder (not frontmatter, so it cannot disagree with the location).
- The validator requires skill entries to carry a known category whose folder matches their `path`; a `SKILL.md`
  placed directly in `skills/<id>/` is reported instead of silently skipped. Ids stay globally unique across
  categories.
- Both CLIs (npx and dotnet) gain `list --category <name>`, show the category in `list` and `info` output.
- Install destinations are unchanged (`<agent>/skills/<id>`, flat). Existing installs keep working, and older CLI
  versions keep working because they install from the catalog's `path` and ignore unknown fields.
- Prompts are unchanged.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `skill-catalog`: skill items live in `skills/<category>/<id>/`; catalog entries gain `category`; validation of
  categories and of ungrouped skill folders.
- `cli`: `list` filters by `--category`; `list`/`info` show the category.

## Impact

- `libs/catalog` — `types.ts` (categories, `category` field), `generate.ts` (two-level scan, serialization order),
  `validate.ts`, and their tests and fixtures.
- `apps/cli-npx` — browse filter and commands; `apps/cli-dotnet` — `CatalogEntry`, browse commands and tests.
- `skills/` — 24 folders moved with `git mv` (history preserved); `catalog.json` regenerated; in-repo references to
  `skills/<id>` paths (README, specs, skill bodies) updated.
- Releases — a new npx and NuGet version to ship the category filter; the catalog change itself is additive.
