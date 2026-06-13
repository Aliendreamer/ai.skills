## Context

`@ai-skills/catalog` provides `loadCatalog`/`validateCatalog`/types; `@ai-skills/install`
provides `resolveSkillDestination`/`fetchItem`/`installSkill`. This change adds the user-facing
CLI that ties them together. The store is the GitHub repo, so the CLI reads `catalog.json` over
HTTP and fetches items as tarballs — no clone required.

## Goals / Non-Goals

**Goals:**
- A thin `commander` program with `list`/`search`/`info`/`add`; all real logic in pure,
  unit-tested functions independent of argv, network, and prompts.
- Interactive UX (multi-select of items, agent + scope prompts) via `@inquirer/prompts`, skipped
  by explicit flags and `--yes`.
- Network seams (`fetchCatalog`, item fetch) and install injected so the core is testable
  offline.

**Non-Goals:**
- Prompt installation (deferred); `add` of a prompt prints a "coming later" notice.
- `remove`/`update` commands (future).
- Publishing to npm (a release concern, sub-project handled by Nx Release later).

## Decisions

- **commander + @inquirer/prompts + picocolors** — chosen for maturity and a clean interactive
  story. Alternatives (yargs/prompts, clipanion) rejected as no better for this size.
- **Layered structure**: `core/` holds pure functions (`filterEntries`, `findEntry`,
  `resolveAddTargets`, `catalogRawUrl`, `fetchCatalog`, `addSkills`); `commands/` are thin
  adapters that parse flags, run prompts, and call `core`; `main.ts` wires commander. Only
  `core/` is unit-tested.
- **`addSkills` takes injected `fetchItem` and `installSkill`** (defaulting to the real ones) so
  orchestration — including the prompt-type skip and per-item success/failure — is tested without
  network or disk side effects beyond a temp dir.
- **Add `parseCatalog(data: unknown): Catalog` to `@ai-skills/catalog`**, validating structure
  and throwing on problems; `loadCatalog` becomes `parseCatalog(JSON.parse(readFile()))`. Keeps
  one validation path for file and network sources.
- **Flag precedence**: explicit `--agent`/`--project`/`--global` win; otherwise prompt; `--yes`
  requires the needed flags or uses defaults (agent has no default → error if missing under
  `--yes`; scope defaults to `project`).
- **Store config**: `--repo <owner/repo>` and `--ref <ref>` override defaults
  (`Aliendreamer/ai.skills`, `main`); also read from `AI_SKILLS_REPO` / `AI_SKILLS_REF`.

## Risks / Trade-offs

- [Repo not published yet] → catalog/item fetch can't run live; mitigate by testing pure logic
  with injected seams and a recorded catalog fixture. Live smoke test once published.
- [Interactive code is hard to test] → keep prompt calls out of `core/`; handlers stay trivial.
- [`add` of prompts] → explicit, friendly deferral message rather than silent skip.

## Open Questions

- Output formatting polish (tables/colors) — treat as cosmetic; not spec'd in detail.
