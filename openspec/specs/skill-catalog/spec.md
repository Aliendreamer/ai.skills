# skill-catalog

## Purpose

Define the store's content convention and the generated `catalog.json` contract — the single machine-readable source the
`npx` and `dotnet` CLIs consume to discover and install skills and prompts. Item metadata lives in YAML frontmatter; the
catalog is derived, validated, and loaded through one shared library.

## Requirements

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

### Requirement: Catalog generation

The system SHALL provide `generateCatalog(root)` that scans `skills/` and `prompts/`, parses each item's frontmatter,
and returns a `Catalog` object containing one `CatalogEntry` per item with fields: `id`, `type`, `description`, `tags`,
`agents`, `version`, optional `appPattern`, and a POSIX-style relative `path`.

#### Scenario: Generate from content tree

- **WHEN** `generateCatalog` runs over a tree with one skill and one prompt
- **THEN** the returned catalog contains exactly two entries with metadata matching their frontmatter and POSIX relative
  paths

#### Scenario: Deterministic serialization

- **WHEN** the catalog is written to `catalog.json` twice from unchanged content
- **THEN** both outputs are byte-identical (stable key order, trailing newline)

### Requirement: Catalog validation

The system SHALL provide `validateCatalog(catalog, root)` that returns a list of violations (empty when valid). It SHALL
enforce: ids are unique and kebab-case; required fields are present; `type` is `skill` or `prompt`; every value in
`agents` is one of `claude`, `codex`, `cursor`, `gemini`, `copilot`; `version` is valid semver; each `path` exists on
disk; and prompt entries declare `appPattern`.

#### Scenario: Valid catalog passes

- **WHEN** `validateCatalog` runs on a catalog whose entries satisfy every rule
- **THEN** it returns an empty list of violations

#### Scenario: Duplicate id rejected

- **WHEN** two entries share the same id
- **THEN** a violation naming both paths is returned

#### Scenario: Unknown agent rejected

- **WHEN** an entry lists an agent not in the allowed set
- **THEN** a violation identifying the entry and the bad agent is returned

#### Scenario: Invalid version rejected

- **WHEN** an entry's `version` is not valid semver
- **THEN** a violation is returned

#### Scenario: Missing path rejected

- **WHEN** an entry's `path` does not exist on disk
- **THEN** a violation is returned

#### Scenario: Prompt without appPattern rejected

- **WHEN** a `prompt` entry omits `appPattern`
- **THEN** a violation is returned

### Requirement: Catalog loading

The system SHALL provide `loadCatalog(file)` that reads and parses `catalog.json` and returns a typed `Catalog`,
rejecting input that fails validation so consumers (the CLIs) share one contract.

#### Scenario: Load a generated catalog

- **WHEN** `loadCatalog` reads a `catalog.json` produced by `generateCatalog`
- **THEN** it returns a `Catalog` equal to the generated one

#### Scenario: Reject an invalid catalog

- **WHEN** `loadCatalog` reads a `catalog.json` with a malformed entry
- **THEN** it raises an error rather than returning a partial catalog

### Requirement: Parse an in-memory catalog

The system SHALL provide `parseCatalog(data)` that validates an already-parsed catalog value (e.g. fetched over HTTP)
and returns a typed `Catalog`, throwing on structural problems. The `loadCatalog(file)` function SHALL be defined in
terms of `parseCatalog` so file and network sources share one validation path.

#### Scenario: Parse a valid in-memory catalog

- **WHEN** `parseCatalog` is given an object with a valid `entries` array
- **THEN** it returns the typed `Catalog`

#### Scenario: Reject an invalid in-memory catalog

- **WHEN** `parseCatalog` is given a value whose entries fail validation
- **THEN** it throws rather than returning a partial catalog

### Requirement: Tag-based grouping

Related items SHALL be groupable by a shared tag, with no change to the catalog schema, so that a user can discover a
whole set at once. A search for a group's tag SHALL return every item carrying that tag.

#### Scenario: Search returns a tag group

- **WHEN** several skills share the tag `smarttv` and `search smarttv` runs
- **THEN** all skills carrying the `smarttv` tag are returned, and items without it are excluded

### Requirement: Committed catalog stays current

The system SHALL provide a `validate` build target that fails when the committed `catalog.json` differs from a freshly
generated one, so the catalog cannot drift from the content.

#### Scenario: Stale catalog fails the build

- **WHEN** content changes but `catalog.json` is not regenerated, and `validate` runs
- **THEN** the target exits non-zero and reports that the catalog is out of date

#### Scenario: Up-to-date catalog passes

- **WHEN** `catalog.json` matches the current content and `validate` runs
- **THEN** the target exits zero

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
