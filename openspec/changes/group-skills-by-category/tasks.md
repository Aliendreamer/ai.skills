## 1. Catalog library

- [x] 1.1 Add `SKILL_CATEGORIES` and the `SkillCategory` type to `libs/catalog/src/types.ts`; add optional `category` to
  `CatalogEntry` and export both from `index.ts`
- [x] 1.2 Move the sample fixture skill to `__fixtures__/sample/skills/<category>/<id>/` and add a case with a non-item
  `README.md` inside a category folder
- [x] 1.3 `generate.ts`: scan `skills/<category>/<id>/SKILL.md`, set `category` from the folder, throw on a
  `skills/<id>/SKILL.md` naming the folder; prompts unchanged
- [x] 1.4 `serializeCatalog`: emit `category` after `version`, before `path`; omit it for prompts
- [x] 1.5 `validate.ts`: skill entries need a `category` in `SKILL_CATEGORIES` that matches the `path` segment; prompt
  entries must not carry one
- [x] 1.6 Tests in `generate.test.ts` and `validate.test.ts` for every new scenario in the `skill-catalog` delta
  (ungrouped folder, unknown category, category/path mismatch, cross-category duplicate id, prompt without category)

## 2. npx CLI

- [x] 2.1 `core/browse.ts`: add `category` to `BrowseFilter` and filter on it
- [x] 2.2 `commands/browse.ts` and `main.ts`: `list --category <name>` rejecting unknown names with the allowed list;
  show the category in `list`/`search` rows and `category:` in `info`
- [x] 2.3 Tests in `browse.test.ts` for the category filter and the unknown-category error; update fixture paths

## 3. dotnet CLI

- [x] 3.1 `Core/Catalog.cs`: add `string? Category = null` to `CatalogEntry`; add the mirrored category list
- [x] 3.2 `Core/Browse.cs`, `Commands/BrowseCommands.cs`, `Commands/Settings.cs`: `--category` filter and validation,
  category in `list`/`search` rows and `info`, matching the npx output
- [x] 3.3 Tests in `BrowseStoreTests.cs` / `CatalogTests.cs`, including parsing a catalog without `category`

## 4. Move the skills

- [x] 4.1 `git mv` the 24 skills into `skills/workflow`, `skills/frontend`, `skills/dependencies`, `skills/quality`,
  `skills/agent-setup` per the proposal's assignment
- [x] 4.2 Regenerate `catalog.json`; confirm 27 entries, every skill with a category and paths matching the new tree
- [x] 4.3 Confirm `.markdownlint-cli2.jsonc`'s `skills/**/*.md` glob still covers the moved files and the auxiliary
  scripts (context-hooks `kit/`, clear-git `cleargit.sh`) kept their executable bit

## 5. Verify

- [x] 5.1 Run catalog, install and npx tests, typecheck, lint, catalog `validate` and markdownlint; run dotnet tests
- [x] 5.2 Install one moved skill with each CLI against a local checkout and confirm it lands at the flat
  `<agent>/skills/<id>` path, including auxiliary files
- [x] 5.3 Parse the new `catalog.json` with the currently published npx CLI and dotnet tool (or their parse code at the
  last release tag) to confirm older consumers still read it
- [x] 5.4 `openspec validate group-skills-by-category --strict`
