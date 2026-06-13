## Why

`ai.skills` will be a store for AI agent skills and app-pattern starter prompts, distributed
by two CLIs (`npx ai-skills` and `dotnet ai-skills`) that copy content straight from this Git
repo. Before any CLI can exist, the repo needs a content convention and a machine-readable
catalog those CLIs consume. This change builds that foundation.

## What Changes

- Initialize an Nx + pnpm workspace at the repo root (no CLI apps yet).
- Define a frontmatter-driven content convention under `skills/` and `prompts/`.
- Add a `libs/catalog` TypeScript library: `CatalogEntry`/`Catalog` types,
  `generateCatalog()`, `validateCatalog()`, and `loadCatalog()`.
- Generate and commit `catalog.json`, derived from the content (never hand-edited).
- Add Nx targets: `generate-catalog`, `validate`, and standard `lint`/`test`/`typecheck`/`build`.
- Add one reference skill and one reference prompt that prove both content types.
- Builds **neither** CLI and adds **no** agent adapters or fetch logic (later sub-projects).

## Capabilities

### New Capabilities
- `skill-catalog`: the content convention (frontmatter schema for skills and prompts), the
  generated `catalog.json` contract, and the library that generates, validates, and loads it.

### Modified Capabilities
<!-- None — this is the first capability in the project. -->

## Impact

- New workspace tooling: `nx.json`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`.
- New source: `libs/catalog/`.
- New content dirs: `skills/`, `prompts/`, plus generated `catalog.json`.
- Dependencies introduced: Nx, TypeScript, a test runner (Vitest), a YAML/frontmatter parser.
- Establishes the `catalog.json` contract that sub-projects 2–4 (adapters, npx CLI, dotnet CLI)
  will consume.
