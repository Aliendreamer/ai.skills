## ADDED Requirements

### Requirement: Audit must verify secrets source is gitignored
The audit skill SHALL include a check that the user's designated secrets source (file,
folder, or glob pattern) is present in `.gitignore` and not tracked by git. The sandbox
filesystem restriction is a runtime guardrail only; it does not prevent the secrets source
from being committed.

#### Scenario: Secrets source is a single file not in .gitignore
- **WHEN** `git check-ignore -v config.conf` returns no match
- **THEN** the audit SHALL report FLAG with a one-line fix: add the file to `.gitignore`

#### Scenario: Secrets source is a glob pattern such as .env.*
- **WHEN** `git ls-files --others --exclude-standard` reveals any `.env.*` files as tracked
- **THEN** the audit SHALL report FLAG for each tracked file

#### Scenario: Secrets source is a folder
- **WHEN** `git check-ignore -v secrets/` returns no match
- **THEN** the audit SHALL report FLAG with instruction to add `secrets/` to `.gitignore`

## MODIFIED Requirements

### Requirement: Audit must verify no secrets in committed settings (Check 5)
The audit skill SHALL check `.claude/settings.json` and `.claude/settings.local.json` for
secrets in `.env`, hook commands, and `mcpServers` args. It SHALL also cross-reference the
`secrets-safety` skill for agent behavioral rules that apply at runtime (not just in
committed configuration).

#### Scenario: Secret value found in settings.json env block
- **WHEN** `jq` finds a value matching `(secret|token|api[_-]?key|password)` in `.env`
- **THEN** the audit SHALL report FLAG and recommend moving the value to gitignored `settings.local.json`

#### Scenario: Auditor needs runtime behavioral guidance
- **WHEN** a reviewer wants to understand how agents should handle secrets at script-writing time
- **THEN** the audit skill SHALL direct them to the `secrets-safety` skill
