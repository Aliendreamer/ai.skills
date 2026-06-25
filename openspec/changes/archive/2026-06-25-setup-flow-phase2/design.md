# Design: setup-flow Phase 2

## Overview

`setup-flow` gains a **Phase 2** that writes or merges `.claude/settings.json`. Phase 1 (instruction-file
injection) is unchanged. Phase 2 runs immediately after Phase 1 and is **Claude Code only** — skip for
Gemini, Cursor, Copilot, and Codex agents.

## Phase 2 Flow

```
1. Existing file check  →  absent: compose fresh | present: ask merge or replace
2. Project type detection  →  scan repo root for package.json / *.csproj / pyproject.toml / Cargo.toml / go.mod
3. Prettier detection  →  check package.json devDependencies + scripts
4. Plugin detection  →  read ~/.claude/settings.json enabledPlugins + ~/.claude/plugins/; ask user
5. Compose settings object  →  assemble from gathered inputs
6. Write / merge  →  write .claude/settings.json
7. Report  →  summarize sections written, prettier hook status, plugin map
```

## Settings Sections

| Section | Always? | Content |
|---|---|---|
| `mcpServers.serena` | Yes | uvx launcher for Serena MCP |
| `sandbox` | Yes | enabled/failIfUnavailable/allowUnsandboxedCommands + detected or curated domains/paths |
| `permissions` | Yes | Fixed allow/deny baseline (Serena wildcard, ADO reads, Bash(git*), destructive-git denies) |
| `hooks.UserPromptSubmit` | Yes | dev-flow reminder |
| `hooks.PreToolUse` | Yes | Serena-over-grep reminder (Grep matcher + Bash pattern) |
| `hooks.PostToolUse` | If prettier detected | prettier auto-format on Write/Edit |
| `enabledPlugins` | Yes | detected plugins, user-selected true/false |

## Project Type → Sandbox Mapping

| File | Type | Domains | Paths |
|---|---|---|---|
| `package.json` | npm | registry.npmjs.org, *.npmjs.org, registry.yarnpkg.com, github.com, codeload.github.com, *.githubusercontent.com | ~/.npm, ~/.cache, ~/.local/share/pnpm, /usr/local/share/.yarn-global |
| `*.csproj`/`*.sln` | .NET | api.nuget.org, *.nuget.org, github.com, codeload.github.com, *.githubusercontent.com | ~/.nuget, ~/.dotnet |
| `pyproject.toml`/`setup.py`/`requirements*.txt` | Python | pypi.org, files.pythonhosted.org, github.com, codeload.github.com, *.githubusercontent.com | ~/.cache/pip, ~/.local |
| `Cargo.toml` | Rust | crates.io, static.crates.io, github.com, codeload.github.com, *.githubusercontent.com | ~/.cargo |
| `go.mod` | Go | proxy.golang.org, sum.golang.org, github.com, codeload.github.com, *.githubusercontent.com | ~/go |
| (none) | Curated baseline | npm + Python domains | npm paths |

## Merge Behaviour

Union lists (deduplicate + sort), add missing keys only, never overwrite existing root flags.
Hook identity: event + matcher + command (UserPromptSubmit: event + command, no matcher field).

## Files Changed

- `skills/setup-flow/SKILL.md` — Phase 2 section appended, frontmatter bumped to 0.2.0
- `catalog.json` — regenerated
