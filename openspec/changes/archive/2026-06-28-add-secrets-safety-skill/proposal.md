## Why

Agents had no enforced rules around reading or echoing secrets, and the harness audit skill
lacked a check for secrets sources being gitignored. Without explicit discipline, an agent
could write a script that reads `config.conf`, echo a password to output, or run a
credential-touching operation on the user's behalf.

## What Changes

- **New skill** `secrets-safety` — discipline skill enforcing: never read the secrets source
  (file, folder, or pattern like `.env.*`), never echo secrets to output, suppress output of
  commands that may expose secrets, and defer credential-touching operations to the user.
- **Updated skill** `llm-setup-audit` — adds Check 10 (secrets source is gitignored),
  cross-reference to `secrets-safety` in Check 5, generalised "secrets file" language to
  cover files/folders/glob patterns, updated common-mistakes table.
- **Updated skill** `dev-flow` — new mandatory "Security" section referencing `secrets-safety`
  before the Red Flags section.

## Capabilities

### New Capabilities

- `secrets-safety`: Agent behavioral discipline for handling credentials — forbids reading
  secrets sources, echoing secrets, running credential operations; defines what counts as a
  secrets source (file, folder, `.env.*` pattern).

### Modified Capabilities

- `llm-setup-audit`: Adds gitignore check for secrets sources and cross-references
  `secrets-safety` for runtime behavioral rules.

## Impact

- `.claude/skills/secrets-safety/SKILL.md` — new file
- `.claude/skills/dev-flow/SKILL.md` — new Security section added
- `skills/llm-setup-audit/SKILL.md` — Check 10 added, description tightened, common mistakes updated
