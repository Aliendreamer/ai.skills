## Why

Running the CLI with no command prints help — users must know to type `add` to install anything. And
once inside the interactive flow there is no way to step back: a mis-pick at the type step (e.g.
"Skills" when you meant "Prompts") forces a Ctrl+C and a restart.

## What Changes

- **Interactive install is the default command.** Running the CLI with no command (e.g.
  `npx @aliendreamer/ai-skills`) launches the interactive `add` wizard directly. Explicit
  `list`/`search`/`info`/`add` still work as before.
- **Back navigation between wizard steps.** The interactive flow (type → items → agents → scope)
  lets the user go back one step:
  - single-select steps (type, scope) offer a **← Back** choice;
  - multi-select steps (items, agents) treat **submitting an empty selection** as "go back";
  - going back from the first step (type) cancels the wizard.
- Applies to **both** CLIs (npx and dotnet). Non-interactive runs (ids/`--all` + `--agent`/`--yes`)
  are unaffected.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `cli`: the "Install skills with add" requirement gains (a) launching the interactive wizard as the
  default command when no command is given, and (b) back navigation between the wizard's steps.

## Impact

- npx CLI: `apps/cli-npx/src/main.ts` (default command), `apps/cli-npx/src/commands/add.ts`
  (step-machine wizard with back), a small pure step helper + test in `apps/cli-npx/src/core/add.ts`.
- dotnet CLI: `apps/cli-dotnet/AiSkills.Cli/Program.cs` (default command),
  `apps/cli-dotnet/AiSkills.Cli/Commands/AddCommand.cs` (step machine), step helper + test in
  `Core/AddService.cs`.
- No change to the catalog, installers, or store content.
