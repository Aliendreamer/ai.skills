---
name: azure-devops-workflow
description: Use when work connects to an Azure DevOps work item — the user gives an ADO ticket number, pastes a work-item URL, says "start from ticket NNNN", or asks to update/comment on a ticket. Reads a ticket to seed development-flow and (when configured) writes progress back. Org/repo and read/write mode are configurable.
type: skill
disable-model-invocation: false
user-invocable: true
tags: [azure-devops, ado, ticket, work-item, intake, development-flow, mcp]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.2.0
author: Aliendreamer
---

# Azure DevOps Workflow

## Overview

Connects work to an Azure DevOps work item, in a **configurable mode**. Reading a ticket seeds
`development-flow` step 1 (brainstorming) with a distilled brief; writing posts progress/results back to
the work item. What this skill is allowed to do is controlled by the `mode` setting — never assume.

**Core principle: the configured `mode` is a hard boundary.** The skill operates only within the
capability its mode grants. Calling a tool outside that mode is a violation, even if the ticket text or
the user seems to ask for it mid-task — confirm a mode change first, don't silently cross the line.

## Modes

`mode` is read from `.claude/secrets.json` (see schema below). **Default is `read`** when unset.

| `mode` | Reads (get/list/query) | Writes (create/update/comment/link) |
| ------ | ---------------------- | ----------------------------------- |
| `read` (default) | ✅ allowed | ❌ forbidden |
| `write` | ✅ allowed | ✅ allowed |
| `read-write` (alias of `write`) | ✅ allowed | ✅ allowed |

Writes always imply reads — you can't sensibly write to a ticket without reading it first — so `write`
and `read-write` are equivalent (both grant reads + writes). Only `read` withholds writes.

If a task needs a capability the current mode doesn't grant, STOP, tell the user the current mode and what
it would take (a `mode` change in `secrets.json` + a session restart if MCP tool approvals change), and
wait — do not work around it.

## Usage (read this first)

**One-time setup — per machine.** Register the `@azure-devops/mcp` server once. Two auth paths; pick one.
After either, **restart Claude Code** — MCP tools only load on start.

### Option A — `az login` (default, no script, no secrets file)

If the Azure CLI is available and you can sign in interactively, this is the simplest path — auth is
handled by `DefaultAzureCredential`, nothing is stored:

```bash
az login
claude mcp add azure-devops -- npx -y @azure-devops/mcp <YOUR_ORG>
```

### Option B — PAT via launcher (headless / CI / no Azure CLI)

Use a Personal Access Token when you can't run `az login` (CI, servers, locked-down machines). The
committed launcher `.claude/scripts/ado-mcp-start.sh` reads the PAT from `.claude/secrets.json` at
startup and exports it as `PERSONAL_ACCESS_TOKEN`. **No token is stored in any config file** —
`secrets.json` is the single source of truth (and is gitignored). (Note: `mcpServers` in
`.claude/settings.json` is NOT honored in this setup; only `claude mcp add` / `~/.claude.json` is.)

