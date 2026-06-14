## Context

The store had 4 starter skills. The user supplied 9 more from real projects, in two semantic
sets (smart-TV development; React quality gates). They arrived in mixed shape — some with a
nested `metadata:` block, some with no frontmatter, folder/name mismatches, and a typo. Grouping
was decided as **tags only** (no subfolder/catalog change).

## Goals / Non-Goals

**Goals:**
- All 9 skills conform to the catalog template and validate.
- Related skills are discoverable as a group via a shared tag.

**Non-Goals:**
- Category subfolders in `skills/` (declined — tags suffice).
- Any change to the catalog generator/validator code.

## Decisions

- **`name` = folder** for every skill (the id is the install target). Where the supplied
  frontmatter `name` differed from the folder, the folder won; the only folder rename was the
  typo fix `cirtular-check` → `circular-check`.
- **Flat frontmatter** (`version`, `author`) replacing the supplied nested `metadata:` block;
  `version` normalized to a valid semver (`0.1.0`); descriptions quoted (one single-quoted to
  hold an inner `type="button"`).
- **Tag grouping**: `smarttv` for the 6 TV skills, `react-dev` for the 3 quality gates, plus
  specific tags. `graphql-audit` is a smart-TV skill (the TV app's GraphQL gate), not a separate
  group.

## Risks / Trade-offs

- [Flat folders, many skills] → as the store grows, tags carry grouping; revisit subfolders only
  if browsing on GitHub becomes unwieldy.
- [Pinned skill content references repo-specific paths (e.g. `../SmartTVApp`, `src/`)] → acceptable;
  these are opinionated, project-shaped skills by design.

## Open Questions

- Whether to later add a `--tag` filter to `list` (today grouping works via `search <tag>`).
