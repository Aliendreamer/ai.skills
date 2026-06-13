# skill-install

## Purpose

Define the shared logic for installing a store skill onto disk: resolving the destination for a
target agent and scope, fetching an item from the store repo via the GitHub tarball (no `git`),
and copying it into place. The npx and dotnet CLIs build on this contract.

## Requirements

### Requirement: Agent skill destination resolution
The system SHALL resolve the on-disk destination for a skill given an agent, a scope, the skill
id, and the scope base directories. Supported skill agents are `claude`, `codex`, `copilot`, and
`cursor`. Scope is `project` or `global`, resolved against injected bases
(`{ project, home }`). Destinations:

- `claude` → `<base>/.claude/skills/<id>`
- `codex` → `<base>/.agents/skills/<id>`
- `copilot` → project `<project>/.github/skills/<id>`, global `<home>/.copilot/skills/<id>`
- `cursor` → `<project>/.cursor/rules/<id>.mdc` (project scope only)

#### Scenario: Resolve a claude project skill path
- **WHEN** resolving `claude`, scope `project`, id `my-skill`, bases `{ project: /repo, home: /home/u }`
- **THEN** the destination is `/repo/.claude/skills/my-skill`

#### Scenario: Resolve a codex global skill path
- **WHEN** resolving `codex`, scope `global`, id `my-skill`, bases `{ project: /repo, home: /home/u }`
- **THEN** the destination is `/home/u/.agents/skills/my-skill`

#### Scenario: Cursor rejects global scope
- **WHEN** resolving `cursor` with scope `global`
- **THEN** the system raises an error stating cursor supports project scope only

#### Scenario: Unsupported agent rejected
- **WHEN** resolving an agent with no skill adapter (e.g. `gemini`)
- **THEN** the system raises an error stating the agent does not support skills

### Requirement: Fetch an item from the store via GitHub tarball
The system SHALL fetch an item's folder from the store repository by downloading the GitHub
tarball and extracting only the requested subpath, without requiring `git`. The tarball URL
SHALL be `https://codeload.github.com/<owner>/<repo>/tar.gz/<ref>` with `ref` defaulting to
`main`, and extraction SHALL strip the leading `<repo>-<ref>/` prefix.

#### Scenario: Build the tarball URL
- **WHEN** building the fetch URL for owner `Aliendreamer`, repo `ai.skills`, ref `main`
- **THEN** the URL is `https://codeload.github.com/Aliendreamer/ai.skills/tar.gz/main`

#### Scenario: Extract only the requested subpath
- **WHEN** extracting subpath `skills/my-skill` from a store tarball into a destination directory
- **THEN** the destination contains the files of `skills/my-skill` with the `<repo>-<ref>/skills/my-skill/`
  prefix stripped, and no other items

### Requirement: Install a skill into an agent directory
The system SHALL install a fetched skill from a source directory into the resolved agent
destination. For `claude`, `codex`, and `copilot` the whole skill folder SHALL be copied. For
`cursor` the skill's `SKILL.md` SHALL be copied to a single `<id>.mdc` file at the destination.

#### Scenario: Install a folder-based skill
- **WHEN** installing a source skill directory for `claude`, scope `project`, id `my-skill`
- **THEN** `<project>/.claude/skills/my-skill/SKILL.md` exists with the source contents

#### Scenario: Install a cursor rule
- **WHEN** installing a source skill directory for `cursor`, scope `project`, id `my-skill`
- **THEN** `<project>/.cursor/rules/my-skill.mdc` exists with the contents of the source `SKILL.md`

#### Scenario: Create missing destination directories
- **WHEN** the destination's parent directories do not yet exist
- **THEN** install creates them before writing files
