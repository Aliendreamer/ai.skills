## 1. Bundle the npx CLI

- [x] 1.1 Add tsup; `tsup.config.ts` bundles `src/main.ts` to one self-contained CJS file (`noExternal: [/.*/]`, shebang from source)
- [x] 1.2 Rename package to `@aliendreamer/ai-skills`, bin `dist/main.cjs`, `files: [dist]`, `publishConfig.access: public`, move deps to devDependencies (bundled)
- [x] 1.3 Point `cli-npx` build target at tsup (dependsOn `^build`); add `nx-release-publish` (npm publish) target
- [x] 1.4 Verify the bundle runs with no node_modules (live `--help`/`list`/`add`)

## 2. Release + publish wiring

- [x] 2.1 Scope Nx Release to `cli-npx` (`release.projects`)
- [x] 2.2 Add `publish:dotnet` (dotnet pack + nuget push, version from the npm package)
- [x] 2.3 Add `release` / `release:first` scripts: `nx release` → `publish:dotnet` → `git push --follow-tags`

## 3. Verify to the publish boundary

- [x] 3.1 `nx run-many -t lint test typecheck build` green across all 4 projects
- [x] 3.2 `npm publish --dry-run` clean (bin preserved, no runtime deps); `dotnet pack` produces the tool nupkg
- [x] 3.3 `nx release --dry-run --first-release` computes v0.1.0 + changelog
- [x] 3.4 `openspec validate publishing` passes
