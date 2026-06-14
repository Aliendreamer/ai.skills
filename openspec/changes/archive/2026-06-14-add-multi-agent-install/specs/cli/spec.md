## MODIFIED Requirements

### Requirement: Install skills with add

The CLI SHALL provide `add [ids...]` that installs the selected items to one or more agents. With no ids and no `--all`,
it SHALL first present a **type filter** (Skills / Prompts / Everything) that scopes the item list, then an interactive
multi-select of the matching catalog items. `--all` SHALL select every item.

The target agents SHALL come from `--agent` — which accepts a comma-separated list (e.g. `claude,cursor`) — from
`--all-agents` (every supported agent), or from an interactive **multi-select** prompt. The scope SHALL come from
`--project`/`--global` or a single prompt asked once for the whole run after agents are chosen, defaulting to `project`.
`--yes` SHALL skip prompts, requiring agents to be specified via `--agent` or `--all-agents`.

Each selected item SHALL be fetched once and installed to every selected agent: `skill` entries via the skill installer,
`prompt` entries via the prompt installer (rendered to each agent's format). A failure on one item/agent pair SHALL be
reported without aborting the rest of the batch, and each result line SHALL name the agent.

#### Scenario: Add explicit skill ids non-interactively

- **WHEN** `add my-skill --agent claude --project --yes` runs and `my-skill` is a skill
- **THEN** the skill is fetched and installed to the claude project destination, with no prompts

#### Scenario: Install to multiple agents via comma list

- **WHEN** `add my-skill --agent claude,cursor --project --yes` runs and `my-skill` is a skill
- **THEN** the skill is installed to both the claude and the cursor project destinations

#### Scenario: Install to every agent with --all-agents

- **WHEN** `add my-skill --all-agents --project --yes` runs and `my-skill` is a skill
- **THEN** the skill is installed to every supported agent's project destination

#### Scenario: Unknown id rejected

- **WHEN** `add nope --agent claude --yes` runs and `nope` is not in the catalog
- **THEN** the CLI reports the unknown id and exits non-zero without installing anything

#### Scenario: Unknown agent rejected

- **WHEN** `add my-skill --agent claude,bogus --yes` runs and `bogus` is not a supported agent
- **THEN** the CLI reports the unknown agent and exits non-zero without installing anything

#### Scenario: --yes without any agent

- **WHEN** `add my-skill --yes` runs with neither `--agent` nor `--all-agents`
- **THEN** the CLI reports that an agent is required with `--yes` and exits non-zero

#### Scenario: Adding a prompt installs it

- **WHEN** `add a-prompt --agent gemini --project --yes` runs and `a-prompt` is a `prompt` entry
- **THEN** the prompt is rendered to the gemini format and written to the gemini commands directory

#### Scenario: Add all items to all agents

- **WHEN** `add --all --all-agents --project --yes` runs
- **THEN** every skill and every prompt is installed to every supported agent's destination

#### Scenario: Per-item-per-agent failure does not abort the batch

- **WHEN** `add a b --agent claude,cursor --project --yes` runs and installing `a` to cursor fails
- **THEN** that single failure is reported with its agent and the remaining item/agent installs still run
