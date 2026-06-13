## 1. Library setup

- [x] 1.1 Create `libs/install` (package.json, tsconfig.json, vitest.config.ts, project.json with lint/test/typecheck/build) mirroring `libs/catalog`
- [x] 1.2 Add `tar` (+ `@types/tar` if needed) for tarball extraction; depend on `@ai-skills/catalog` for the `Agent` type

## 2. Agent adapters (TDD)

- [x] 2.1 Write failing tests for `resolveSkillDestination(agent, scope, id, bases)`: claude/codex/copilot project+global, cursor project, cursor-global error, unsupported-agent error
- [x] 2.2 Implement the adapter table and `resolveSkillDestination`; make tests pass

## 3. GitHub fetch (TDD)

- [x] 3.1 Write failing tests for `tarballUrl(owner, repo, ref)` (default ref `main`) and for extracting a subpath from a committed local `.tar.gz` fixture (prefix stripped, only that subpath)
- [x] 3.2 Implement `tarballUrl` and `extractSubpath(tarballPath|stream, subpath, destDir)`; make tests pass
- [x] 3.3 Implement `fetchItem(owner, repo, ref, subpath, destDir)` (download + extract); covered by URL + extraction tests (network call not unit-tested until a remote exists)

## 4. Skill install (TDD)

- [x] 4.1 Write failing tests for `installSkill(sourceDir, agent, scope, id, bases)`: folder copy for claude; single `.mdc` for cursor; creates missing parent dirs
- [x] 4.2 Implement `installSkill` (folder copy vs cursor single-file); make tests pass

## 5. Public API + gates

- [x] 5.1 Export `resolveSkillDestination`, `tarballUrl`, `extractSubpath`, `fetchItem`, `installSkill` from `libs/install/src/index.ts`
- [x] 5.2 `nx run-many -t lint test typecheck build` green — output seen
- [x] 5.3 `openspec validate skill-install` passes
