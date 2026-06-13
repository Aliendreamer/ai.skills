## 1. Workspace setup

- [x] 1.1 Initialize Nx + pnpm workspace at the repo root (`nx.json`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`)
- [x] 1.2 Add dev dependencies: TypeScript, Vitest, `gray-matter`, `semver` (+ `@types/semver`)
- [x] 1.3 Generate the `libs/catalog` TypeScript library project with `lint`, `test`, `typecheck`, `build` targets
- [x] 1.4 Confirm `nx run-many -t lint test build typecheck` runs on the lib (baseline green)

## 2. Catalog types

- [x] 2.1 Define `CatalogEntry` and `Catalog` types in `libs/catalog/src` (id, type, description, tags, agents, version, optional appPattern, path). NOTE: dropped `generatedAt` from the persisted catalog so `catalog.json` is fully deterministic and the up-to-date check is a plain byte compare.
- [x] 2.2 Define the allowed sets: `AGENTS` (claude, codex, cursor, gemini, copilot) and `ITEM_TYPES` (skill, prompt)

## 3. Frontmatter parsing (TDD)

- [x] 3.1 Frontmatter parsing covered by the `generateCatalog` fixture tests (valid skill, valid prompt, fields mapped, non-items ignored)
- [x] 3.2 Parsing implemented with `gray-matter` inside `generate.ts` (`toEntry`); no separate `parseItem` module needed (consolidated)

## 4. generateCatalog (TDD)

- [x] 4.1 Write failing tests over a fixture tree: one skill + one prompt produce two entries with POSIX relative paths; non-item files ignored
- [x] 4.2 Implement `generateCatalog(root)` scanning `skills/` and `prompts/`; make tests pass
- [x] 4.3 Write failing test for deterministic serialization (two serializations identical: stable key order + trailing newline)
- [x] 4.4 Implement `serializeCatalog(catalog)` with deterministic JSON; make test pass

## 5. validateCatalog (TDD)

- [x] 5.1 Write failing tests: valid catalog passes; one failing case each for duplicate id, non-kebab id, bad type, unknown agent, invalid semver, missing path, prompt missing appPattern
- [x] 5.2 Implement `validateCatalog(catalog, root?)` returning a violations list; make tests pass

## 6. loadCatalog (TDD)

- [x] 6.1 Write failing tests: round-trips a generated catalog; rejects a malformed catalog
- [x] 6.2 Implement `loadCatalog(file)` (parse + structural validate); make tests pass

## 7. Reference content

- [x] 7.1 Add reference skill `skills/conventional-commits/SKILL.md` with complete frontmatter
- [x] 7.2 Add reference prompt `prompts/dotnet-webapi/PROMPT.md` with complete frontmatter incl. `appPattern`

## 8. Nx targets + generated catalog

- [x] 8.1 Add `generate-catalog` target that runs `generateCatalog` over the repo and writes `catalog.json`
- [x] 8.2 Add `validate` target: run `validateCatalog` AND fail if regenerating `catalog.json` would change it (up-to-date check)
- [x] 8.3 Run `generate-catalog`; `catalog.json` produced (commit pending user go-ahead)

## 9. Done gate

- [x] 9.1 `nx run-many -t lint test build typecheck` green — output seen
- [x] 9.2 `validate` target green (validation + up-to-date check) — output seen
- [x] 9.3 `openspec validate skill-store-foundation` passes
