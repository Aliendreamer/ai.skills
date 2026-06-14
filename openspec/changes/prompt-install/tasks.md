## 1. TS install: prompt destinations + render (TDD)

- [x] 1.1 Write failing tests for `resolvePromptDestination(agent, scope, id, bases)` (claude/cursor/copilot/gemini project+global; codex global; codex-project error; unknown-agent error)
- [x] 1.2 Implement the prompt adapter table + `resolvePromptDestination` + `promptFormat` in `libs/install/src/adapters.ts`; tests green
- [x] 1.3 Write failing tests for `stripFrontmatter(content)` and `renderPrompt(format, description, body)` (md=body; copilot has description frontmatter; gemini TOML)
- [x] 1.4 Implement `libs/install/src/render.ts`; tests green

## 2. TS install: installPrompt (TDD)

- [x] 2.1 Write failing tests for `installPrompt(sourceDir, agent, scope, id, description, bases)` (gemini → .toml; claude → .md body; creates dirs)
- [x] 2.2 Implement `installPrompt` in `libs/install/src/install.ts`; export new APIs; tests green

## 3. npx add: install prompts (TDD)

- [x] 3.1 Update `core/add.ts`: dispatch by type (skill→installSkill, prompt→installPrompt), per-item try/catch with `installed`/`failed` status; inject both installers. Update tests (prompt now installed, not deferred)
- [x] 3.2 Update `commands/add.ts` to offer all five agents and render results; build + smoke `add --help`

## 4. C# core: prompt destinations + render (TDD)

- [x] 4.1 Write failing xUnit tests for `Adapters.ResolvePromptDestination` + `Adapters.PromptFormat` (same cases as TS)
- [x] 4.2 Implement in `Adapters.cs`; tests green
- [x] 4.3 Write failing tests for `PromptRenderer.StripFrontmatter` and `PromptRenderer.Render(format, description, body)`; implement `Core/PromptRenderer.cs`; tests green

## 5. C# install + add (TDD)

- [x] 5.1 Write failing tests for `Installer.InstallPromptAsync(sourceDir, agent, scope, id, description, bases)` (gemini .toml; claude .md); implement; tests green
- [x] 5.2 Update `AddService.AddSkillsAsync` (→ items): dispatch by type via an `IPromptInstaller` seam, `installed`/`failed` status; update tests
- [x] 5.3 Wire dotnet `AddCommand` to install prompts (all five agents); build + smoke `add --help`

## 6. Gates

- [x] 6.1 `nx run-many -t lint test build typecheck` green across all 4 projects — output seen
- [x] 6.2 `openspec validate prompt-install` passes
