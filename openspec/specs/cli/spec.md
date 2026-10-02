# cli

## Purpose

Define the behavior contract of the `ai-skills` command-line interface — browsing the store (`list`/`search`/`info`) and
installing skills (`add`) — shared by the npx and dotnet implementations so both behave identically.

## Requirements

### Requirement: Browse the catalog

The CLI SHALL provide `list`, `search`, and `info` commands that read the store catalog and present entries. `list`
SHALL support filtering by `--type` (`skill` or `prompt`), `--agent`, and `--category`. `search <query>` SHALL match the
query against entry id, description, and tags. `info <id>` SHALL show a single entry's details, including its category
when it has one, or an error if the id is unknown. `list` and `search` output SHALL show each skill's category.

#### Scenario: List filtered by type

- **WHEN** the catalog has one skill and one prompt and `list --type skill` runs
- **THEN** only the skill entry is shown

#### Scenario: List filtered by category

- **WHEN** the catalog has skills in `workflow` and `quality` and `list --category quality` runs
- **THEN** only the `quality` skills are shown, and prompts are excluded

#### Scenario: Unknown category rejected

- **WHEN** `list --category nope` runs and `nope` is not an allowed category
- **THEN** the CLI reports the unknown category, names the allowed ones, and exits non-zero

#### Scenario: Search matches id, description, or tags

- **WHEN** `search <term>` runs and `<term>` appears in an entry's id, description, or a tag
- **THEN** that entry is included in the results, and entries with no match are excluded

#### Scenario: Info shows the category

- **WHEN** `info <id>` runs for a skill in category `workflow`
- **THEN** the output includes `category: workflow`

#### Scenario: Info for an unknown id

- **WHEN** `info <id>` runs with an id absent from the catalog
- **THEN** the CLI reports that the id was not found and exits non-zero

### Requirement: Resolve the store source

The CLI SHALL read `catalog.json` from `raw.githubusercontent.com/<owner>/<repo>/<ref>`, defaulting to
`Aliendreamer/ai.skills` at ref `main`, overridable by `--repo <owner/repo>` and `--ref <ref>` (and the `AI_SKILLS_REPO`
/ `AI_SKILLS_REF` environment variables). The fetched catalog SHALL be validated before use.

#### Scenario: Build the raw catalog URL

- **WHEN** resolving the catalog URL for repo `Aliendreamer/ai.skills` at ref `main`
- **THEN** the URL is `https://raw.githubusercontent.com/Aliendreamer/ai.skills/main/catalog.json`

#### Scenario: Override the repo and ref

- **WHEN** `--repo me/fork --ref dev` is given
- **THEN** the catalog URL targets `me/fork` at ref `dev`

### Requirement: Available as a .NET global tool

The CLI SHALL also be distributed as a .NET global tool that exposes the `ai-skills` command and implements the same
`list`/`search`/`info`/`add` behavior and flags as the npx implementation. The tool project SHALL set `PackAsTool` and a
`ToolCommandName` of `ai-skills`.

#### Scenario: Packaged as a dotnet tool

- **WHEN** the dotnet project is packed
- **THEN** it produces a tool package whose command is `ai-skills`

#### Scenario: Same command surface

- **WHEN** the dotnet tool is run with `--help`
- **THEN** it lists `list`, `search`, `info`, and `add` with the same flags as the npx CLI

#### Scenario: Behavioral parity for add

- **WHEN** `add my-skill --agent claude --project --yes` runs against the same catalog
- **THEN** the dotnet tool installs the skill to the same destination the npx CLI would use, and defers prompt-type
  entries the same way

### Requirement: Install skills with add

The CLI SHALL provide `add [ids...]` that installs the selected items to one or more agents. The
interactive `add` wizard SHALL also be the **default command**: running the CLI with no command (and
no operands) SHALL launch it directly.

With no ids and no `--all`, `add` SHALL run the interactive wizard with these steps: a **type filter**
(Skills / Prompts / Everything) that scopes the item list, a **multi-select** of the matching items, a
**multi-select** of agents, and a single **scope** prompt. `--all` SHALL select every item.

The wizard SHALL support going **back** one step: single-select steps (type, scope) SHALL offer a
back choice, and multi-select steps (items, agents) SHALL treat an empty submission as going back.
Going back from the first step (type) SHALL cancel the wizard without installing anything.

The target agents SHALL come from `--agent` — which accepts a comma-separated list (e.g. `claude,cursor`) — from
`--all-agents` (every supported agent), or from an interactive **multi-select** prompt. The scope SHALL come from
`--project`/`--global` or a single prompt asked once for the whole run after agents are chosen, defaulting to `project`.
`--yes` SHALL skip prompts, requiring agents to be specified via `--agent` or `--all-agents`.

Each selected item SHALL be fetched once and installed to every selected agent: `skill` entries via the skill installer,
`prompt` entries via the prompt installer (rendered to each agent's format). A failure on one item/agent pair SHALL be
reported without aborting the rest of the batch, and each result line SHALL name the agent.

#### Scenario: No command launches the wizard

- **WHEN** the CLI is run with no command and no operands
- **THEN** the interactive `add` wizard starts (the same as running `add` with no ids)

#### Scenario: Explicit commands still run

- **WHEN** the CLI is run as `list`, `search`, `info`, or `add` with arguments
- **THEN** that command runs as specified, not the default wizard

#### Scenario: Go back from a wizard step

- **WHEN** the user is at the agents step and submits an empty selection
- **THEN** the wizard returns to the items step with the previous choices intact

#### Scenario: Back from the first step cancels

- **WHEN** the user chooses back at the type step
- **THEN** the wizard exits without installing anything

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
