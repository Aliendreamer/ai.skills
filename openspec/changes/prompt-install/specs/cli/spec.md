## MODIFIED Requirements

### Requirement: Install skills with add
The CLI SHALL provide `add [ids...]` that installs the selected items. With no ids and no
`--all`, it SHALL present an interactive multi-select of catalog items. `--all` SHALL select
every item. The target agent SHALL come from `--agent` or an interactive prompt; the scope SHALL
come from `--project`/`--global` or a prompt, defaulting to `project`. `--yes` SHALL skip prompts,
requiring `--agent` to be present. Each selected item SHALL be fetched and installed: `skill`
entries via the skill installer, `prompt` entries via the prompt installer (rendered to the
agent's format). A failure on one item SHALL be reported without aborting the rest of the batch.

#### Scenario: Add explicit skill ids non-interactively
- **WHEN** `add my-skill --agent claude --project --yes` runs and `my-skill` is a skill
- **THEN** the skill is fetched and installed to the claude project destination, with no prompts

#### Scenario: Unknown id rejected
- **WHEN** `add nope --agent claude --yes` runs and `nope` is not in the catalog
- **THEN** the CLI reports the unknown id and exits non-zero without installing anything

#### Scenario: --yes without an agent
- **WHEN** `add my-skill --yes` runs with no `--agent`
- **THEN** the CLI reports that `--agent` is required with `--yes` and exits non-zero

#### Scenario: Adding a prompt installs it
- **WHEN** `add a-prompt --agent gemini --project --yes` runs and `a-prompt` is a `prompt` entry
- **THEN** the prompt is rendered to the gemini format and written to the gemini commands directory

#### Scenario: Add all items
- **WHEN** `add --all --agent claude --project --yes` runs
- **THEN** every skill and every prompt is installed to its claude destination
