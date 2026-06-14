## 1. Tooling + config

- [x] 1.1 Add `markdownlint-cli2` dev dependency
- [x] 1.2 Add `.markdownlint-cli2.jsonc` (default rules; `MD013` length 120, code/tables exempt; globs = authored scope; ignores = `.claude/**`, `openspec/changes/archive/**`, build dirs)
- [x] 1.3 Add root scripts `lint:md` (`markdownlint-cli2`) and `lint:md:fix` (`--fix`)

## 2. Fix to zero

- [x] 2.1 Run `lint:md:fix` to auto-resolve spacing/blank-line/heading rules
- [x] 2.2 Hand-fix the residue: code-fence languages (MD040), list numbering (MD029), first-line heading (MD041), any remaining MD013 prose lines
- [x] 2.3 `lint:md` reports zero violations — output seen

## 3. Gate + verify

- [x] 3.1 Wire `lint:md` into the dev-flow Stop-hook gate
- [x] 3.2 `nx run-many -t lint test build typecheck` still green (no code touched)
- [x] 3.3 `openspec validate markdown-lint` passes
