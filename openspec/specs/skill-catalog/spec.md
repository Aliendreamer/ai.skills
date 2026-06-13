# skill-catalog

## Purpose

Define the store's content convention and the generated `catalog.json` contract — the single
machine-readable source the `npx` and `dotnet` CLIs consume to discover and install skills and
prompts. Item metadata lives in YAML frontmatter; the catalog is derived, validated, and loaded
through one shared library.

## Requirements

### Requirement: Content convention with frontmatter
The system SHALL define store content as items under `skills/` and `prompts/`, where each item
declares its metadata in YAML frontmatter that is the single source of truth for the catalog.

A skill item SHALL be a folder `skills/<id>/` containing `SKILL.md`. A prompt item SHALL be a
folder `prompts/<id>/` containing `PROMPT.md`. Frontmatter fields: `name` (= id), `description`,
`type` (`skill` or `prompt`), `tags` (list), `agents` (list), `version` (semver). Prompt items
SHALL additionally declare `appPattern`.

#### Scenario: Skill item with valid frontmatter
- **WHEN** `skills/example-skill/SKILL.md` declares name, description, type `skill`, tags,
  agents, and version
- **THEN** the item is recognized as a valid skill entry

#### Scenario: Prompt item with valid frontmatter
- **WHEN** `prompts/example-prompt/PROMPT.md` declares the skill fields plus type `prompt` and
  `appPattern`
- **THEN** the item is recognized as a valid prompt entry

#### Scenario: Non-item files are ignored
- **WHEN** a file such as `skills/README.md` exists without an item folder
- **THEN** it is not treated as a catalog item

### Requirement: Catalog generation
The system SHALL provide `generateCatalog(root)` that scans `skills/` and `prompts/`, parses
each item's frontmatter, and returns a `Catalog` object containing one `CatalogEntry` per item
with fields: `id`, `type`, `description`, `tags`, `agents`, `version`, optional `appPattern`,
and a POSIX-style relative `path`.

#### Scenario: Generate from content tree
- **WHEN** `generateCatalog` runs over a tree with one skill and one prompt
- **THEN** the returned catalog contains exactly two entries with metadata matching their
  frontmatter and POSIX relative paths

#### Scenario: Deterministic serialization
- **WHEN** the catalog is written to `catalog.json` twice from unchanged content
- **THEN** both outputs are byte-identical (stable key order, trailing newline)

### Requirement: Catalog validation
The system SHALL provide `validateCatalog(catalog, root)` that returns a list of violations
(empty when valid). It SHALL enforce: ids are unique and kebab-case; required fields are
present; `type` is `skill` or `prompt`; every value in `agents` is one of
`claude`, `codex`, `cursor`, `gemini`, `copilot`; `version` is valid semver; each `path` exists
on disk; and prompt entries declare `appPattern`.

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
The system SHALL provide `loadCatalog(file)` that reads and parses `catalog.json` and returns a
typed `Catalog`, rejecting input that fails validation so consumers (the CLIs) share one
contract.

#### Scenario: Load a generated catalog
- **WHEN** `loadCatalog` reads a `catalog.json` produced by `generateCatalog`
- **THEN** it returns a `Catalog` equal to the generated one

#### Scenario: Reject an invalid catalog
- **WHEN** `loadCatalog` reads a `catalog.json` with a malformed entry
- **THEN** it raises an error rather than returning a partial catalog

### Requirement: Committed catalog stays current
The system SHALL provide a `validate` build target that fails when the committed `catalog.json`
differs from a freshly generated one, so the catalog cannot drift from the content.

#### Scenario: Stale catalog fails the build
- **WHEN** content changes but `catalog.json` is not regenerated, and `validate` runs
- **THEN** the target exits non-zero and reports that the catalog is out of date

#### Scenario: Up-to-date catalog passes
- **WHEN** `catalog.json` matches the current content and `validate` runs
- **THEN** the target exits zero
