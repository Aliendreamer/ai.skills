## 1. Update setup-flow frontmatter

- [x] 1.1 Bump version from `0.1.0` to `0.2.0` in `skills/setup-flow/SKILL.md`
- [x] 1.2 Update description to mention `.claude/settings.json` setup
- [x] 1.3 Add `serena` and `settings` tags

## 2. Add Phase 2 section

- [x] 2.1 Append Phase 2 content to `skills/setup-flow/SKILL.md` (sections 2.1–2.6 + Common mistakes)
- [x] 2.2 All subsections present: existing file check, project type detection, prettier detection, plugin detection, compose/write, report
- [x] 2.3 Merge rules table (8 rows) included
- [x] 2.4 All hook JSON included (UserPromptSubmit always, PreToolUse always, PostToolUse conditional)

## 3. Quality gates

- [x] 3.1 `pnpm generate-catalog` → catalog.json updated (version 0.2.0, description updated)
- [x] 3.2 `pnpm lint:md` → 0 errors
- [x] 3.3 `pnpm validate` → valid and up-to-date
