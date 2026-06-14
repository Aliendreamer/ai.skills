## ADDED Requirements

### Requirement: Markdown lint configuration
The repo SHALL include a committed markdownlint-cli2 config that enables all markdownlint defaults
except `MD013`, which SHALL be set to `line_length: 120` with code blocks and tables exempt. The
config SHALL scope linting to authored docs (`skills/`, `prompts/`, `openspec/specs/`, `CLAUDE.md`)
and exclude vendored `.claude/**` content and `openspec/changes/archive/**`.

#### Scenario: Config applies the tuned rule set
- **WHEN** the markdown linter runs using the committed config
- **THEN** all default rules are active and `MD013` uses length 120 with code/tables exempt

#### Scenario: Out-of-scope files are not linted
- **WHEN** the linter runs
- **THEN** files under `.claude/` and `openspec/changes/archive/` are not reported

### Requirement: Authored markdown is warning-free
Authored markdown in scope SHALL produce zero markdownlint warnings, and a `lint:md` command SHALL
report success.

#### Scenario: Lint passes clean
- **WHEN** `lint:md` runs over the in-scope docs
- **THEN** it exits zero with no violations

### Requirement: Markdown lint is part of the quality gate
The dev-flow quality gate SHALL include markdown linting so a markdown regression fails the gate.

#### Scenario: A markdown violation fails the gate
- **WHEN** an in-scope file introduces a markdownlint violation and the gate runs
- **THEN** the gate reports the violation and does not pass
