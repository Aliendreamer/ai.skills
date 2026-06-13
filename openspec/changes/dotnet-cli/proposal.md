## Why

The `cli` capability is implemented for npm (`npx ai-skills`). .NET users want the same tool in
their ecosystem. This change delivers a **`dotnet tool`** implementation of the same
`list`/`search`/`info`/`add` behavior, completing dual-channel distribution of the store.

## What Changes

- Add a .NET 10 project `apps/cli-dotnet` (`AiSkills.Cli`) packaged with `PackAsTool` so
  `dotnet tool install` exposes the `ai-skills` command, built on `Spectre.Console.Cli`
  (commands/flags) + `Spectre.Console` (interactive prompts, tables, color).
- Implement the same commands and flags as the npx CLI: `list [--type] [--agent]`,
  `search <query>`, `info <id>`, `add [ids...] [--all] [--agent] [--project|--global] [--yes]`.
- Read `catalog.json` from raw GitHub and fetch items via the `codeload` tarball
  (`HttpClient` + `System.Formats.Tar` + `GZipStream`); install skills using the same per-agent
  destination rules (claude/codex/copilot/cursor); defer prompt-type entries.
- Add an xUnit test project `AiSkills.Cli.Tests`; wire `.NET` gates (build `-warnaserror`,
  `dotnet test`, `dotnet format --verify-no-changes`) as Nx targets so `nx run-many` covers it.
- **Scope:** skills only (mirrors the npx CLI); prompts deferred.

## Capabilities

### New Capabilities
<!-- None — implements the existing `cli` capability in a second runtime. -->

### Modified Capabilities
- `cli`: ADD a requirement that the CLI is also distributed as a .NET global tool with the same
  command surface (no change to existing command behavior).

## Impact

- New source: `apps/cli-dotnet/` (`AiSkills.Cli`, `AiSkills.Cli.Tests`, a solution file).
- New dependencies (NuGet): `Spectre.Console`, `Spectre.Console.Cli`, `xunit`.
- Re-implements the `skill-catalog`, `skill-install`, and `cli` contracts in C# (the TS libs are
  not shared across runtimes; the contracts are).
- Live network paths verified once the repo is published; pure logic unit-tested.
