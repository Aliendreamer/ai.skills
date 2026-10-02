---
name: complexity-sizing
description:
  'Use when sizing or checking an Azure DevOps work item — Story Points must be derived from the Complexity field,
  never estimated freehand. Fires on "size this ticket", "what SP", "is the SP right", "check complexity", "backfill
  story points", or whenever a ticket''s Complexity/SP pair is read. Org and project come from configuration.'
type: skill
disable-model-invocation: false
user-invocable: true
tags: [azure-devops, ado, complexity, story-points, sizing, estimate, velocity, work-item]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# Complexity Sizing

## Overview

Two fields on every User Story and Bug carry the size of the work:

- **Complexity** (`Custom.Complexity`) — how hard the ticket is **without** an AI coding agent.
  Picklist `S` / `M` / `L` / `XL`. Configure it as **required** on both User Story and Bug
  (`alwaysRequired: true`).
- **Story Points** (`Microsoft.VSTS.Scheduling.StoryPoints`) — **derived from Complexity**, never
  estimated separately. Not required by the process template, which is why items exist with
  Complexity set and SP empty.

**Story Points are agent-independent on purpose.** The point of the pair is to measure *how much
complex work the team completes*, not how much easier an agent made any one ticket. If SP were
lowered whenever an agent helped, sprint velocity would look flat while the team was actually
shipping more. Keeping SP pinned to Complexity means SP-per-sprint rises purely because more work
got done — which is the number the team is watching.

This skill's only job is to keep that derivation correct. It does not report velocity; ADO's own
Velocity chart does that, and it is only trustworthy when this guard has been applied.

## Configuration

`organization` and `projects` come from `.claude/secrets.json` — see `azure-devops-workflow` for the
schema and the mode contract. **Never hardcode an org or project**; resolve `project` once from
`projects[0]` and reuse it for every call in the run. If it is missing, ask.

The Complexity picklist (`S`/`M`/`L`/`XL`) and the field reference name (`Custom.Complexity`) are
this skill's assumption. If your process template names the field differently, change it here — the
derivation logic is unaffected.

## The map

| Complexity | Story Points |
|------------|--------------|
| `S`        | 3            |
| `M`        | 5            |
| `L`        | 8            |
| `XL`       | 13           |

**The valid Story Point set is exactly `{3, 5, 8, 13}`.** Any other value — `0`, `1`, `2`, `26`, or
anything else — is **off-scale** and invalid on every ticket regardless of Complexity.

This is not hypothetical. An audit of 232 live work items found **52 items carrying off-scale SP**:
`0`×6, `1`×21, `2`×24, `26`×1. Off-scale values are the single most common defect in this field, so
check for them before anything else.

The map is exact. There is no allowed band, no "the agent helped so I lowered it", no rounding.
Any SP that is not the mapped value is a mismatch.

## When to Use

- The user asks what SP a ticket should have, or whether an SP is right.
- A ticket is being created or groomed and Complexity is set.
- A work item has just been read during ticket intake — check the pair as part of the intake brief.
- The user asks to backfill or audit SP across a set of tickets.

**When NOT to use:** the work has no ADO ticket behind it; or the question is about *estimating
effort in the code* rather than the ticket's recorded fields.

## Verdicts

Derive `expected = map(Complexity)`, compare against the recorded SP, emit exactly one verdict.
**Test the cases in this order** — off-scale before mismatch, or an off-scale value gets misreported
as an ordinary mismatch and the real problem (someone not using the scale at all) is hidden:

| # | Case | Verdict | Action |
|---|------|---------|--------|
| 1 | Complexity empty | **underivable** | Cannot derive. Report it; ask the user for the Complexity. Never guess a Complexity from the title, description, or your own sense of the work. |
| 2 | SP empty | **missing** | Offer to set SP to `expected`. |
| 3 | SP not in `{3,5,8,13}` | **off-scale** | Always wrong, whatever the Complexity. Say which off-scale value it holds. Offer to set SP to `expected`. |
| 4 | SP != expected | **mismatch** | On-scale but wrong for this Complexity. Report both values; offer to set SP to `expected`. |
| 5 | SP == expected | **match** | Silent. Do not report matches unless the user asked for a full audit. |

