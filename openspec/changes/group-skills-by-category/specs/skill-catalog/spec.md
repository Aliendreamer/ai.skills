## MODIFIED Requirements

### Requirement: Content convention with frontmatter

The system SHALL define store content as items under `skills/` and `prompts/`, where each item declares its metadata in
YAML frontmatter that is the single source of truth for the catalog.

A skill item SHALL be a folder `skills/<category>/<id>/` containing `SKILL.md`, where `<category>` is one of
`workflow`, `frontend`, `dependencies`, `quality`, `agent-setup`. A prompt item SHALL be a folder `prompts/<id>/`
containing `PROMPT.md`. Frontmatter fields: `name` (= id), `description`, `type` (`skill` or `prompt`), `tags` (list),
`agents` (list), `version` (semver). Prompt items SHALL additionally declare `appPattern`. A skill's category SHALL come
from its folder alone; frontmatter does not declare it.

An item folder MAY contain auxiliary files beside its `SKILL.md` or `PROMPT.md` — further markdown, executable scripts,
templates, or a licence file. Auxiliary files SHALL NOT carry catalog metadata: the catalog entry is derived from the
item's `SKILL.md` or `PROMPT.md` frontmatter alone, and any frontmatter in an auxiliary file is ignored for catalog
purposes. An item whose behaviour depends on auxiliary files SHALL say so in its description, because they do not reach
every target agent.

#### Scenario: Skill item with valid frontmatter

- **WHEN** `skills/workflow/example-skill/SKILL.md` declares name, description, type `skill`, tags, agents, and version
- **THEN** the item is recognized as a valid skill entry in category `workflow`

#### Scenario: Prompt item with valid frontmatter

- **WHEN** `prompts/example-prompt/PROMPT.md` declares the skill fields plus type `prompt` and `appPattern`
- **THEN** the item is recognized as a valid prompt entry

#### Scenario: Non-item files are ignored

- **WHEN** a file such as `skills/README.md` or `skills/workflow/README.md` exists without an item folder
- **THEN** it is not treated as a catalog item

#### Scenario: Auxiliary files do not produce entries

- **WHEN** `skills/workflow/example-skill/` contains `SKILL.md` plus scripts, a `rules/` folder, and a `LICENSE`
- **THEN** exactly one catalog entry is produced, from `SKILL.md`

#### Scenario: Auxiliary frontmatter is ignored

- **WHEN** an auxiliary markdown file inside an item folder carries its own YAML frontmatter
- **THEN** that frontmatter contributes nothing to the catalog

#### Scenario: Ungrouped skill folder is reported

- **WHEN** `skills/example-skill/SKILL.md` exists directly under `skills/`, outside any category folder
- **THEN** catalog generation fails and names the folder, rather than silently skipping it

### Requirement: Catalog generation

The system SHALL provide `generateCatalog(root)` that scans `skills/<category>/` and `prompts/`, parses each item's
frontmatter, and returns a `Catalog` object containing one `CatalogEntry` per item with fields: `id`, `type`,
`description`, `tags`, `agents`, `version`, optional `appPattern`, `category` (skill entries only, taken from the
category folder), and a POSIX-style relative `path`.

#### Scenario: Generate from content tree

- **WHEN** `generateCatalog` runs over a tree with one skill in `skills/quality/` and one prompt
- **THEN** the returned catalog contains exactly two entries with metadata matching their frontmatter and POSIX relative
  paths, the skill carrying `category: quality` and the prompt carrying no category

#### Scenario: Deterministic serialization

- **WHEN** the catalog is written to `catalog.json` twice from unchanged content
- **THEN** both outputs are byte-identical (stable key order, trailing newline)

### Requirement: Catalog validation

The system SHALL provide `validateCatalog(catalog, root)` that returns a list of violations (empty when valid). It SHALL
enforce: ids are unique across all categories and kebab-case; required fields are present; `type` is `skill` or
`prompt`; every value in `agents` is one of `claude`, `codex`, `cursor`, `gemini`, `copilot`; `version` is valid
semver; each `path` exists on disk; prompt entries declare `appPattern`; skill entries declare a `category` from the
allowed set whose value matches the category segment of their `path`; and prompt entries declare no `category`.

#### Scenario: Valid catalog passes

- **WHEN** `validateCatalog` runs on a catalog whose entries satisfy every rule
- **THEN** it returns an empty list of violations

#### Scenario: Duplicate id rejected

- **WHEN** two entries share the same id, including two skills in different categories
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

#### Scenario: Unknown category rejected

- **WHEN** a skill entry's `category` is missing or not in the allowed set
- **THEN** a violation identifying the entry and the bad category is returned

#### Scenario: Category disagrees with path

- **WHEN** a skill entry has `category: quality` but `path: skills/workflow/example-skill`
- **THEN** a violation is returned

## ADDED Requirements

### Requirement: Grouping does not change install destinations

Moving a skill between category folders SHALL NOT change where it installs: destinations remain
`<agent base>/skills/<id>` with no category segment. A catalog carrying `category` SHALL remain readable by consumers
that predate the field, which install from `path` and ignore unknown fields.

#### Scenario: Grouped skill installs flat

- **WHEN** a skill at `skills/workflow/clear-git` is installed for `claude` at project scope
- **THEN** it lands in `<project>/.claude/skills/clear-git`

#### Scenario: Older consumer reads the new catalog

- **WHEN** a consumer that does not know `category` parses a catalog containing it
- **THEN** parsing succeeds and installs resolve from each entry's `path`
