## ADDED Requirements

### Requirement: Tag-based grouping
Related items SHALL be groupable by a shared tag, with no change to the catalog schema, so that a
user can discover a whole set at once. A search for a group's tag SHALL return every item
carrying that tag.

#### Scenario: Search returns a tag group
- **WHEN** several skills share the tag `smarttv` and `search smarttv` runs
- **THEN** all skills carrying the `smarttv` tag are returned, and items without it are excluded
