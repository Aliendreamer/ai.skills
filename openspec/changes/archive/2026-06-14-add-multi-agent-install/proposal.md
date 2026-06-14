## Why

Today `add` installs the selected items to exactly one agent per run: the agent is a single-select. Users who want the
same skills across several agents (e.g. claude and cursor) must re-run the command once per agent. The interactive flow
also jumps straight into a flat checkbox without letting the user first narrow to skills, prompts, or everything.

## What Changes

- The interactive `add` flow gains a leading **type filter** menu (Skills / Prompts / Everything) that scopes the item
  list before selection.
- The interactive **agent** step becomes a **multi-select** (was single-select). The chosen items install to every
  selected agent.
- A single **scope** prompt (project/global) runs once for the whole batch, after agents.
- New non-interactive flags: `--all-agents` (target every agent) and comma-separated `--agent claude,cursor`.
- Each selected item is installed to each selected agent; a failure on one item/agent pair is reported without aborting
  the rest of the batch. Result lines show the agent: `✓ <id> → <agent> (<dest>)`.
- Applies identically to **both** CLIs (npx and dotnet). `list` stays print-only; no new commands are added.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `cli`: the "Install skills with add" requirement changes — agent selection becomes multi-valued (multi-select prompt
  plus `--agent a,b` / `--all-agents`), the interactive flow gains a type-filter step, and items install to every
  selected agent under one scope.

## Impact

- npx CLI: `apps/cli-npx/src/commands/add.ts` (interactive flow), `apps/cli-npx/src/core/add.ts` (agent-list resolution,
  per-agent install loop), `apps/cli-npx/src/main.ts` (`--all-agents` flag), and their tests.
- dotnet CLI: `apps/cli-dotnet/AiSkills.Cli/Commands/AddCommand.cs`, `Core/AddService.cs`, and `Core/Adapters.cs` as
  needed, plus xUnit tests.
- No change to the catalog, the installers (`libs/install`), or the store content. `--agent` parsing stays
  backward-compatible (a single agent is the one-element case).
