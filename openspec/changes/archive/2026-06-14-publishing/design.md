## Context

`apps/cli-npx` imported workspace-only packages (`@ai-skills/catalog`, `@ai-skills/install`) that
don't exist on npm, so a naive publish would fail at runtime. The dotnet CLI already compiles to a
self-contained `dotnet tool`. The repo uses Nx Release (fixed version, conventional commits, root
`CHANGELOG.md`). Publishing is manual from the maintainer's machine.

## Goals / Non-Goals

**Goals:**
- A self-contained npm package runnable via `npx` with no `node_modules`.
- One release command that versions, changelogs, tags, pushes, and publishes npm + NuGet.

**Non-Goals:**
- CI-based publishing (later); secret management via git-crypt (later).
- Publishing the internal libs as standalone npm packages.

## Decisions

- **Bundle with tsup, CJS output.** ESM output failed with "Dynamic require not supported" from a
  bundled CJS dependency; CJS output uses native `require`. `noExternal: [/.*/]` inlines
  everything, so the package has zero runtime deps. Shebang comes from `src/main.ts` (esbuild
  preserves it); no tsup banner (it would duplicate the shebang).
- **Scoped name `@aliendreamer/ai-skills`** (`publishConfig.access: public`); unscoped `ai-skills`
  is likely taken. bin value `dist/main.cjs` (no leading `./`, which triggered an npm warning).
- **Nx Release scoped to `cli-npx`** via `release.projects`; an `nx-release-publish` run-commands
  target runs `npm publish`. The internal libs aren't versioned/published (they're bundled).
- **dotnet publish as a script step**, not via Nx Release (which is JS-only): `publish:dotnet`
  reads the version from the npm package.json and runs `dotnet pack -p:Version=… ` + `dotnet nuget
  push -k $NUGET_API_KEY`. `release`/`release:first` chain `nx release` → `publish:dotnet` →
  `git push --follow-tags` so one command does everything.

## Risks / Trade-offs

- [Two version sources (npm pkg + dotnet -p:Version)] → `publish:dotnet` derives the dotnet version
  from the just-bumped npm package.json, keeping them in lockstep.
- [Manual secrets today] → npm login + `NUGET_API_KEY` env for now; git-crypt to follow.
- [Bundled CJS size ~1.2 MB] → acceptable for a CLI; one fast `npx` download, no dep resolution.

## Open Questions

- CI publish workflow (GitHub Actions on tag) — deferred.
