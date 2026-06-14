## Context

The interactive `add` flow runs prompts sequentially with no way back, and the CLI has no default
command so a bare invocation prints help. `@inquirer/prompts` 7.x (npx) and `Spectre.Console`
(dotnet) drive the prompts; commander 12 and `Spectre.Console.Cli` both support a default command.

## Goals / Non-Goals

**Goals:**

- Bare invocation launches the interactive wizard.
- One-step Back navigation across the four wizard steps, using mechanisms that work reliably in any
  terminal (no raw-mode key hacks).
- Keep both CLIs behaviorally identical; non-interactive paths unchanged.

**Non-Goals:**

- No global undo/redo or jumping to an arbitrary step — only back one step at a time.
- No reliance on capturing the Escape key (not portable across the prompt libraries); a visible
  **← Back** affordance is used instead, which satisfies "back button".

## Decisions

- **Step machine.** Model the wizard as ordered steps `['type','items','agents','scope']` driven by a
  `while` loop over a step index. A pure helper `wizardBack(step)` returns the previous step or `null`
  (cancel) — this is the unit-tested contract; the prompt wiring around it stays thin.
- **Back affordances per step type.**
  - Single-select (type, scope): add a sentinel **← Back** choice. Back at `type` → cancel.
  - Multi-select (items, agents): an **empty submission** means back (the prompt is `NotRequired` /
    inquirer checkbox with `required: false`); the message states "submit nothing to go back".
  - Selections are preserved when returning to a step so the user can adjust rather than restart.
- **Default command.**
  - npx: mark the `add` command `{ isDefault: true }` in commander, so a bare run executes `add` with
    no ids → the wizard. Explicit subcommands still match first.
  - dotnet: `config.SetDefaultCommand<AddCommand>()` in `Program.cs`.

## Risks / Trade-offs

- **"Empty = back" vs "select none on purpose":** selecting nothing and continuing would install
  nothing, so overloading it as back loses no useful action; the prompt label makes it explicit.
- **Default command capturing a stray operand:** a bare id (e.g. `ai-skills web-security-audit`) would
  route to `add` as an id — a reasonable shortcut, not a regression.
- **Parity:** mirrored step order, helper, and back rules in both CLIs; the same scenarios are
  asserted in both test suites for the pure helper.
