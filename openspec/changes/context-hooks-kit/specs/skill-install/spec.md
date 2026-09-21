## MODIFIED Requirements

### Requirement: Install a skill into an agent directory

The system SHALL install a fetched skill from a source directory into the resolved agent destination. For `claude`,
`codex`, and `copilot` the whole skill folder SHALL be copied. For `cursor` the skill's `SKILL.md` SHALL be copied to a
single `<id>.mdc` file at the destination.

Copying the whole folder SHALL include auxiliary files at any depth, and SHALL preserve each file's mode so that an
executable script remains executable in the installed copy. Because the `cursor` destination is a single rendered file,
an item's auxiliary files SHALL NOT reach `cursor`; an item whose behaviour depends on them is degraded there, and the
installer SHALL NOT fail on that account.

#### Scenario: Install a folder-based skill

- **WHEN** installing a source skill directory for `claude`, scope `project`, id `my-skill`
- **THEN** `<project>/.claude/skills/my-skill/SKILL.md` exists with the source contents

#### Scenario: Install a cursor rule

- **WHEN** installing a source skill directory for `cursor`, scope `project`, id `my-skill`
- **THEN** `<project>/.cursor/rules/my-skill.mdc` exists with the contents of the source `SKILL.md`

#### Scenario: Create missing destination directories

- **WHEN** the destination's parent directories do not yet exist
- **THEN** install creates them before writing files

#### Scenario: Nested auxiliary files are installed

- **WHEN** installing for `claude` a source skill directory containing `kit/state.sh` and `kit/context/example.txt`
- **THEN** both files exist at the corresponding paths under the installed skill folder

#### Scenario: Executable mode is preserved

- **WHEN** installing for `claude` a source skill directory containing an executable script
- **THEN** the installed copy of that script is executable

#### Scenario: Cursor install drops auxiliary files

- **WHEN** installing for `cursor` a source skill directory containing auxiliary files
- **THEN** only `<id>.mdc` is written, no auxiliary files are installed, and the install succeeds
