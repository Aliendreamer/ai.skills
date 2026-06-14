## Why

Prompt installation was deferred because each agent wants a different prompt/command format. The
formats are now verified, so this change adds prompt install to both CLIs, flipping `prompt`
entries from "deferred" to actually installed.

## What Changes

- Add prompt support to the install layer (TS `libs/install` and C# `AiSkills.Cli.Core`):
  - **Destinations** per agent + scope:
    - claude → `<base>/.claude/commands/<id>.md` (project/global)
    - codex → `<home>/.codex/prompts/<id>.md` (**global only**)
    - cursor → `<base>/.cursor/commands/<id>.md` (project/global)
    - copilot → project `<project>/.github/prompts/<id>.prompt.md`, global `<home>/.copilot/prompts/<id>.prompt.md`
    - gemini → `<base>/.gemini/commands/<id>.toml` (project/global)
  - **Rendering** from the canonical `PROMPT.md` (frontmatter stripped to its body; description
    taken from the catalog entry):
    - claude / codex / cursor → plain markdown body
    - copilot → body with a `description:` YAML frontmatter (`.prompt.md`)
    - gemini → TOML (`description = "…"`, `prompt = """…"""`)
- Wire both CLIs' `add` to install prompts (dispatch by item type); per-item failures are
  reported without aborting the batch.
- Update reference: prompts can target all five agents (skills still exclude gemini).

## Capabilities

### New Capabilities
- `prompt-install`: prompt destination resolution, per-agent prompt rendering, and installing a
  fetched prompt into an agent's commands/prompts directory.

### Modified Capabilities
- `cli`: prompts are no longer deferred by `add`; they are installed (the prior "deferred"
  scenario is replaced).

## Impact

- Source: `libs/install` (+ render), npx `add`; `AiSkills.Cli.Core` (+ render), dotnet `add`.
- No new runtime dependencies (frontmatter is stripped, not parsed; description comes from the
  catalog entry).
- Both CLIs reach feature parity for skills and prompts.
