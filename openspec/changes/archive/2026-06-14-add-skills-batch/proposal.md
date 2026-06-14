## Why

Seed the store with a batch of real, reusable skills extracted from working projects, and
establish a convention for grouping semantically-related skills so users can discover a set
(e.g. all smart-TV skills) at once.

## What Changes

- Add **9 skills**, conformed to the catalog template (frontmatter `name`=folder, quoted
  `description`, `type`, `tags`, `agents`, `version`, `author`):
  - **smart-tv** (tag `smarttv`): `audit-tv-focus`, `compact-tv-check`, `norigin-focus`,
    `scaffold-tv-screen`, `design-review`, `graphql-audit`.
  - **react-dev quality gates** (tag `react-dev`): `circular-check`, `semantic-html-audit`,
    `use-effect-guard`.
- Group related skills with a **shared tag** (flat folders — no catalog code change), so
  `search <tag>` surfaces the whole group.
- Regenerate `catalog.json` (17 entries total).

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `skill-catalog`: ADD a "tag-based grouping" requirement — related items are grouped by a
  shared tag and discoverable via search (no schema change; documents the convention).

## Impact

- New content under `skills/` (9 folders) + regenerated `catalog.json`.
- No code changes; relies on the existing frontmatter/catalog/search behavior.
- Establishes the tag-grouping convention used by future skill batches.
