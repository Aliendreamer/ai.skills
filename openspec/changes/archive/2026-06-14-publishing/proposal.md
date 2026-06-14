## Why

The CLIs are built and tested but not installable by end users. This change makes them
distributable: a bundled npm package for `npx`, the existing dotnet tool for `dotnet tool
install`, and a one-command release that versions, changelogs, tags, pushes, and publishes both.

## What Changes

- Bundle `apps/cli-npx` into a single self-contained CJS file with tsup (workspace libs +
  third-party inlined; **no runtime dependencies**); publish it as **`@aliendreamer/ai-skills`**
  with bin `ai-skills`.
- Scope Nx Release to the publishable package (`cli-npx`) and add an `nx-release-publish`
  (`npm publish`) target.
- Add `publish:dotnet` (`dotnet pack` + `dotnet nuget push`, version derived from the npm
  package) and `release` / `release:first` scripts that run `nx release` → publish dotnet →
  `git push --follow-tags`.
- Publishing runs manually from the maintainer's machine (npm login + `NUGET_API_KEY`); secrets
  will later be managed with git-crypt in the repo.

## Capabilities

### New Capabilities
- `distribution`: how the CLIs are packaged and published — a self-contained npm bundle, the
  dotnet tool package, and a single fixed-version release that publishes both.

### Modified Capabilities
<!-- None — packaging/release only; runtime behavior is unchanged. -->

## Impact

- `apps/cli-npx`: tsup bundling, scoped package name, bin `dist/main.cjs`, no runtime deps.
- `nx.json` release config; root `package.json` release/publish scripts.
- No application behavior change. Real publish requires the maintainer's npm login and NuGet key.
