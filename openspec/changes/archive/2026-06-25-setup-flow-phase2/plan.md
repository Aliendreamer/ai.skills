# setup-flow Phase 2 — `.claude/settings.json` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the `setup-flow` skill with a Phase 2 that creates or updates `.claude/settings.json` with Serena MCP, sandbox config, permissions, hooks, and enabledPlugins — all derived from project-type detection and user input.

**Architecture:** Single-file edit to `skills/setup-flow/SKILL.md` — a new `## Phase 2` section appended after the existing Phase 1 content. No TypeScript changes; catalog is regenerated from the updated frontmatter. Quality gates are markdown lint and catalog validate.

**Tech Stack:** Markdown (SKILL.md), `markdownlint-cli2`, `nx run catalog:validate`, `pnpm generate-catalog`

## Global Constraints

- Skill file path: `skills/setup-flow/SKILL.md`
- Bump skill `version` frontmatter from `0.1.0` → `0.2.0`
- Update skill `description` in frontmatter to mention settings.json setup
- Phase 2 is clearly delineated from Phase 1 — never mix or reorder
- All sandbox domain/path lists are sorted alphabetically within each detected bucket
- Merge behavior: union lists (deduplicate), add missing keys only, never overwrite existing root flags
- The PostToolUse prettier hook is **conditional** — only written when prettier is detected
- Plugin detection reads `~/.claude/settings.json` `enabledPlugins` and/or `~/.claude/plugins/`
- `pnpm generate-catalog` must be run after any SKILL.md edit before committing

---

### Task 1: Propose the OpenSpec change

**Files:**
- Create: `openspec/changes/setup-flow-phase2/proposal.md`
- Create: `openspec/changes/setup-flow-phase2/design.md`
- Create: `openspec/changes/setup-flow-phase2/tasks.md`

- [ ] **Step 1: Run opsx:propose**

```bash
# In Claude Code, invoke:
/opsx:propose setup-flow-phase2
```

Proposal summary to provide when prompted:
- **Why:** `setup-flow` currently only injects a workflow block into the agent instruction file. Developers also need `.claude/settings.json` configured with Serena MCP, safe sandbox rules, pre-approved permissions, dev-flow hooks, and plugins — all at onboarding time.
- **What:** Add Phase 2 to `setup-flow` that detects project type + prettier presence, asks about plugins, then writes/merges `.claude/settings.json`.
- **Scope:** One SKILL.md edit + catalog regeneration.

---

### Task 2: Update `setup-flow` frontmatter

**Files:**
- Modify: `skills/setup-flow/SKILL.md:1-15` (frontmatter block)

- [ ] **Step 1: Update the frontmatter**

Replace the existing frontmatter block (lines 1–15 of `skills/setup-flow/SKILL.md`) with:

```yaml
---
name: setup-flow
description:
  "Use when onboarding a repository or agent to the standard development workflow — installs or updates a
  MANDATORY workflow block in the agent's instruction file (CLAUDE.md, AGENTS.md, GEMINI.md, Copilot or
  Cursor rules) AND configures .claude/settings.json with Serena MCP, sandbox, permissions, hooks, and
  plugins. Use when setting up a new repo, switching agents, or refreshing the workflow rules."
type: skill
disable-model-invocation: false
user-invocable: true
tags: [setup, onboarding, workflow, agent-config, development-flow, serena, settings]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.2.0
author: Aliendreamer
---
```

- [ ] **Step 2: Verify the file still parses as valid YAML frontmatter**

```bash
cd /home/aliendreamer/projects/ai.skills
node -e "const m = require('gray-matter'); const fs = require('fs'); const r = m(fs.readFileSync('skills/setup-flow/SKILL.md','utf8')); console.log('version:', r.data.version); console.log('name:', r.data.name);"
```

Expected output:
```
version: 0.2.0
name: setup-flow
```

---

