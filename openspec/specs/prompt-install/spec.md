# prompt-install

## Purpose

Install a store prompt onto disk for a target agent: resolve the destination per agent and scope,
render the canonical `PROMPT.md` into the agent's native prompt/command format, and write it. The
npx and dotnet CLIs share this contract.

## Requirements

### Requirement: Prompt destination resolution
The system SHALL resolve the destination for a prompt given an agent, scope, id, and bases.
Supported agents and destinations:

- `claude` → `<base>/.claude/commands/<id>.md` (project or global)
- `codex` → `<home>/.codex/prompts/<id>.md` (global only)
- `cursor` → `<base>/.cursor/commands/<id>.md` (project or global)
- `copilot` → project `<project>/.github/prompts/<id>.prompt.md`, global `<home>/.copilot/prompts/<id>.prompt.md`
- `gemini` → `<base>/.gemini/commands/<id>.toml` (project or global)

#### Scenario: Resolve a claude project prompt path
- **WHEN** resolving `claude`, scope `project`, id `p`, bases `{ project: /repo, home: /home/u }`
- **THEN** the destination is `/repo/.claude/commands/p.md`

#### Scenario: Resolve a gemini prompt path
- **WHEN** resolving `gemini`, scope `project`, id `p`
- **THEN** the destination ends with `.gemini/commands/p.toml`

#### Scenario: Codex rejects project scope
- **WHEN** resolving `codex` with scope `project`
- **THEN** the system raises an error stating codex prompts are global only

#### Scenario: Unknown agent rejected
- **WHEN** resolving an agent that is not one of the five supported agents
- **THEN** the system raises an error

### Requirement: Prompt rendering per agent format
The system SHALL render a prompt from its body and description into the target agent's format:
plain markdown body for `claude`/`codex`/`cursor`; a `description:` YAML frontmatter followed by
the body for `copilot`; and TOML with `description` and `prompt` keys for `gemini`. Frontmatter in
the source `PROMPT.md` SHALL be stripped to obtain the body.

#### Scenario: Strip frontmatter to body
- **WHEN** a `PROMPT.md` begins with a `---` frontmatter block
- **THEN** rendering uses only the content after the closing `---`

#### Scenario: Markdown render is the body
- **WHEN** rendering for `claude`
- **THEN** the output is the prompt body

#### Scenario: Copilot render carries a description
- **WHEN** rendering for `copilot` with a description
- **THEN** the output begins with a `---` block containing `description:` and is followed by the body

#### Scenario: Gemini render is TOML
- **WHEN** rendering for `gemini` with a description and body
- **THEN** the output contains a `description = "..."` line and a `prompt = """..."""` block

### Requirement: Install a prompt into an agent directory
The system SHALL install a fetched prompt from a source directory by reading `PROMPT.md`,
rendering it for the agent, and writing it to the resolved destination, creating parent
directories as needed.

#### Scenario: Install a gemini prompt
- **WHEN** installing a source prompt for `gemini`, scope `project`, id `p`
- **THEN** `<project>/.gemini/commands/p.toml` exists with TOML content

#### Scenario: Install a claude prompt
- **WHEN** installing a source prompt for `claude`, scope `project`, id `p`
- **THEN** `<project>/.claude/commands/p.md` exists with the prompt body
