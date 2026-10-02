## MODIFIED Requirements

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