### Task 3: Add Phase 2 section to `setup-flow` SKILL.md

**Files:**
- Modify: `skills/setup-flow/SKILL.md` (append after line 96, after the existing Common mistakes section)

- [ ] **Step 1: Append the Phase 2 content**

Append the following block to the end of `skills/setup-flow/SKILL.md`:

````markdown

---

## Phase 2: `.claude/settings.json`

Runs immediately after Phase 1. Configures `.claude/settings.json` for the repo with Serena MCP, sandbox, permissions, hooks, and plugins. Idempotent on re-run (merge mode preserves existing customisation).

### 2.1 Existing file check

Check whether `.claude/settings.json` already exists.

- **Absent** → proceed, composing from scratch.
- **Present** → ask the user: **merge** (add missing keys, union lists, preserve existing values) or **replace** (overwrite entirely)?

### 2.2 Project type detection

Scan the repo root for these files to determine the sandbox domain and path lists:

| Detected file | Project type | Network domains to add | Filesystem write paths to add |
|---|---|---|---|
| `package.json` | npm / Node | `registry.npmjs.org`, `*.npmjs.org`, `registry.yarnpkg.com`, `github.com`, `codeload.github.com`, `*.githubusercontent.com` | `~/.npm`, `~/.cache`, `~/.local/share/pnpm`, `/usr/local/share/.yarn-global` |
| `*.csproj` or `*.sln` | .NET | `api.nuget.org`, `*.nuget.org`, `github.com`, `codeload.github.com`, `*.githubusercontent.com` | `~/.nuget`, `~/.dotnet` |
| `pyproject.toml`, `setup.py`, or `requirements*.txt` | Python | `pypi.org`, `files.pythonhosted.org`, `github.com`, `codeload.github.com`, `*.githubusercontent.com` | `~/.cache/pip`, `~/.local` |
| `Cargo.toml` | Rust | `crates.io`, `static.crates.io`, `github.com`, `codeload.github.com`, `*.githubusercontent.com` | `~/.cargo` |
| `go.mod` | Go | `proxy.golang.org`, `sum.golang.org`, `github.com`, `codeload.github.com`, `*.githubusercontent.com` | `~/go` |

Multiple types may match (e.g. a repo with both `package.json` and `*.csproj`) — union all matching entries.

**Fallback (nothing detected):** use the curated baseline:

```json
{
  "network": {
    "allowedDomains": [
      "*.githubusercontent.com",
      "*.npmjs.org",
      "codeload.github.com",
      "files.pythonhosted.org",
      "github.com",
      "pypi.org",
      "registry.npmjs.org",
      "registry.yarnpkg.com"
    ]
  },
  "filesystem": {
    "allowWrite": [
      "/usr/local/share/.yarn-global",
      "~/.cache",
      "~/.local/share/pnpm",
      "~/.npm"
    ]
  }
}
```

### 2.3 Prettier detection

Check `package.json` in the repo root:

- `devDependencies` or `dependencies` contains a key starting with `prettier` → **prettier present**.
- OR `scripts` contains any value that references `prettier` → **prettier present**.
- Otherwise → **prettier absent**; skip the PostToolUse hook.

### 2.4 Plugin detection

Discover available plugins by checking (in order):

1. Read `~/.claude/settings.json` → collect keys from its `enabledPlugins` object.
2. List directory entries under `~/.claude/plugins/` if it exists.

Union the two sets into a list of plugin IDs. Present them to the user:

> "Detected plugins: [list]. Which should be enabled? (Select all that apply, or say 'all' / 'none'.)"

Wait for the user's answer before continuing. Build the `enabledPlugins` map: `{ "<id>": true/false }` per the user's selection.

### 2.5 Compose and write `.claude/settings.json`

Assemble the settings object from all gathered inputs and write (or merge into) `.claude/settings.json`.

#### Always-included sections

**`mcpServers`:**

