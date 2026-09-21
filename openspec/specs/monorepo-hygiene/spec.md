# monorepo-hygiene

## Purpose

Defines what the monorepo hygiene skill inspects in an existing workspace, what it reports, and the
consent it needs before changing anything — so a repo built before the skeleton existed can be
brought up to it without the skill quietly rewriting a working setup.

## Requirements

### Requirement: The audit is read-only and reports before changing anything

The skill SHALL complete its inspection and present its findings before making any change. Every
proposed change SHALL name the exact file and the exact edit, so the user can judge it from the
report alone.

#### Scenario: Report precedes any edit

- **WHEN** the skill runs against a repository
- **THEN** it inspects and reports first, and no file is written until the user agrees

#### Scenario: User declines

- **WHEN** the user declines a proposed change
- **THEN** that file is left untouched and the remaining findings are still reported

### Requirement: Existing configuration is respected, not overwritten

A repository that already has a tool configured SHALL keep its configuration. The skill SHALL
report a divergence from the skeleton as a difference for the user to judge, never as a defect to
correct automatically. It SHALL only add what is absent, and only with consent.

#### Scenario: Tool present with different settings

- **WHEN** a repository configures a tool the skeleton also covers, with different settings
- **THEN** the difference is reported and the existing configuration is preserved

#### Scenario: Tool absent

- **WHEN** a repository has no configuration for a tool the skeleton covers
- **THEN** adding it is offered, with the exact file and content shown

#### Scenario: Hand-edited file

- **WHEN** a file the skill would write has local modifications
- **THEN** those modifications are reported and preserved unless the user asks for a replacement

### Requirement: The workspace shape is defined once, by the skeleton prompt

The skill SHALL NOT restate the workspace skeleton's contents. It SHALL express its checks against
that skeleton and point to it for the detail, so the two cannot drift.

#### Scenario: Skill references rather than duplicates

- **WHEN** the skill describes what a repository is missing
- **THEN** it names the missing piece and refers to the skeleton for its content, rather than
  reproducing that content

### Requirement: Findings are grouped and each carries a verdict

Findings SHALL be grouped by area — task wiring, commit hygiene, local development, test and
coverage, release, deployment — and each SHALL carry a verdict with a one-line reason rather than
being listed neutrally. A finding the skill cannot judge SHALL say so and say why.

#### Scenario: Finding carries a verdict

- **WHEN** a gap is found
- **THEN** it is reported with a recommended action and the reason for it

#### Scenario: Insufficient evidence

- **WHEN** the repository does not provide enough signal to judge a gap
- **THEN** the skill says so explicitly rather than guessing or staying silent

### Requirement: The audit does not run the repository's own tooling

Inspection SHALL be based on reading configuration and project files. The skill SHALL NOT run
builds, test suites, container stacks, or deployment commands to determine what a repository has,
because those have side effects and can be slow or destructive in an unfamiliar repo.

#### Scenario: Presence determined by reading

- **WHEN** the skill checks whether a capability is configured
- **THEN** it reads the relevant configuration rather than executing it

#### Scenario: Verification requires execution

- **WHEN** confirming a finding would require running the repository's tooling
- **THEN** the skill reports what it could not verify and leaves running it to the user
