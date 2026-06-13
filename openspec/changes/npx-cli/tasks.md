## 1. App setup

- [x] 1.1 Create Nx app `apps/cli-npx` (package.json name `ai-skills`, bin `ai-skills`, tsconfig, vitest, project.json with lint/test/typecheck/build) building an executable entry
- [x] 1.2 Add deps `commander`, `@inquirer/prompts`, `picocolors`; depend on `@ai-skills/catalog` and `@ai-skills/install`

## 2. Catalog parse seam (TDD)

- [x] 2.1 Write failing tests for `parseCatalog(data)` (valid object → Catalog; invalid → throws)
- [x] 2.2 Add `parseCatalog` to `libs/catalog` (via Serena) and make `loadCatalog` delegate to it; tests green

## 3. CLI core — browse (TDD)

- [x] 3.1 Write failing tests for `filterEntries(catalog, {type, query})`, `findEntry`, and `catalogRawUrl(owner, repo, ref)` / repo+ref resolution incl. `--repo`/`--ref`/env
- [x] 3.2 Implement `core/catalog.ts` (url + fetchCatalog seam) and `core/browse.ts`; tests green

## 4. CLI core — add (TDD)

- [x] 4.1 Write failing tests for `resolveAddTargets(entries, ids, {all})` (unknown id error; --all selects all) and `addSkills(targets, {agent, scope, bases, fetchItem, installSkill})` (skills installed via injected seams; prompts deferred; --yes-without-agent error surfaced by the resolver)
- [x] 4.2 Implement `core/add.ts` with injected fetch/install seams; tests green

## 5. Command wiring (thin)

- [x] 5.1 Implement `commands/` (list, search, info, add) using commander + @inquirer/prompts, calling core; interactive multi-select + agent/scope prompts, skipped by flags/--yes
- [x] 5.2 Implement `main.ts` bin entry; ensure `node dist/main.js --help` lists the commands

## 6. Gates

- [x] 6.1 `nx run-many -t lint test typecheck build` green — output seen
- [x] 6.2 Smoke-test the built CLI `--help` and `list`/`add --help` output — seen
- [x] 6.3 `openspec validate npx-cli` passes
