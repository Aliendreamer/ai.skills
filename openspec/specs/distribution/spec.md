# distribution

## Purpose

Make the CLIs installable by end users: a self-contained npm package runnable via `npx`, an installable .NET tool, and a
single fixed-version release that publishes both.

## Requirements

### Requirement: Self-contained npm package

The npx CLI SHALL be published as a single self-contained npm package (`@aliendreamer/ai-skills`, bin `ai-skills`) that
bundles its workspace and third-party dependencies, so it runs via `npx` with no runtime dependency installation.

#### Scenario: Bundle runs without node_modules

- **WHEN** the built `dist/main.cjs` is copied to a directory with no `node_modules` and run
- **THEN** the CLI executes (e.g. `--help` and `list` work)

#### Scenario: No runtime dependencies are published

- **WHEN** the package is packed
- **THEN** its `package.json` declares no runtime `dependencies` and includes the `bin` entry

### Requirement: dotnet tool package

The dotnet CLI SHALL produce an installable .NET tool package via `dotnet pack` (`PackAsTool`, command `ai-skills`).

#### Scenario: Pack produces a tool nupkg

- **WHEN** `dotnet pack` runs for the CLI project
- **THEN** it produces an `AiSkills.Cli.<version>.nupkg`

### Requirement: One-command release publishes both

The release flow SHALL version (conventional commits, one fixed version), update the changelog, tag, push, and publish
both the npm package and the dotnet tool.

#### Scenario: Release dry run computes the next version

- **WHEN** the release dry run is executed
- **THEN** it reports the next version and the changelog entry without publishing

#### Scenario: Release publishes npm and NuGet

- **WHEN** `release` runs with credentials available
- **THEN** it publishes the npm package and pushes the dotnet nupkg, then pushes the commit and tag