```json
{
  "serena": {
    "command": "uvx",
    "args": [
      "--from",
      "git+https://github.com/oraios/serena",
      "serena",
      "start-mcp-server",
      "--context",
      "claude-code",
      "--project-from-cwd",
      "--open-web-dashboard",
      "false"
    ]
  }
}
```

**`sandbox`** (root flags are always `true`/`false` as shown; domain/path lists come from 2.2):

```json
{
  "enabled": true,
  "failIfUnavailable": true,
  "allowUnsandboxedCommands": false,
  "network": { "allowedDomains": ["<from 2.2>"] },
  "filesystem": { "allowWrite": ["<from 2.2>"] }
}
```

**`permissions`** (fixed baseline — always the same):

```json
{
  "allow": [
    "Bash(git*)",
    "SKILL(*)",
    "mcp__azure-devops__core_list_projects",
    "mcp__azure-devops__search_workitem",
    "mcp__azure-devops__wit_get_work_item",
    "mcp__azure-devops__wit_get_work_item_attachment",
    "mcp__azure-devops__wit_get_work_items_batch_by_ids",
    "mcp__azure-devops__wit_list_work_item_comments",
    "mcp__azure-devops__wit_query_by_wiql",
    "mcp__plugin_serena_serena__*"
  ],
  "deny": [
    "Bash(git branch --delete --force*)",
    "Bash(git branch -D*)",
    "Bash(git push --force*)",
    "Bash(git push -f*)",
    "Bash(git reset --hard*)",
    "Bash(rm -rf*)"
  ]
}
```

**`hooks`** (always included):

```json
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"UserPromptSubmit\",\"additionalContext\":\"MANDATORY dev-flow for code work (.claude development-flow skill), ordered + gated: 1) align via superpowers:brainstorming before touching files; 2) document the change — OpenSpec /opsx:propose for non-trivial work (tiny fixes may skip); 3) implement with TDD (red-green-refactor); 4) /code-review then /simplify; 5) discover the repo gates from CI/scripts and run build+lint+typecheck+tests; 6) report done/passed/pending; 7) wait for user approval + manual verification before /opsx:archive and commit. Use Serena semantic tools (find_symbol, get_symbols_overview, replace_symbol_body, find_referencing_symbols, search_for_pattern) for ALL code search and edits — never raw grep or hand-editing. Done = gates green, output seen, user verified.\"}}'",
          "statusMessage": "Loading development flow"
        }
      ]
    }
  ],
  "PreToolUse": [
    {
      "matcher": "Grep",
      "hooks": [
        {
          "type": "command",
          "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"Per CLAUDE.md, prefer Serena (search_for_pattern / find_symbol / find_referencing_symbols) for CODE search; raw grep is fine for configs and non-code.\"},\"suppressOutput\":true}'"
        }
      ]
    },
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "c=$(jq -r '.tool_input.command // empty' 2>/dev/null); printf '%s' \"$c\" | grep -Eq '(^|[|&; ])(grep|egrep|fgrep|rg)( |$)' && echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"Per CLAUDE.md, prefer Serena (search_for_pattern / find_symbol) for CODE search; raw grep/rg is fine for configs and non-code.\"},\"suppressOutput\":true}'; exit 0"
        }
      ]
    }
  ]
}
```

