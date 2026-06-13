## Why

The catalog (sub-project 1) and install logic (sub-project 2) exist but nothing exposes them to
users. This change ships the **`npx ai-skills` CLI** so people can browse the store and install
skills into their agent of choice. It also defines the CLI behavior contract that the dotnet CLI
(sub-project 4) will mirror.

## What Changes

- Add an Nx app `apps/cli-npx` published as the npm package `ai-skills` with bin `ai-skills`
  (so `npx ai-skills …` works), built on `commander` + `@inquirer/prompts` + `picocolors`.
- Commands:
  - `list [--type skill|prompt] [--agent <a>]` — browse the catalog.
  - `search <query>` — filter by id / description / tags.
  - `info <id>` — show one entry's details.
  - `add [ids...] [--all] [--agent <a>] [--project|--global] [--yes]` — install skills; with no
    ids and no `--all`, present an interactive multi-select; prompt for agent and scope unless
    given by flags (`--yes` skips prompts using defaults/flags).
- Runtime catalog source: fetch `catalog.json` from
  `raw.githubusercontent.com/<owner>/<repo>/<ref>` (default `Aliendreamer/ai.skills@main`,
  overridable via `--repo` / `--ref` / env). `add` fetches each item via the existing tarball
  `fetchItem`.
- Add a small `parseCatalog(data)` to `@ai-skills/catalog` so a fetched catalog can be validated
  without writing a temp file (backward-compatible; `loadCatalog` reuses it).
- **Scope:** `add` installs **skills** only; `prompt`-type entries are listed/searchable but
  `add` reports that prompt installation is coming in a later release (per the deferred-prompts
  decision).

## Capabilities

### New Capabilities
- `cli`: the command behavior contract — `list`/`search`/`info`/`add`, flag precedence,
  interactive target selection, and skills-only install — shared by both CLIs.

### Modified Capabilities
- `skill-catalog`: ADD a `parseCatalog(data)` entry point (validate an in-memory catalog);
  no existing behavior changes.

## Impact

- New source: `apps/cli-npx/`.
- New dependencies: `commander`, `@inquirer/prompts`, `picocolors`.
- Consumes `@ai-skills/catalog` and `@ai-skills/install`.
- Establishes the `cli` behavior contract for the dotnet CLI (sub-project 4) to mirror.
- Live network paths (catalog fetch, item fetch) are not unit-tested until the repo is published;
  pure logic is tested with injected fetch/install.
