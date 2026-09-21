## MODIFIED Requirements

### Requirement: Content convention with frontmatter

The system SHALL define store content as items under `skills/` and `prompts/`, where each item declares its metadata in
YAML frontmatter that is the single source of truth for the catalog.

A skill item SHALL be a folder `skills/<id>/` containing `SKILL.md`. A prompt item SHALL be a folder `prompts/<id>/`
containing `PROMPT.md`. Frontmatter fields: `name` (= id), `description`, `type` (`skill` or `prompt`), `tags` (list),
`agents` (list), `version` (semver). Prompt items SHALL additionally declare `appPattern`.

An item folder MAY contain auxiliary files beside its `SKILL.md` or `PROMPT.md` — further markdown, executable scripts,
templates, or a licence file. Auxiliary files SHALL NOT carry catalog metadata: the catalog entry is derived from the
item's `SKILL.md` or `PROMPT.md` frontmatter alone, and any frontmatter in an auxiliary file is ignored for catalog
purposes. An item whose behaviour depends on auxiliary files SHALL say so in its description, because they do not reach
every target agent.

#### Scenario: Skill item with valid frontmatter

- **WHEN** `skills/example-skill/SKILL.md` declares name, description, type `skill`, tags, agents, and version
- **THEN** the item is recognized as a valid skill entry

#### Scenario: Prompt item with valid frontmatter

- **WHEN** `prompts/example-prompt/PROMPT.md` declares the skill fields plus type `prompt` and `appPattern`
- **THEN** the item is recognized as a valid prompt entry

#### Scenario: Non-item files are ignored

- **WHEN** a file such as `skills/README.md` exists without an item folder
- **THEN** it is not treated as a catalog item

#### Scenario: Auxiliary files do not produce entries

- **WHEN** `skills/example-skill/` contains `SKILL.md` plus scripts, a `rules/` folder, and a `LICENSE`
- **THEN** exactly one catalog entry is produced, from `SKILL.md`

#### Scenario: Auxiliary frontmatter is ignored

- **WHEN** an auxiliary markdown file inside an item folder carries its own YAML frontmatter
- **THEN** that frontmatter contributes nothing to the catalog

## ADDED Requirements

### Requirement: An item advertises only agents that can install it

An item's `agents` list SHALL name only agents for which that item type can actually be installed.
Advertising an agent the installer cannot resolve turns a browse-time promise into an install-time
error, and the catalog is the only thing a consumer can check before trying.

Agent support differs by item type: an agent that can receive prompts does not necessarily receive
skills. The list is therefore validated against the destinations available for the item's own
`type`, not against the set of known agents.

#### Scenario: Skill omits an agent with no skill destination

- **WHEN** a skill item is authored and an agent has no skill destination
- **THEN** that agent is absent from the skill's `agents` list

#### Scenario: Prompt keeps an agent that supports prompts

- **WHEN** a prompt item's agent has a prompt destination but no skill destination
- **THEN** that agent remains in the prompt's `agents` list

#### Scenario: Advertised agent resolves

- **WHEN** an item lists an agent and installation is attempted for it
- **THEN** a destination resolves and the install proceeds rather than raising an unsupported-agent
  error

### Requirement: Redistributed third-party items carry their licence and attribution

An item that redistributes work the store owner did not author SHALL ship that work's upstream
licence text as a file in the item folder, and SHALL name the upstream author and source in its
`SKILL.md`. Its frontmatter `author` SHALL name the upstream author rather than the store owner.

This is a licence obligation, not a courtesy: the store is published under its own copyright to
public package registries, and permissive licences condition redistribution on the notice
travelling with the copy. The catalog does not carry `author`, so the in-folder licence file is the
only place the notice reliably reaches an installed copy.

#### Scenario: Third-party item ships its licence

- **WHEN** an item redistributes third-party work
- **THEN** the item folder contains that work's upstream licence text, and `SKILL.md` names the
  upstream author and links its source

#### Scenario: Attribution survives installation

- **WHEN** a third-party item is installed for a folder-based agent
- **THEN** the upstream licence file is present in the installed copy

#### Scenario: Store-owned item needs no licence file

- **WHEN** an item is authored by the store owner
- **THEN** no per-item licence file is required and the repository licence governs it
