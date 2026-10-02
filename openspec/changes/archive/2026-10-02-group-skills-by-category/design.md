## Context

`generateCatalog` (`libs/catalog/src/generate.ts`) scans exactly one level: every `skills/<id>/SKILL.md` becomes an
entry with `path: skills/<id>`. The installers never derive a path from an id — both CLIs extract the catalog entry's
`path` from the store tarball and copy it to a flat `<agent base>/skills/<id>`. The npx validator and the dotnet
`CatalogParser` (`System.Text.Json`, default options) both ignore unknown JSON properties. CLIs fetch `catalog.json`
and the tarball from the same ref.

So the folder layout is a store-side concern: only the generator, the validator, their fixtures and the browse
commands need to know about categories.

## Goals / Non-Goals

**Goals:**

- Skills grouped as `skills/<category>/<id>/` under five fixed categories.
- `category` in `catalog.json`, surfaced by `list --category`, `list`/`search` rows and `info` in both CLIs.
- No change for existing installs or for CLI versions already published.

**Non-Goals:**

- Grouping prompts (three items; no need yet).
- A category step in the interactive `add` wizard. Search and `list --category` cover discovery; the wizard can follow
  if the item list gets unwieldy.
- Nested categories or multiple categories per skill — tags already cover cross-cutting groupings.
- Moving or renaming install destinations.

## Decisions

### Category comes from the folder, not frontmatter

The generator sets `category` from the `skills/<category>/` segment. A frontmatter field would be a second source that
can disagree with the location, and moving a skill would need an edit in two places. The validator still checks
`category` against `path`, which guards hand-edited or third-party catalogs read by `parseCatalog`.

### Fixed category list in code

`SKILL_CATEGORIES = ['workflow', 'frontend', 'dependencies', 'quality', 'agent-setup']` in `libs/catalog/src/types.ts`,
mirrored in the dotnet CLI for the `--category` check. A fixed list catches typos (`qualty/`) that free-form folders
would turn into a new category silently. The cost is that adding a category is a small code change in both CLIs —
acceptable, since categories should change rarely.

Alternative considered: derive the allowed set from the folders present. Rejected: a typo folder would validate.

### Ungrouped skills fail generation

A `SKILL.md` directly at `skills/<id>/` makes `generateCatalog` throw, naming the folder. Today such a folder would
become an entry; after the change it would otherwise be skipped as a "category" with no items, and the skill would
vanish from the store without an error. Failing loudly also catches skills added on a branch created before the move.

### Serialized key order

`category` goes after `version` and before `path`, keeping `path` last as today. Prompts omit the key (not `null`) so
their entries serialize unchanged.

### One commit for moves and catalog

All `git mv`s and the regenerated `catalog.json` land in one commit. A CLI reading `main` between a move commit and a
catalog commit would get a `path` that is missing from the tarball and fail the install. `git mv` keeps per-file history
reachable with `git log --follow`.

### CLI behavior for unknown `--category`

Both CLIs reject a value outside the allowed list with the list of valid names, rather than printing "No matching
items", so a typo is distinguishable from an empty category.

## Risks / Trade-offs

- [Open branches still add skills at `skills/<id>/`] → generation fails with a message telling the author to move the
  folder into a category; the `validate` target already runs on every change.
- [Older CLIs do not show categories] → acceptable; they keep installing correctly, which is the property that matters.
- [Third-party catalog forks without `category`] → the validator rejects skill entries lacking it. Forks regenerate
  their catalog with the new generator; nothing else consumes this format.
- [Category assignments are judgement calls] (e.g. `design-review`, `md-files-audit`) → moving a skill later is one
  `git mv` plus a regenerated catalog, with no effect on installs.

## Migration Plan

1. Land library, CLI and spec changes together with the folder moves and regenerated catalog (single PR).
2. Release new npx and NuGet versions for the `--category` filter. No user action is needed; already-installed skills
   are untouched.
3. Rollback: revert the PR. Catalogs without `category` are what released CLIs already read.
