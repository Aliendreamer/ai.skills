# cli

## Purpose

Define the behavior contract of the `ai-skills` command-line interface — browsing the store
(`list`/`search`/`info`) and installing skills (`add`) — shared by the npx and dotnet
implementations so both behave identically.

## Requirements

### Requirement: Browse the catalog
The CLI SHALL provide `list`, `search`, and `info` commands that read the store catalog and
present entries. `list` SHALL support filtering by `--type` (`skill` or `prompt`) and `--agent`.
`search <query>` SHALL match the query against entry id, description, and tags. `info <id>` SHALL
show a single entry's details, or an error if the id is unknown.

#### Scenario: List filtered by type
- **WHEN** the catalog has one skill and one prompt and `list --type skill` runs
- **THEN** only the skill entry is shown

#### Scenario: Search matches id, description, or tags
- **WHEN** `search <term>` runs and `<term>` appears in an entry's id, description, or a tag
- **THEN** that entry is included in the results, and entries with no match are excluded

#### Scenario: Info for an unknown id
- **WHEN** `info <id>` runs with an id absent from the catalog
- **THEN** the CLI reports that the id was not found and exits non-zero

### Requirement: Resolve the store source
The CLI SHALL read `catalog.json` from `raw.githubusercontent.com/<owner>/<repo>/<ref>`,
defaulting to `Aliendreamer/ai.skills` at ref `main`, overridable by `--repo <owner/repo>` and
`--ref <ref>` (and the `AI_SKILLS_REPO` / `AI_SKILLS_REF` environment variables). The fetched
catalog SHALL be validated before use.

#### Scenario: Build the raw catalog URL
- **WHEN** resolving the catalog URL for repo `Aliendreamer/ai.skills` at ref `main`
- **THEN** the URL is `https://raw.githubusercontent.com/Aliendreamer/ai.skills/main/catalog.json`

#### Scenario: Override the repo and ref
- **WHEN** `--repo me/fork --ref dev` is given
- **THEN** the catalog URL targets `me/fork` at ref `dev`

### Requirement: Available as a .NET global tool
The CLI SHALL also be distributed as a .NET global tool that exposes the `ai-skills` command and
implements the same `list`/`search`/`info`/`add` behavior and flags as the npx implementation.
The tool project SHALL set `PackAsTool` and a `ToolCommandName` of `ai-skills`.

#### Scenario: Packaged as a dotnet tool
- **WHEN** the dotnet project is packed
- **THEN** it produces a tool package whose command is `ai-skills`

#### Scenario: Same command surface
- **WHEN** the dotnet tool is run with `--help`
- **THEN** it lists `list`, `search`, `info`, and `add` with the same flags as the npx CLI

#### Scenario: Behavioral parity for add
- **WHEN** `add my-skill --agent claude --project --yes` runs against the same catalog
- **THEN** the dotnet tool installs the skill to the same destination the npx CLI would use, and
  defers prompt-type entries the same way

### Requirement: Install skills with add
The CLI SHALL provide `add [ids...]` that installs the selected skill items. With no ids and no
`--all`, it SHALL present an interactive multi-select of catalog items. `--all` SHALL select
every item. The target agent SHALL come from `--agent` or an interactive prompt; the scope SHALL
come from `--project`/`--global` or a prompt, defaulting to `project`. `--yes` SHALL skip prompts,
requiring `--agent` to be present. Each selected skill SHALL be fetched and installed via the
install library.

#### Scenario: Add explicit skill ids non-interactively
- **WHEN** `add my-skill --agent claude --project --yes` runs and `my-skill` is a skill
- **THEN** the skill is fetched and installed to the claude project destination, with no prompts

#### Scenario: Unknown id rejected
- **WHEN** `add nope --agent claude --yes` runs and `nope` is not in the catalog
- **THEN** the CLI reports the unknown id and exits non-zero without installing anything

#### Scenario: --yes without an agent
- **WHEN** `add my-skill --yes` runs with no `--agent`
- **THEN** the CLI reports that `--agent` is required with `--yes` and exits non-zero

#### Scenario: Adding a prompt is deferred
- **WHEN** `add a-prompt --agent claude --yes` runs and `a-prompt` is a `prompt` entry
- **THEN** the CLI reports that prompt installation is not yet supported and installs nothing for it

#### Scenario: Add all items
- **WHEN** `add --all --agent claude --project --yes` runs
- **THEN** every skill entry is installed and every prompt entry is reported as deferred