Report findings compactly, one line per ticket, naming the verdict. **The ids below are synthetic
illustrations — never reuse one as a real target:**

```text
110234  Bug         M  → expected 5, actual (empty)   missing
110235  User Story  L  → expected 8, actual 8         match
110236  Bug         S  → expected 3, actual 5         mismatch
110237  Bug         L  → expected 8, actual 2         off-scale (2 ∉ {3,5,8,13})
110238  User Story  XL → expected 13, actual 26       off-scale (26 ∉ {3,5,8,13})
```

When auditing many tickets, **also report the tally of off-scale values found** (e.g. `0×6, 1×21,
2×24`). A cluster of one value points at a habit or a stale template, not at individual slips.

## Reading

Always pass `project` — the MCP server has no default and a missing `project` pops an interactive
picker that stalls the flow. Resolve it once (see Configuration) and reuse it.

Locate tools at runtime with ToolSearch; full names are `mcp__azure-devops__<tool>`.

| Need | Call |
|------|------|
| One ticket | `wit_work_item` action `get`, with `fields` |
| Several tickets | `wit_work_item` action `get_batch`, with `ids` + `fields` |
| Find candidates | `wit_query` action `wiql` (returns **ids only** — follow with `get_batch`) |

Always request the fields explicitly rather than `expand: all` — the full work item is large and
most of it is irrelevant here:

```text
fields: ["System.Id", "System.WorkItemType", "System.Title",
         "Custom.Complexity", "Microsoft.VSTS.Scheduling.StoryPoints"]
```

Audit WIQL — items carrying Complexity, newest first. Substitute the resolved project:

```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = '<project>'
  AND [System.WorkItemType] IN ('User Story','Bug')
  AND [Custom.Complexity] <> ''
ORDER BY [System.ChangedDate] DESC
```

## Writing

**Ask before every write. One confirmation per ticket.** State the id, the Complexity, and the value
being set, then wait. A batch audit means a batch of *findings*, not a batch of silent edits.

`wit_work_item_write` action `update`:

```text
id: <work-item-id>
project: <project>
updates: [{ op: "replace",
            path: "/fields/Microsoft.VSTS.Scheduling.StoryPoints",
            value: "5" }]
```

**Only ever write `Microsoft.VSTS.Scheduling.StoryPoints`.** Complexity is the human's sizing input —
this skill reads it and never writes it. If Complexity looks wrong, say so and let the user change it.

Writing needs a PAT with **Work Items (Read & Write)**. If a write fails with `401`/`403`, the token
is read-scoped: say exactly that, point at `AzurePat` in `.claude/secrets.json`, and fall back to
reporting the correct values for the user to apply by hand. Do not retry the write.

## Common mistakes

- **Estimating SP freehand.** SP is derived, not judged. If you find yourself weighing how hard the
  work looks, stop — read Complexity and apply the map.
- **Deflating SP because an agent will do the work.** This is the exact failure the field pair
  exists to prevent. An `L` is 8 SP whether an agent writes it or a human does.
- **Proposing an off-scale SP.** Only `3`, `5`, `8`, `13` are valid. Never propose `0`, `1`, `2`, or
  any other value, and never leave an existing one standing unreported.
- **Filing an off-scale value as a plain mismatch.** `L`/`2` is not "8 vs 2" — it is someone not
  using the scale. Report it as off-scale so the pattern is visible.
- **Guessing a missing Complexity.** Report `underivable` and ask. When the field is required, an
  empty one means a legacy item or a broken create — both are the user's call, not yours.
- **Writing Complexity.** Read-only in this skill, always.
- **Batch-writing an audit.** Findings are batched; confirmations are not.
- **Omitting `project`.** Stalls on an interactive picker.
