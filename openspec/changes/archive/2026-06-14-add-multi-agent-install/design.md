## Context

`add` currently resolves a single `agent` (string) and installs all targets to it. Interactive selection is a flat
checkbox of all items plus a single-select agent prompt. Both CLIs share the same flow shape: npx in
`apps/cli-npx/src/{commands,core}/add.ts`, dotnet in `apps/cli-dotnet/AiSkills.Cli/{Commands/AddCommand.cs,Core/AddService.cs}`.
The installers in `libs/install` already take an `agent` argument and resolve per-agent destinations — no installer
change is needed; we just call them once per (item, agent).

## Goals / Non-Goals

**Goals:**

- Install selected items to **multiple agents** in one run, interactively and via flags.
- Add a leading **type filter** (Skills / Prompts / Everything) to the interactive flow.
- Ask **scope once** for the whole run, after agents.
- Keep both CLIs behaviorally identical; keep `--agent <single>` working unchanged.

**Non-Goals:**

- No per-skill agent matrix (one agent set applies to all chosen items).
- No new commands; `list`/`search`/`info` unchanged.
- No changes to the catalog, installers, or store content.

## Decisions

- **Agent resolution is centralized.** A `resolveAgents` helper takes the `--agent` value (comma-split, trimmed) and the
  `--all-agents` flag, validates every name against the supported `AGENTS` list, dedupes, and returns `string[]`. Unknown
  agents throw before any install. `--yes` requires the result to be non-empty.
- **Install loop is (item × agent).** `addItems` iterates targets, fetches each item **once** into a temp dir, then loops
  the selected agents installing from that same temp dir. Each result carries `{ id, agent, status, dest|message }` so a
  single pair can fail independently. Existing single-agent callers pass a one-element array.
- **Interactive order:** type filter → item multi-select (filtered list) → agent multi-select → one scope prompt. The
  type filter is skipped when ids/`--all` are supplied; agent/scope prompts are skipped when their flags are supplied.
- **npx:** commander `--all-agents` boolean and `--agent <agents>` (already a string; now comma-parsed). `@inquirer`
  `checkbox` for agents (was `select`). Result printing includes the agent.
- **dotnet:** `AddSettings` gains `--all-agents`; `--agent` parsed by splitting on `,`. `Spectre.Console`
  `MultiSelectionPrompt<string>` for agents (was `SelectionPrompt`). `AddService` mirrors the (item × agent) loop and the
  `resolveAgents` validation.

## Risks / Trade-offs

- **Backward compatibility of `--agent`:** a single value must still work. Comma-splitting a value with no comma yields a
  one-element list, so existing invocations are unaffected — covered by keeping the existing single-agent scenario.
- **Result volume:** N items × M agents lines can be long; acceptable and clearer than silent grouping. Lines name the
  agent so output stays unambiguous.
- **Parity drift between CLIs:** mitigated by mirroring the same helper names/logic and asserting the same scenarios in
  both test suites.
