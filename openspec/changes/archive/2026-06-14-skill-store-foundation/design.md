## Context

`ai.skills` is a store for AI agent skills and app-pattern prompts. The Git repo is the store;
two CLIs (later sub-projects) will fetch content from GitHub and copy it into a user's project
or home config. This change builds the foundation only: the workspace, the content convention,
and the catalog library both CLIs will consume. Toolchain available: Node 24, pnpm, .NET 10
(unused here). Repo already has OpenSpec and Serena configured.

## Goals / Non-Goals

**Goals:**
- An Nx + pnpm workspace later CLI apps slot into.
- Frontmatter as the single source of truth for item metadata.
- A generated, committed, deterministic `catalog.json`.
- `libs/catalog` with typed generate / validate / load functions, tested via TDD.
- One reference skill + one reference prompt.

**Non-Goals:**
- No CLIs, agent adapters, or GitHub fetch logic.
- No `.NET` solution (added with the dotnet CLI).
- No content beyond the two reference items.

## Decisions

- **Nx + pnpm monorepo** (vs. lightweight pnpm-only or separate repos). Matches the team's
  existing PersonalCommandCenter tooling and dev-flow gates; gives an affected graph and Nx
  Release later. Cost: heavier setup, accepted.
- **Frontmatter is the source of truth; `catalog.json` is generated** (vs. a hand-maintained
  catalog). Eliminates drift between content and catalog. A CI up-to-date check guarantees the
  committed catalog matches the content.
- **`catalog.json` is committed** (vs. generated on demand). Lets the CLIs fetch a single file
  from GitHub without running a build, and makes catalog diffs reviewable.
- **TypeScript library, Vitest tests** (vs. building the catalog inside a future CLI). The
  contract is defined once and reused by the npx CLI directly and mirrored by the dotnet CLI.
- **Deterministic serialization** — stable key order + trailing newline — so regeneration
  produces no spurious diffs and the up-to-date check is reliable.
- **Frontmatter parser**: use `gray-matter` (YAML frontmatter) — mature, zero-config.

## Risks / Trade-offs

- [Nx overhead for a small foundation] → Accepted; the project grows into 4 more sub-projects
  that benefit from the monorepo.
- [Committed `catalog.json` can go stale] → Mitigated by the `validate` target's up-to-date
  check failing CI if regeneration would change the file.
- [Frontmatter schema drift as new agents/types appear] → `validateCatalog` centralizes the
  allowed `type`/`agents` sets; extending them is a one-place change with tests.
- [Path portability across OSes] → Store `path` as POSIX-style relative paths in the catalog.

## Open Questions

- npm package name `ai-skills` vs scoped `@aliendreamer/ai-skills` — deferred to publish time
  (sub-project 3); does not affect this foundation.
