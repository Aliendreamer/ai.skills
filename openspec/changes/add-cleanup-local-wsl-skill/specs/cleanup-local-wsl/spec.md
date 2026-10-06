## Purpose

Defines how the local WSL cleanup skill frees disk space on a WSL dev machine: what it measures and reports,
what it may delete itself after confirmation, what it must always hand to the user, and the dry-run contract of its
bundled scripts.

## ADDED Requirements

### Requirement: Report before deleting

The skill SHALL show the current disk usage and a dry-run report — every path or item that would be removed, with
its size and a total — before any deletion. Nothing SHALL be deleted until the user has seen that report and
confirmed.

#### Scenario: First run on a machine

- **WHEN** the user asks to clean up or free disk space
- **THEN** the skill shows disk usage, runs the dry runs, and presents what would be removed with sizes, deleting
  nothing

#### Scenario: User declines

- **WHEN** the user declines the deletion after seeing the report
- **THEN** nothing is removed and the skill ends with the commands the user can run later

#### Scenario: User narrows the scope

- **WHEN** the user wants to keep a category (for example `node_modules` of a project they are working on) or limit
  the project root
- **THEN** the skill re-runs the dry run with the narrowed scope and shows the new report before asking again

### Requirement: Agent deletes only regenerable user-space data

After confirmation the skill MAY run the deletions itself only for data that needs no `sudo` and can be regenerated:
project build output, nvm Node versions other than the kept ones, VS Code server caches, logs and superseded
extension versions, Gradle caches, pnpm unreferenced packages, and `git gc` of the BuildStorageRepo clone. The skill
SHALL NOT invoke `sudo`.

#### Scenario: Confirmed user-space cleanup

- **WHEN** the user confirms the reported deletions
- **THEN** the skill removes exactly the reported user-space items, without `sudo`, and shows disk usage after

#### Scenario: Deletion blocked

- **WHEN** a deletion the skill runs fails (permissions, sandbox, file in use)
- **THEN** the skill reports the failure and hands the user the exact command instead of retrying another way

#### Scenario: Running inside a VS Code remote session

- **WHEN** the agent runs inside a VS Code window connected to WSL
- **THEN** the skill does not delete VS Code server files itself and hands that command to the user, to be run with
  the VS Code windows closed

### Requirement: Privileged and session-ending steps are always handed off

The skill SHALL NOT run any step that needs `sudo` (apt autoremove/clean, journal vacuum, fstrim), removes a git
clone, prunes Docker, or shuts down WSL. It SHALL give the user each such command exactly, in the order to run them,
and say what each one does.

#### Scenario: Releasing space to Windows

- **WHEN** the user-space cleanup is done
- **THEN** the skill hands off `fstrim` and the WSL compact step, and states that the compact step closes every WSL
  session, including the agent's

#### Scenario: BuildStorageRepo removal requested

- **WHEN** the user wants the BuildStorageRepo clone removed rather than compacted
- **THEN** the skill hands off the removal command, and the script refuses it while the clone has uncommitted or
  unpushed work

### Requirement: Old Node versions follow a chosen keep policy

The skill SHALL ask which nvm keep policy applies before removing Node versions: the default keeps the current
version and the newest of each major; the strict policy keeps only the current version and the `default` alias
target. The kept versions SHALL be shown in the report.

#### Scenario: Default policy

- **WHEN** the user accepts the default policy
- **THEN** the report lists the current version and the newest of each major as kept, and only the others as removed

#### Scenario: Strict policy

- **WHEN** the user picks the strict policy
- **THEN** only the current and `default` versions are kept

### Requirement: Bundled scripts are dry run by default

Every bundled script that deletes data SHALL default to a dry run that prints what it would remove, and SHALL delete
only with an explicit flag. Unknown options SHALL be rejected with a non-zero exit. A missing optional tool SHALL be
reported and skipped, not treated as an error.

#### Scenario: Script run without flags

- **WHEN** any bundled cleanup script runs without arguments
- **THEN** it removes nothing and ends by saying how to apply the changes

#### Scenario: Unknown option

- **WHEN** a script receives an option it does not define
- **THEN** it exits non-zero naming the option, and removes nothing

#### Scenario: Optional tool absent

- **WHEN** a tool a step depends on (for example `nvm`, `pnpm`, `docker`) is not installed
- **THEN** that step is reported as skipped and the remaining steps run

#### Scenario: Orchestrator without trim

- **WHEN** the orchestrator runs with its delete flag and its no-trim flag
- **THEN** it performs the user-space deletions and does not invoke `sudo`
