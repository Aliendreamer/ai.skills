## 1. npx core (TDD)

- [x] 1.1 Add `resolveAgents(value?, allAgents?)` in `core/add.ts`: comma-split + trim `--agent`, expand `--all-agents`,
      validate against `AGENTS`, dedupe, return `string[]`; throw on unknown/empty. Write tests first.
- [x] 1.2 Change `AddDeps.agent: string` → `agents: string[]` and make `addItems` fetch each item once then loop agents,
      emitting one `AddResult { id, agent, status, dest|message }` per pair; one failure does not abort. Update tests.
- [x] 1.3 Update `requireYesFlags` to accept agents-from-`--agent`-or-`--all-agents` (error when neither under `--yes`).

## 2. npx command + flags

- [x] 2.1 Add `--all-agents` to `add` in `main.ts`; keep `--agent <agents>` (now comma-list).
- [x] 2.2 In `commands/add.ts`: add the type-filter `select` (Skills/Prompts/Everything) before the item `checkbox`;
      change the agent prompt to `checkbox`; ask scope once after agents; print `✓ <id> → <agent> (<dest>)`.

## 3. dotnet core (TDD)

- [x] 3.1 Add agent-resolution + (item × agent) install loop in `Core/AddService.cs` mirroring npx; add `--all-agents`
      and comma-parsed `--agent` to `AddSettings`. Write xUnit tests first.
- [x] 3.2 In `Commands/AddCommand.cs`: add the type filter, switch the agent prompt to `MultiSelectionPrompt`, ask scope
      once, and print results with the agent name.

## 4. Verify

- [x] 4.1 `nx run-many -t lint test` green for both CLIs; `dotnet test` green.
- [x] 4.2 Regenerate/validate catalog if touched (it is not) and run `pnpm lint:md` (0 violations).
- [x] 4.3 Manual smoke: `add --agent claude,cursor` and `add --all-agents` in a temp dir for both CLIs (live vs GitHub).