**PostToolUse prettier hook** (only if prettier detected in 2.3):

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "f=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null); case \"$f\" in *.ts|*.tsx|*.js|*.jsx|*.scss|*.css) [ -f \"$f\" ] && ./node_modules/.bin/prettier --ignore-unknown --write \"$f\" >/dev/null 2>&1 ;; esac; exit 0",
          "statusMessage": "Formatting with prettier…"
        }
      ]
    }
  ]
}
```

**`enabledPlugins`** — map from 2.4 with user-selected true/false values.

#### Merge rules (when user chose merge in 2.1)

| Section | Merge behaviour |
|---|---|
| `mcpServers.serena` | Add key only if absent; leave other servers untouched |
| `sandbox.network.allowedDomains` | Union with existing (deduplicate + sort) |
| `sandbox.filesystem.allowWrite` | Union with existing (deduplicate + sort) |
| `sandbox` root flags | Set only if the key is absent; never overwrite |
| `permissions.allow` | Append entries not already present |
| `permissions.deny` | Append entries not already present |
| `hooks` | Add missing hook entries; skip any whose matcher + command already exists |
| `enabledPlugins` | Add new keys from detection; preserve existing values; only update values user explicitly chose |

### 2.6 Report

After writing `.claude/settings.json`, tell the user:

- Path written: `.claude/settings.json`
- Sections written: which top-level keys were added/updated
- Prettier hook: included or skipped (reason)
- Plugins enabled/disabled: the final map
- If merge: which keys already existed and were preserved

### Common mistakes (Phase 2)

| Mistake | Fix |
|---|---|
| Writing `PostToolUse` hook when prettier is absent | Check `package.json` first; skip the hook if not found |
| Overwriting existing sandbox flags on merge | Only `set` a root flag if the key is absent |
| Assuming `.claude/settings.json` lives at repo root | It lives at `.claude/settings.json` relative to the repo |
| Not deduplicating domain/path lists | Use a Set merge; sort the result |
| Auto-enabling all detected plugins | Always ask the user; never auto-enable |
| Writing the PAT or any secret into settings.json | `secrets.json` is the home for secrets; never touch them here |
````

- [ ] **Step 2: Count lines to confirm content was appended**

```bash
wc -l skills/setup-flow/SKILL.md
```

Expected: significantly more than 96 lines (roughly 250+).

---

### Task 4: Regenerate catalog and run quality gates

**Files:**
- Modify: `catalog.json` (regenerated)

- [ ] **Step 1: Regenerate the catalog**

```bash
cd /home/aliendreamer/projects/ai.skills
pnpm generate-catalog
```

Expected: `catalog.json` updated (version field for `setup-flow` entry now `0.2.0`, description updated).

- [ ] **Step 2: Run markdown lint**

```bash
pnpm lint:md
```

Expected: exit 0, no violations reported.

- [ ] **Step 3: Run catalog validate**

```bash
pnpm validate
```

Expected: exit 0 — validation passes and catalog is up-to-date.

- [ ] **Step 4: Confirm setup-flow entry in catalog.json**

```bash
node -e "const c = require('./catalog.json'); const s = c.entries.find(e => e.id === 'setup-flow'); console.log(JSON.stringify(s, null, 2));"
```

Expected:
```json
{
  "id": "setup-flow",
  "version": "0.2.0",
  "description": "Use when onboarding a repository or agent to the standard development workflow — installs or updates a MANDATORY workflow block in the agent's instruction file (CLAUDE.md, AGENTS.md, GEMINI.md, Copilot or Cursor rules) AND configures .claude/settings.json with Serena MCP, sandbox, permissions, hooks, and plugins. Use when setting up a new repo, switching agents, or refreshing the workflow rules.",
  ...
}
```

---

### Task 5: Archive and finish

- [ ] **Step 1: Mark OpenSpec tasks done**

Check off all tasks in `openspec/changes/setup-flow-phase2/tasks.md`.

- [ ] **Step 2: Archive the OpenSpec change**

```bash
# In Claude Code, invoke:
/opsx:archive setup-flow-phase2
```

- [ ] **Step 3: Confirm done gate**

All of the following must be true before claiming done:

- [ ] `skills/setup-flow/SKILL.md` version is `0.2.0`
- [ ] Phase 2 section is present and complete in the skill file
- [ ] `catalog.json` reflects the updated description and version
- [ ] `pnpm lint:md` exits 0
- [ ] `pnpm validate` exits 0
- [ ] User has reviewed the Phase 2 content and approved
