## Context

The `cli`, `skill-catalog`, and `skill-install` capabilities are specified and implemented in
TypeScript. Runtimes don't share code, so the dotnet tool re-implements the same contracts in
C#. .NET 10 SDK is available. The store is the GitHub repo (catalog over raw HTTP, items over the
codeload tarball).

## Goals / Non-Goals

**Goals:**
- A `dotnet tool` (`ai-skills`) with `list`/`search`/`info`/`add` matching the npx CLI.
- Pure, unit-tested core (catalog model + parse/validate, filter, repo/ref resolution,
  add-target resolution, agent destination resolution, install) with HTTP and FS behind
  interfaces.
- `.NET` gates green and wired into Nx.

**Non-Goals:**
- Prompt installation (deferred).
- Sharing code with the TS libs; publishing to NuGet (a release concern handled later).

## Decisions

- **Spectre.Console.Cli + Spectre.Console** — typed commands + rich interactive prompts/tables,
  one ecosystem. Matches the interactive UX. System.CommandLine rejected (pre-1.0 churn) for the
  command layer.
- **Layering mirrors the npx CLI**: a `Core` namespace holds pure logic and small interfaces
  (`ICatalogSource`, `IItemFetcher`, `ISkillInstaller`); Spectre command classes are thin
  adapters. Only `Core` is unit-tested; HTTP/FS implementations are integration-level.
- **Catalog model**: `record CatalogEntry(...)` + `record Catalog(IReadOnlyList<CatalogEntry>)`
  via `System.Text.Json` with camelCase. `ParseCatalog(json)` validates structurally and throws,
  mirroring the TS `parseCatalog`.
- **Fetch/extract**: `HttpClient` downloads the codeload tarball; `GZipStream` + `TarReader`
  (`System.Formats.Tar`) extract only entries under `<repo>-<ref>/<subpath>/`, stripping that
  prefix — no `git`.
- **Install**: folder copy for claude/codex/copilot; single `<id>.mdc` from `SKILL.md` for
  cursor; cursor rejects global scope; unknown agents rejected — identical rules to the TS lib.
- **Packaging**: `<PackAsTool>true</PackAsTool>`, `<ToolCommandName>ai-skills</ToolCommandName>`.
- **Nx integration**: `project.json` with `run-commands` targets `build` (`dotnet build
  -warnaserror`), `test` (`dotnet test`), `lint` (`dotnet format --verify-no-changes`) so the
  existing `nx run-many -t lint test build` gate includes the dotnet project.

## Risks / Trade-offs

- [Two implementations can drift] → both are pinned to the same spec capabilities; scenarios are
  mirrored in xUnit so behavior stays aligned.
- [Repo not published] → catalog/item fetch untested live; mitigate with interface fakes and a
  tarball fixture built in-test (as on the TS side). Live smoke once published.
- [`dotnet format` not installed] → it ships with the SDK; if missing, the lint target reports it.

## Open Questions

- Whether to later extract a shared NuGet for the C# core if other .NET consumers appear; not now.
