## Purpose

Defines the behaviour a repository's Claude Code context-injection hooks MUST exhibit so that
standing guidance reaches the agent without being re-injected on every turn, since hook
`additionalContext` accumulates in the conversation and is never compacted away.

## ADDED Requirements

### Requirement: Each hook speaks once per session

A context-injection hook SHALL emit its text at most once per session, regardless of how many times
the hook fires. Repetition SHALL be suppressed by claiming a per-session marker keyed on the
session id and a hook-specific name; the first claim succeeds and every later claim for the same
pair fails.

#### Scenario: First fire emits

- **WHEN** a hook fires for a session id it has not yet claimed
- **THEN** it emits its context text

#### Scenario: Later fires stay silent

- **WHEN** the same hook fires again for the same session id
- **THEN** it emits nothing and exits successfully

#### Scenario: A new session speaks again

- **WHEN** the same hook fires for a different session id
- **THEN** it emits its context text

### Requirement: A hook never fails a turn

A hook SHALL exit zero and write nothing to stderr under every condition it can encounter, including
malformed or absent stdin, an unreadable marker directory, a missing context file, and an absent
`jq`. Degradation SHALL be silent rather than loud: a hook that cannot determine its state MAY still
emit its text once, but MUST NOT surface an error to the turn.

#### Scenario: Malformed stdin still speaks once

- **WHEN** a hook receives input that is not valid JSON
- **THEN** it exits zero, treats the session as the fallback identity, and emits its text at most
  once for that fallback rather than failing or reporting an error

#### Scenario: Marker directory unavailable

- **WHEN** the marker directory cannot be created or written
- **THEN** the hook exits zero with no output

#### Scenario: jq missing

- **WHEN** `jq` is not on PATH
- **THEN** the hook exits zero, emits nothing, and writes nothing to stderr

#### Scenario: Prerequisite is checked at install time

- **WHEN** the kit is installed
- **THEN** the installation verifies `jq` is present and reports its absence, because a missing `jq`
  is otherwise indistinguishable from hooks working correctly

### Requirement: Session markers live outside the repository

Markers SHALL be stored under the machine's temporary directory, keyed on the user id, so they never
appear in `git status` and are removed by the machine's temp sweep. Markers older than seven days
SHALL be pruned opportunistically, and only on the path that already claims a marker, so the
suppressed path stays free of filesystem scanning.

#### Scenario: Markers are not repository files

- **WHEN** a hook has claimed a marker for the current session
- **THEN** the repository working tree is unchanged

#### Scenario: Stale markers are pruned

- **WHEN** a hook claims a marker and markers older than seven days exist
- **THEN** those stale markers are deleted

#### Scenario: Suppressed path does not scan

- **WHEN** a hook fires for a session whose marker already exists
- **THEN** it performs no pruning scan

### Requirement: Hook text is project-owned and separately addressable

The text a hook injects SHALL be read from a project-owned file rather than embedded in the hook
script or in `settings.json`. A missing or empty text file SHALL mean "stay silent", so a repository
can disable one hook without editing `settings.json` or the scripts.

#### Scenario: Text file supplies the wording

- **WHEN** a hook's context file contains text and the hook has not yet spoken this session
- **THEN** the hook injects exactly that text, with trailing blank lines stripped

#### Scenario: Removing the file opts out

- **WHEN** a hook's context file is absent, empty, or renamed
- **THEN** the hook emits nothing and `settings.json` is unchanged

### Requirement: Hook text states only the delta

A hook's text SHALL NOT restate guidance the agent's always-loaded instruction file already carries.
Duplicated guidance is paid for twice — once always-loaded, once per injection — which is the cost
this capability exists to remove.

#### Scenario: Authoring checks the instruction file first

- **WHEN** a repository's hook text is authored or edited
- **THEN** the always-loaded instruction file is read first and every sentence it already makes is
  removed from the hook text

#### Scenario: Already-covered guidance is dropped, not injected

- **WHEN** the always-loaded instruction file already carries a hook's entire message
- **THEN** that hook's text file is removed rather than written, so the hook stays silent

### Requirement: Generic text ships ready; repo-specific text is authored on request

The kit SHALL ship usable text for guidance that does not vary by repository, so adopting it
requires no authoring. Text that must be derived from a repository's own instruction file SHALL ship
only as a clearly-marked example, and SHALL NOT be generated without the user's agreement: deriving
it means reading that repository's instruction file and rewriting a file on the user's behalf.

#### Scenario: Repository-neutral text is usable on arrival

- **WHEN** the kit is installed
- **THEN** the hook whose message is repository-neutral has working text in place and needs no edit

#### Scenario: Repository-specific text is offered, not assumed

- **WHEN** installation reaches the hook whose text must be derived from the repository
- **THEN** the user is asked whether to scan the instruction file and write that text, and nothing
  is written until they agree

#### Scenario: Declining leaves the hook silent

- **WHEN** the user declines the scan
- **THEN** the example file is left in place unrenamed, that hook stays silent, and the rest of the
  installation completes

### Requirement: Per-prompt injection is opt-in and justified

Text injected on every prompt SHALL be off by default. The capability MAY support a separate
per-prompt text file, used from the second prompt of a session onward, but it SHALL NOT ship one,
because a per-turn cost overtakes a single one-shot injection within a handful of prompts.

#### Scenario: No per-prompt text by default

- **WHEN** the kit is installed without a per-prompt text file
- **THEN** nothing is injected after the first prompt of a session

#### Scenario: Per-prompt text is used when present

- **WHEN** a per-prompt text file exists and the session's one-shot marker is already claimed
- **THEN** the per-prompt text is injected instead of the one-shot text

### Requirement: The search-nudge hook fires only on actual searches

A hook that nudges toward semantic code search SHALL inspect the intercepted tool call and stay
silent when no text search is being run. A dedicated search tool counts as a search by definition; a
shell call counts only when its command line actually invokes a text-search program.

#### Scenario: Shell text search triggers the nudge

- **WHEN** a shell tool call whose command runs `grep`, `egrep`, `fgrep`, or `rg` is intercepted
- **THEN** the hook emits its context text, subject to the once-per-session rule

#### Scenario: Unrelated shell command stays silent

- **WHEN** a shell tool call that runs no text-search program is intercepted
- **THEN** the hook emits nothing and claims no marker

#### Scenario: Search tool always counts

- **WHEN** a dedicated text-search tool call is intercepted
- **THEN** the hook emits its context text, subject to the once-per-session rule

### Requirement: Session identifiers are sanitised before use as paths

A session identifier taken from hook input SHALL be reduced to filename-safe characters before it is
used to construct a marker path, so that hook input cannot direct a write outside the marker
directory.

#### Scenario: Unsafe characters are stripped

- **WHEN** hook input supplies a session id containing path separators or other unsafe characters
- **THEN** those characters are removed before the marker path is built

#### Scenario: Absent session id has a fallback

- **WHEN** hook input carries no session id
- **THEN** a fixed placeholder is used and the hook still behaves correctly
