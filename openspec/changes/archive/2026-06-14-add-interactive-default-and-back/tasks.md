## 1. npx (TDD)

- [x] 1.1 Add `WIZARD_STEPS` + `wizardBack(step)` to `core/add.ts` returning the previous step or
      `null` (cancel before the first step). Write tests first.
- [x] 1.2 Rewrite the interactive branch of `commands/add.ts` as a step-machine loop over
      type → items → agents → scope, with ← Back on single-selects, empty-submit = back on
      multi-selects, preserving prior selections; back from type cancels.
- [x] 1.3 Mark `add` as the default command in `main.ts` (`{ isDefault: true }`).

## 2. dotnet (TDD)

- [x] 2.1 Add `WizardSteps` + `WizardBack(step)` to `Core/AddService.cs`; write xUnit tests first.
- [x] 2.2 Rewrite the interactive branch of `Commands/AddCommand.cs` as the same step machine, using
      `MultiSelectionPrompt.NotRequired()` empty = back and a ← Back choice on selections.
- [x] 2.3 `config.SetDefaultCommand<AddCommand>()` in `Program.cs`.

## 3. Verify

- [x] 3.1 `nx run-many -t lint test build typecheck` green; `dotnet test` green; `pnpm lint:md` clean.
- [x] 3.2 Manual smoke: bare `node dist/main.cjs` (and `dotnet … `) launches the wizard;
      non-interactive `--all-agents --yes` still works.
- [x] 3.3 Update README usage to note bare invocation + back navigation.
