---
name: setup-flow
description:
  "Use when onboarding a repository or agent to the standard development workflow — installs or updates a
  MANDATORY workflow block in the agent's instruction file (CLAUDE.md, AGENTS.md, GEMINI.md, Copilot or
  Cursor rules) that points at development-flow, semantic code tools, and post-task skill optimization.
  Use when setting up a new repo, switching agents, or refreshing the workflow rules."
type: skill
disable-model-invocation: false
user-invocable: true
tags: [setup, onboarding, workflow, agent-config, development-flow]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# Setup Flow

## Overview

Seeds a repository's **agent instruction file** with a neutral, reusable **`## MANDATORY workflow`**
block so every agent in that repo follows the same loop: `development-flow` for all changes, semantic
code tools over raw text search, and post-task skill optimization when there's concrete feedback.

**Core principle: idempotent.** The block is wrapped in markers and inserted-or-replaced — running this
skill again updates the block in place, never duplicates it, and never disturbs the rest of the file.

## When to Use

- Onboarding a new repository, or starting work in a repo that has no workflow rules.
- Switching to or adding a different agent (the rules need to live in that agent's file).
- Refreshing the workflow block after `development-flow` or the conventions change.

**When NOT to use:** for one-off project-specific rules (write those directly in the instruction file);
this skill manages only the shared, neutral workflow block.

## Target file (by agent)

Resolve the instruction file for the active agent. Create it (with a top-level `# <Project>` heading)
if it doesn't exist.

| Agent | Instruction file |
| ----- | ---------------- |
| Claude / Claude Code | `CLAUDE.md` |
| Codex | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/workflow.md` (or `.cursorrules`) |

If the agent is unknown, default to `CLAUDE.md` (and `AGENTS.md` as a cross-agent fallback), or ask.

## The block to inject

Insert this verbatim, including the marker comments. It is intentionally **neutral** — no project, org,
stack, or gate count baked in:

```markdown
<!-- setup-flow:start -->
## MANDATORY workflow

**For ANY feature, change, or bugfix you MUST follow the `development-flow` skill.** Invoke it at the
start of implementation work; do not skip or reorder its steps: brainstorm → plan/proposal →
implement (TDD) → code review + simplify → run the repo's quality gates → report → user approval and
manual verification before archive/commit.

**Prefer semantic code tools for code search and edits** — e.g. Serena MCP or your editor's LSP
(`find_symbol`, `replace_symbol_body`, `find_referencing_symbols`) — over raw text/grep where a
semantic tool applies.

**After finishing a task, optimize skills when there's concrete feedback for it.** If the session
surfaced specific learnings about how a skill performed — an activation gap, a regression, missing or
misleading guidance, or a confirmed improvement — refine that skill (use a skill-optimizing skill if
one is available) before moving on. Only when the feedback is specific; skip it otherwise.
<!-- setup-flow:end -->
```

## Procedure

1. **Resolve the target file** for the active agent (table above). If it doesn't exist, create it with a
   `# <Project name>` heading first.
2. **Look for the markers** `<!-- setup-flow:start -->` … `<!-- setup-flow:end -->` in the file.
   - **Present:** replace everything between (and including) the markers with the current block.
   - **Absent:** append the block to the end of the file, preceded by one blank line.
3. **Leave all other content untouched** — never reorder, dedupe, or rewrite the rest of the file.
4. **Verify** the file has exactly one `setup-flow:start`/`setup-flow:end` pair and the block reads
   correctly, then report which file you changed.

## Common mistakes

- **Duplicating the block.** Appending without checking for the markers first. Always insert-or-replace.
- **Editing project-specific rules.** This skill owns only the marked block; don't touch the rest.
- **Hardcoding specifics.** Keep the block neutral — no org, stack, repo path, or gate count. Repos add
  their own details outside the markers.
- **Writing to the wrong file.** Match the file to the active agent; don't put `CLAUDE.md` rules in a
  Gemini repo.
- **Renaming the skill reference.** It points at `development-flow` — the canonical skill name.
