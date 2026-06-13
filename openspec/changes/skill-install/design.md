## Context

`libs/catalog` produces a typed `CatalogEntry` with `id`, `type`, `agents`, and a POSIX `path`
relative to the repo root. Installing a skill means: fetch its folder from the store repo, then
copy it to the agent's skills location under a project or global base. This change builds the
shared, tested logic. Verified agent conventions (2026-06):

- claude skills: `<base>/.claude/skills/<id>/`
- codex skills: `<base>/.agents/skills/<id>/` (project walks up; user `~/.agents/skills`)
- copilot skills: project `./.github/skills/<id>/`, global `~/.copilot/skills/<id>/`
- cursor: `./.cursor/rules/<id>.mdc` (single file; project only — no global rules dir)
- gemini: no skills concept → not a skill target

## Goals / Non-Goals

**Goals:**
- A pure `resolveSkillDestination(agent, scope, id, bases)` for the four skill-capable agents.
- A `fetchItem(repo, ref, subpath, destDir)` that downloads + extracts via the GitHub tarball.
- An `installSkill(sourceDir, agent, scope, id, bases)` that copies into the resolved path.
- Tested without network for resolution and copy; URL building unit-tested; extraction tested
  against a local tarball fixture.

**Non-Goals:**
- Prompt installation and per-agent format wrapping (later change).
- Gemini support; the CLI UX (`add`, interactive selection) — sub-projects 3–4.
- Uninstall/update.

## Decisions

- **Adapter shape: a lookup of `(agent) -> { scopes, destFor(scope, id, bases) }`** rather than
  classes. Pure functions are trivial to test and to port to C#. Alternative (class hierarchy)
  rejected as heavier with no benefit at this size.
- **Scope bases are injected** (`{ project: cwd, home: os.homedir() }`) so resolution is pure
  and testable; the CLI supplies real bases. Cursor supports `project` only; requesting `global`
  for cursor is an error.
- **Cursor install writes a single `.mdc`** copied from the skill's `SKILL.md` (markdown +
  frontmatter is what Cursor reads). The rest of the skill folder is dropped for cursor. This is
  a copy, not a content transform.
- **Fetch via `codeload.github.com/<owner>/<repo>/tar.gz/<ref>`** (default ref `main`), extract
  only entries under `<repo>-<ref>/<subpath>/`. No `git`. The sandbox already allows
  `codeload.github.com`.
- **Tar extraction**: stream the gzip tarball; reuse a small dependency if Node lacks one. Prefer
  Node's built-ins + a minimal `tar` parser; if a dep is needed, add `tar`.

## Risks / Trade-offs

- [Repo not yet published to GitHub] → live fetch can't be tested against this repo; mitigate by
  unit-testing URL construction and testing extraction against a committed local `.tar.gz`
  fixture. Live fetch verified once a remote exists.
- [Agent conventions drift] → conventions centralized in one adapter table; updating is a
  one-place change with tests.
- [Cursor dropping non-SKILL.md files] → acceptable for v1; documented. Skills meant for cursor
  should be self-contained in SKILL.md.

## Open Questions

- Whether to also support `~/.agents/skills` as a shared global target for codex AND copilot
  (both accept it). Default: use each agent's primary path; revisit if users want a single shared
  dir.
