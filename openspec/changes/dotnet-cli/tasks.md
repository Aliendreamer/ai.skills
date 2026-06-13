## 1. Project setup

- [x] 1.1 Create `apps/cli-dotnet` solution with `AiSkills.Cli` (net10.0, exe, PackAsTool, ToolCommandName ai-skills) and `AiSkills.Cli.Tests` (xUnit)
- [x] 1.2 Add NuGet deps: `Spectre.Console`, `Spectre.Console.Cli` (cli); xUnit + runner (tests). Enable nullable + warnings-as-errors
- [x] 1.3 Add `project.json` with Nx run-commands targets `build` (dotnet build -warnaserror), `test` (dotnet test), `lint` (dotnet format --verify-no-changes)

## 2. Catalog model + parse (TDD)

- [x] 2.1 Write failing xUnit tests for `Catalog`/`CatalogEntry` JSON round-trip and `CatalogParser.Parse(json)` (valid → model; invalid → throws)
- [x] 2.2 Implement the records + `CatalogParser` (System.Text.Json, camelCase); tests green

## 3. Browse + repo resolution (TDD)

- [x] 3.1 Write failing tests for `Browse.Filter(catalog, type, agent, query)`, `Browse.Find(catalog, id)`, and `Store.ResolveRepo`/`Store.CatalogRawUrl` incl. --repo/--ref/env
- [x] 3.2 Implement `Browse` and `Store`; tests green

## 4. Adapters + install (TDD)

- [x] 4.1 Write failing tests for `Adapters.ResolveSkillDestination(agent, scope, id, bases)` (claude/codex/copilot/cursor; cursor-global error; unsupported-agent error)
- [x] 4.2 Implement `Adapters`; tests green
- [x] 4.3 Write failing tests for `Installer.InstallSkill(sourceDir, agent, scope, id, bases)` (folder copy for claude; single .mdc for cursor; creates dirs) and `TarExtractor.ExtractSubpath` against an in-test tarball
- [x] 4.4 Implement `Installer` and `TarExtractor` (GZipStream + System.Formats.Tar); tests green

## 5. Add orchestration (TDD)

- [x] 5.1 Write failing tests for `AddService.ResolveTargets(catalog, ids, all)` (unknown id error; all selects all) and `AddService.AddSkills(targets, deps)` with injected fetcher/installer (skills installed; prompts deferred); plus `Options.ResolveScope`/`RequireYesFlags`
- [x] 5.2 Implement `AddService` + option helpers; tests green

## 6. Command wiring (thin)

- [x] 6.1 Implement Spectre commands (`ListCommand`, `SearchCommand`, `InfoCommand`, `AddCommand`) + real `HttpCatalogSource`/`HttpItemFetcher`/`FileSkillInstaller`; wire `CommandApp` in `Program.cs`
- [x] 6.2 Smoke-test `dotnet run -- --help` and `add --help`; verify `--yes` without `--agent` errors (non-zero)

## 7. Gates

- [x] 7.1 `dotnet build -warnaserror`, `dotnet test`, `dotnet format --verify-no-changes` green — output seen
- [x] 7.2 `nx run-many -t lint test build` includes cli-dotnet and is green — output seen
- [x] 7.3 `openspec validate dotnet-cli` passes