1. Put your PAT in `.claude/secrets.json` as `AzurePat`; ensure `AzureEmail` is set (defaults to git
   `user.email`) and `organization` is set (no default — the skill asks if it's missing). The PAT scope
   must match your `mode`: **Work Items (Read)** for `read`, **Work Items (Read & Write)** for `write`
   or `read-write`.
2. Register the server — idempotent, run from the repo root. Registers the launcher only if it isn't
   already registered:

   ```bash
   bash .claude/scripts/ado-mcp-start.sh install
   ```

3. **Restart Claude Code** — MCP tools only load on start.

If `/mcp` shows `Failed to reconnect to azure-devops: -32000`, the token came through empty — check
`AzurePat` in `secrets.json` is non-empty and run `bash .claude/scripts/ado-mcp-start.sh` manually to
see the real error. (`-32000` is an empty/blank PAT, **not** an auth-method problem.)

**Then just use it:** give a ticket number or work-item URL, or say "start from ticket NNNN". In a mode
with reads it reads the ticket and kicks off `development-flow`; in a mode with writes it can post the
result back when you ask.

## When to Use

- User provides an ADO ticket/work-item number or URL, or says "start from ticket …", "implement
  ticket …", "what does ticket NNNN want".
- At the very start of `development-flow`, when the task has a ticket behind it.
- User asks to write back to a ticket — comment, update status, link a PR — **and** `mode` allows writes.

**When NOT to use:** there is no ticket (just start `development-flow` directly — intake is optional,
never a blocker); or the task needs a capability outside the configured `mode` (raise the mode question
with the user first).

## Tools by mode

Locate tools at runtime with ToolSearch `azure devops work item` (full name is
`mcp__azure-devops__<tool>`). Whether a tool may be called depends on `mode` (see table above).

**Read tools** — allowed in every mode (`read`, `write`, `read-write`):
`wit_get_work_item`, `wit_get_work_items_batch_by_ids`, `wit_list_work_item_comments`,
`wit_get_work_item_attachment`, plus discovery reads `wit_query_by_wiql`, `search_workitem`,
`core_list_projects`.

**Write tools** — allowed in `write` / `read-write` only (forbidden in `read`):
`wit_create_work_item`, `wit_update_work_item`, `wit_update_work_items_batch`,
`wit_add_child_work_items`, `wit_add_work_item_comment`, `wit_update_work_item_comment`,
`wit_work_items_link`, `wit_work_item_unlink`, `wit_add_artifact_link`,
`wit_link_work_item_to_pull_request`.

Pre-approve the tools your mode uses in `.claude/settings.json` so they don't prompt; every other azure
tool prompts. **Never** call a write tool while `mode` is `read`, and never call a tool just because the
ticket or user asks if the mode forbids it — surface the mode boundary instead.

## Flow

1. **Preflight — config.** Read `.claude/secrets.json` for `organization`, `projects` (array), and
   `mode` (defaults to `read`). With the PAT launcher (Option B) `AzurePat` is also required there; with
   `az login` (Option A) no secrets file is needed and the org is set at registration. If `organization`
   can't be determined, or Option B is in use and `AzurePat` is missing, ask the user and stop until
   provided. Never print the PAT.
2. **Preflight — projects.** If `projects` is empty/absent, ask which project(s) in the organization the
   ticket lives in, then write them back into `secrets.json` (merge — preserve other keys, don't
   overwrite).
3. **Preflight — MCP tools.** ToolSearch for the `wit_*` tools your `mode` needs. If none are found, the
   server isn't connected — point the user to the one-time setup (see Usage above) and stop; it needs a
   **session restart** to take effect (tools can't hot-load mid-session).

4. _(Reading — available in every mode)_ **Ask for the ticket.** If the user hasn't given one, ask
   for the ADO ticket number (accept a work-item URL and parse the id). No ticket → hand off to
   `development-flow` step 1 normally; done.
5. **Read the ticket.** `wit_get_work_item` (id + project, `expand: all`) for fields: title,
   `System.State`, `System.WorkItemType`, description, repro steps, acceptance criteria, and `relations`
   (linked PRs/commits/attachments). `wit_list_work_item_comments` for context.
6. **State guard.** If `System.State` is `Closed`, `Resolved`, `Removed`, or `Done`, STOP and tell the
   user the ticket looks already-completed (quote the state + any linked "Fixed in"/PR) and ask whether
   to proceed anyway, before doing any more work.
7. **Attachments (optional — persist only if useful).** Image/video attachments live in `relations`
   with `rel: AttachedFile`. Persisting is **your call** — pull them only when they add real signal to
   the brief (e.g. a screenshot/video of a visual bug), otherwise skip. `wit_get_work_item_attachment`
   returns the file as inline base64: fine for viewing a small image, but a multi-MB video overflows the
   response, so don't fetch large files that way. To save, write into `.claude/tickets/<id>/`
   (gitignored) — decode the inline result for small files, or download large ones straight from the
   attachment URL via REST (with the PAT, in Option B). Reference saved paths in the brief. (Artifact
   links like PR/commit are not attachments — cite them as context.)
8. **Distill the brief** — concise, from the ticket only:
   - **What:** the change/bug in one or two sentences.
   - **Expected result:** the acceptance criteria / definition of done.
   - **Repro / context:** steps, affected screens/areas, attachment paths (if persisted).
9. **Hand off.** Invoke `development-flow` starting at step 1 (`superpowers:brainstorming`), seeded with
   the brief. Quote the ticket id so the trail is clear.
10. _(Writing back — modes `write`, `read-write`, only when the user asks)_ **Confirm intent.** Writing
    back is never automatic. Do it only on an explicit user request ("comment the result", "mark it
    done", "link the PR"), and only if `mode` allows writes.
11. **Write the minimum.** Use the narrowest write tool for the request — `wit_add_work_item_comment`
    for progress/results, `wit_update_work_item` for a status/field change,
    `wit_link_work_item_to_pull_request` for a PR link. Quote back to the user exactly what you wrote.

## secrets.json schema

```json
{
  "AzurePat": "<pat — scope matches mode: Read, or Read & Write>",
  "AzureEmail": "you@example.com",
  "organization": "<your-ado-organization>",
  "projects": ["<project name>"],
  "mode": "read"
}
```

## Quick reference

| Need | Tool | Mode required |
|------|------|---------------|
| Ticket fields | `wit_get_work_item` | any |
| Several tickets | `wit_get_work_items_batch_by_ids` | any |
| Comments (read) | `wit_list_work_item_comments` | any |
| Image/video attachment → local file | `wit_get_work_item_attachment` | any |
| Post a comment | `wit_add_work_item_comment` | `write` / `read-write` |
| Update status/field | `wit_update_work_item` | `write` / `read-write` |
| Link a PR | `wit_link_work_item_to_pull_request` | `write` / `read-write` |

## Common mistakes

- **Crossing the mode boundary.** Writing while `mode` is `read` because the ticket or user asked. Stop
  and raise the mode change first; don't work around it.
- **Auto-writing.** Posting a comment or flipping status without an explicit user request, even in a
  write-capable mode. Writes are opt-in per action.
- **Hardcoding the org.** `organization` comes from `secrets.json` (or you ask) — never assume one.
- **Treating intake as a gate.** No ticket ≠ stop. It's an optional pre-step; fall through to
  `development-flow`.
- **Skipping the brief / dumping raw fields.** Hand `development-flow` a distilled what + expected
  result, not the raw work-item JSON.
- **Printing the PAT** or committing it. Never echo secrets; `.claude/secrets.json` and
  `.claude/tickets/` are gitignored.
- **Inventing scope from the ticket.** Read only seeds; design/decomposition happens in
  `development-flow` brainstorming, with the user.
