## 1. New secrets-safety Skill

- [x] 1.1 Create `.claude/skills/secrets-safety/SKILL.md` with hard rules, secrets-source definition, red flags, and rationalization table
- [x] 1.2 Verify YAML frontmatter: name, description starting with "Use when...", third-person

## 2. Update dev-flow Skill

- [x] 2.1 Add mandatory "Security" section to `.claude/skills/dev-flow/SKILL.md` referencing `secrets-safety` before the Red Flags section

## 3. Update llm-setup-audit Skill

- [x] 3.1 Tighten `description` field to include secrets-source gitignore as a trigger
- [x] 3.2 Add cross-reference to `secrets-safety` in Check 5 body
- [x] 3.3 Add Check 10 — secrets source (file/folder/`.env.*`) is gitignored, with bash commands for each form
- [x] 3.4 Update report format line from `1–9` to `1–10`
- [x] 3.5 Add gitignore row to common-mistakes table

## 4. Generalise Secrets-Source Language

- [x] 4.1 Update `secrets-safety` "What Counts as a Secrets Source" section to cover file, folder, and glob pattern
- [x] 4.2 Update `llm-setup-audit` Check 10 commands to show all three forms with explanatory comments
