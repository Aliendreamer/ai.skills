---
name: daily-activity-log
description:
  'Use at end of day to file the Azure DevOps time-log Tasks — one closed Task per Activity worked that day, Original
  Estimate in decimal hours, parented to the current sprint''s Feature. Fires on "log my day", "fill my tasks", "close
  my daily tasks", "I had 2h meetings and 4h development". Org and project come from configuration.'
type: skill
disable-model-invocation: false
user-invocable: true
tags: [azure-devops, ado, task, activity, time-log, daily, original-estimate, sprint, feature]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# Daily Activity Log

## Overview

The team agreement: **at the end of each day, every person files their hours as Tasks in Azure
DevOps, one Task per Activity, and closes them.**

Two rules carry the whole thing:

- **One Task per Activity — never one combined Task.** Meetings and Development on the same day are
  two separate Tasks, not one Task of 6 hours. The Activity split is the point; a merged Task
  destroys the breakdown the reports are built on.
- **The estimate is a decimal number of hours.** 90 minutes is `1.5`, not `1:30`, not `90`.
  `Microsoft.VSTS.Scheduling.OriginalEstimate` is a decimal field.

Every Task hangs off **the current sprint's Feature** — the second half of the agreement is that each
sprint gets one Feature, and that sprint's daily Tasks are its children. Which Feature that is
changes every sprint, so it is resolved at runtime (step 3) and never remembered.

**Every id, sprint number, area path and date below is a placeholder in an example — never a value
to reuse.** The WIQL blocks are templates; substitute what the earlier steps returned. A query you
are about to run that still says `Sprint <n>`, a literal placeholder area path, or a hardcoded
`Parent` id is a bug, and it fails *silently*: a stale step-3 query can return **exactly one hit** —
the *previous* sprint's Feature — so nothing looks wrong and the whole day gets filed onto a closed
sprint. The stale step-5 query then checks that Feature's children for a date it never held, reports
"no duplicates", and waves the double-file through. Neither query errors; there is no symptom.

**This skill does not create the sprint Feature.** It only finds the one that already exists.
Creating Features per PI and per sprint is a separate concern.

## When to Use

- The user says they want to log, fill, or close their day / their tasks.
- The user states hours by activity ("2 hours of meetings and the rest development").
- The user asks to log a *past* day ("fill yesterday", "log Friday") — same flow, different date.

**When NOT to use:** creating the sprint/PI Feature; sizing a User Story or Bug
(`complexity-sizing`); checking whether the team filed (`daily-log-check`); anything that is not the
user's own daily time log.

## Configuration

`organization` and `projects` come from `.claude/secrets.json` — see `azure-devops-workflow` for the
schema and the mode contract. **Never hardcode an org or project**; resolve `project` once from
`projects[0]` and pass it on every call. If it is missing, ask.

### Platform aliases — configure this

The user names the platform when they log the day. The alias sets `System.Tags` and
`System.AreaPath`, and picks the **team** whose iteration is read in step 2. All three move together.

Replace the placeholder rows with your own, and **verify each area path against ADO before relying
on it** — these strings are matched literally:

| The user says | `System.Tags` | `System.AreaPath` | team (for the sprint lookup) |
|---------------|---------------|-------------------|------------------------------|
| `<alias-a>`, `<long form>` | `<Tag A>` | `<Project>` | `<Team A>` |
| `<alias-b>`, `<long form>` | `<Tag B>` | `<Project>\<Sub Area>` | `<Team B>` |

Two things to check when filling this in:

- **The areas are often asymmetric.** One platform's area path is frequently the **project root**
  itself, not a nested `<Project>\<Name>` node — that node may not exist. Another's is nested, spaces
  and all. Look each one up rather than deriving it by pattern.
- **The tag does not have to match the path.** Do not derive one from the other.

The examples below use `web` and `mobile` as aliases. They are illustrations, not defaults.

**No alias in the message → ASK. Never default, never carry one over.** Which platform the hours
belong to is the one thing that cannot be inferred from the hours themselves, and a day filed under
the wrong area path lands in another team's report. One question, then continue:

> "Which platform — web or mobile?"

One alias covers the whole run: every Task in a single log gets the same tag and area path. A day
split across both platforms is two runs, one per alias — say so rather than mixing them in one plan.

**Validate the area path before writing.** If a create fails because the area path does not exist
under the project, report the exact value that was rejected and stop. Do not fall back to the project
root — a Task quietly filed at the root is the same lost hours as the wrong area path.

### Activity picklist — configure this

The `Microsoft.VSTS.Common.Activity` values this skill maps onto. Adjust to your process template:

```text
Code Review   Deployment   Design   Development
Documentation   Meetings   Requirements   Testing
```

`Code Review` and `Meetings` are common customisations — they are **not** in the stock Agile set, so
do not reason from that set. Map the user's shorthand onto an exact value, preserving its
capitalisation as written (`dev` → `Development`, `meeting` → `Meetings`, `cr`/`review` →
`Code Review`).

**A value not on that list is a stop, not a guess.** Name what the user said, show the list, ask.

**Do not try to read the picklist from ADO.** `wit_work_item` action `get_type` does NOT return
`allowedValues` through this MCP server — the payload is tens of thousands of characters of form
layout with no picklist in it, so it only burns the tool-output limit and answers nothing. The list
above is the source of truth; if it ever looks wrong, check the Activity dropdown in the ADO UI, or
probe the data with WIQL (`[Microsoft.VSTS.Common.Activity] = '<value>'`) — noting that zero hits
proves only that the value is unused, not that it is invalid.

## The Task shape

Do not add fields beyond these.

| Field | Value |
|-------|-------|
| `System.WorkItemType` | `Task` |
| `System.Title` | `<Name> <activity> <D.MM>` — e.g. `<Name> meetings 8.09` |
| `Microsoft.VSTS.Common.Activity` | the Activity, exactly as spelled in the picklist |
| `Microsoft.VSTS.Scheduling.OriginalEstimate` | decimal hours — `1.5`, `4`, `0.5` |
| `System.IterationPath` | the current sprint — e.g. `<Project>\Sprint <n>` |
| `System.AreaPath` | from the **platform alias** — see Configuration |
| `System.Tags` | from the **platform alias** — see Configuration |
| `Microsoft.VSTS.Common.Priority` | `2` |
| `System.AssignedTo` | the user filing the log (the PAT owner) |
| Parent | the current sprint's Feature |
| `System.State` / `System.Reason` | `Closed` / `Completed` |

**Title format.** `<Name> <activity> <D.MM>` — activity lowercased, day without a leading zero, month
with one: `8.09`, `12.09`.

### Deriving `<Name>`

`<Name>` is the **first name of the identity the PAT belongs to** — the first token of its display
name. A display name of `<First> <M>. <Last> (<Org>)` yields `<First>`, giving
`<First> meetings 8.09`.

Take the first token only: drop middle initials, surnames, and any parenthesised org suffix. Do not
shorten it, do not use initials, and do not use the email local part. Deriving it this way means the
skill works for anyone on the team without configuration.

## Hours

The user speaks in minutes and hours; the field takes decimals. Convert on the way in, and **show the
converted value in the confirmation** so a bad conversion is caught before it is written.

| User says | Write |
|-----------|-------|
| `90 mins`, `1h30`, `1.5h` | `1.5` |
| `2 hours`, `2h` | `2` |
| `30 mins`, `half an hour` | `0.5` |
| `45 mins` | `0.75` |

Round to two decimals. If a stated duration does not land on a clean quarter-hour, write the exact
decimal rather than rounding to a "nicer" number — it is the user's time, not yours to tidy.

If the user gives a total and a partial split ("8 hours, 2 of it meetings"), assign the remainder to
the other named activity and **say so in the confirmation**. If the remainder is ambiguous — more than
one unnamed activity — ask instead of dividing it yourself.

## Flow

Always pass the resolved `project` — the MCP server has no default and a missing `project` pops an
interactive picker that stalls the flow.

Locate tools at runtime with ToolSearch; full names are `mcp__azure-devops__<tool>`.

### 1. Resolve the date

Default to today. Honour an explicit "yesterday" / a named weekday / an explicit date. The date drives
both the title and the duplicate check, so state it back in the confirmation.

### 2. Resolve the sprint

`work` action `list_team_iterations`, `timeframe: "current"`, with `project` and the `team` from the
platform alias. Take the returned iteration's `path` (e.g. `<Project>\Sprint <n>`).

**`team` is required** — omit it and the MCP server pops an interactive picker that stalls the flow.
It comes from the alias, so resolve the alias first. Read each team's own iteration rather than
assuming teams stay in step, even when they currently share a sprint.

For a back-dated log, `timeframe: "current"` may return the wrong sprint. When the target date falls
outside the current iteration's start/finish dates, fall back to `work` action `list_iterations` and
pick the iteration whose date range contains the target date.

**`list_iterations` returns a different kind of path.** Its `path` is the classification-node form —
`\<Project>\Iteration\Sprint <n>` — not what WIQL and `System.IterationPath` accept. Drop the
leading backslash and the `Iteration\` segment before using it: `<Project>\Sprint <n>`. Handing the
node path to step 3 matches nothing and reads as "this sprint has no Feature".
`list_team_iterations` needs no such repair — its `path` is already the usable form.

That call also returns the project's **entire** iteration tree — on a mature project, ~100k
characters, over the tool-output limit even at `depth: 1`. Expect it to spill to a file and search
that file for the sprint name; do not re-request it with a bigger depth.

### 3. Find the parent Feature

WIQL — the **sprint** Feature sitting in that sprint, in the alias's area:

```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = '<project>'
  AND [System.WorkItemType] = 'Feature'
  AND [System.IterationPath] = '<iteration path returned by step 2>'
  AND [System.AreaPath] = '<area path from the platform alias>'
  AND [System.Title] CONTAINS '-Sprint'
```

Every clause earns its place:

- **Area** — teams commonly share a sprint. Without it, each platform's log gets two Features and
  every run stalls.
- **`=` on the area, not `UNDER`** — when a platform's area path is the project root, `UNDER` sweeps
  in every nested area and hands you another team's Feature.
- **`Title CONTAINS '-Sprint'`** — a PI-level Feature (`PI<N> <Name>`) sits on the PI's **last**
  sprint, alongside that sprint's own Feature (`PI<N>-Sprint<M> <Name>`). Same area, same iteration,
  same type. Without this clause the lookup returns two hits and stalls on the final sprint of every
  PI — and the daily Tasks belong on the sprint Feature, never on the PI Feature. The hyphen matters:
  `'Sprint'` alone also matches iteration-shaped titles elsewhere in the data.

WIQL returns **ids only** — follow with `wit_work_item` action `get_batch` for titles.

- **Exactly one hit** → that is the parent.
- **Zero hits** → STOP. The sprint Feature does not exist yet; creating it is out of scope. Say
  which sprint has no Feature and stop. Do not create it, and do not park the Tasks under a Feature
  from another sprint.
- **More than one hit** → STOP and list them with their titles. Let the user pick. Never guess.

### 4. Validate the activities

Map each stated activity onto the picklist in Configuration. A value not on the list is a stop, not
a guess.

### 5. Duplicate guard

Before writing, look for Tasks that already cover this date. WIQL over the Feature's children:

```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = '<project>'
  AND [System.WorkItemType] = 'Task'
  AND [System.Parent] = <Feature id returned by step 3>
  AND [System.Title] CONTAINS '<D.MM of the target date>'
```

Deliberately **not** filtered by name: the whole team's titles for that day come back, and a
`CONTAINS '<Name>'` clause would miss the hand-filed short forms — `CONTAINS '<First>'` does not
match a nickname. Filter by person *after* `get_batch`, on the titles, matching a shortened first
name too.

Check the date on those titles as well: `CONTAINS` on a single-digit day is a substring of the
two-digit days — `'8.09'` also matches `18.09` and `28.09`. Trusting the clause alone invents a
conflict and skips a day that was never logged.

A Task already exists for that Name + activity + date → **STOP and raise it. Write nothing.**

**Never edit a closed Task.** Once a Task is closed the automations have already read it; a later
change to its Original Estimate is invisible downstream, so the number in the report stays wrong
while ADO shows the corrected value. That mismatch is worse than the original mistake, because
nothing surfaces it. Filing a second Task for the same activity and date is equally wrong — it
double-counts the hours.

So a duplicate hit ends the run for that activity. Report it and hand it back:

```text
CONFLICT  <Name> meetings 8.09 already exists as task 110234 (Closed, 1.5 h).
          Nothing written for Meetings. A closed task cannot be corrected here —
          the automations have already consumed it. Resolve it in ADO if the hours are wrong.
```

Then continue with the activities that had no conflict, and list the skipped ones at the end.

An existing Task that is **still open** is a different case — the automations have not read it yet,
so its estimate can be corrected. Show it as an `update` row in the confirmation with both the old
and the new value, and only write it after the user's yes.

### 6. Confirm

Print the full plan — one line per Task — and **wait for a single confirmation covering the set**.
The user asked for the whole day at once; do not ask once per Task, and do not write before the yes.

```text
Sprint <n>  →  parent Feature 110200
web         →  tag <Tag A>, area path <Project>

create    <Name> meetings 8.09       Meetings      1.5   (90 mins)
create    <Name> development 8.09    Development   4     (4 hours)
update    <Name> testing 8.09        Testing       2 → 3  (task 110235, still open)
CONFLICT  <Name> review 8.09         Code Review   —      (task 110236 already Closed — skipped)

2 to create, 1 to update, 1 skipped. 8.5 h total. Write and close them?
```

Always show the **total** — it is the cheapest possible check that the day adds up, and a
transposed digit is obvious there and nowhere else.

### 7. Write

Three calls per Task, in this order. Do not collapse them.

**One `create` at a time — never two in the same block.** Two creates issued in parallel fail: the
second returns `Error creating work item:` with an **empty message** while the first succeeds. Finish
one Task's create, then start the next.

**Only the creates need serialising.** The *parent links* for several Tasks batch into one `link`
call, and the *closes* run fine as parallel `update` calls in a single block. So the shape is: one
create per block, then one batched `link`, then the closes together. Serialising the closes as well
costs extra round trips and buys nothing.

1. **Create** — `wit_work_item_write` action `create`, `workItemType: "Task"`, with `fields`:
   `System.Title`, `Microsoft.VSTS.Common.Activity`,
   `Microsoft.VSTS.Scheduling.OriginalEstimate`, `System.IterationPath`, `System.AreaPath`,
   `System.Tags`, `Microsoft.VSTS.Common.Priority`, `System.AssignedTo`.
   Create it in its **default state** — do not set `Closed` in the create call; a create that also
   jumps state can fail the type's transition rules and leaves nothing behind to diagnose.
2. **Parent** — `wit_work_item_link_write` action `link`, `updates: [{ id: <new task>, linkToId:
   <feature>, type: "parent" }]`.
3. **Close** — `wit_work_item_write` action `update`:

```text
updates: [{ op: "replace", path: "/fields/System.State",  value: "Closed" },
          { op: "replace", path: "/fields/System.Reason", value: "Completed" }]
```

For an existing Task that is **still open**, the only write is `update` on
`/fields/Microsoft.VSTS.Scheduling.OriginalEstimate`. For an existing **closed** Task there is no
write at all — see the duplicate guard. Do not touch it, not even its state.

**A `create` that fails with no message: re-query before you retry.** The empty error says nothing
about whether the Task was written, and a blind retry double-files the hours — the same damage the
duplicate guard exists to prevent. Confirm what actually landed first, over the whole sprint rather
than the Feature's children (a Task that was created but never parented is invisible under the
Feature):

```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = '<project>'
  AND [System.WorkItemType] = 'Task'
  AND [System.IterationPath] = '<iteration path from step 2>'
  AND [System.Title] CONTAINS '<D.MM of the target date>'
```

`get_batch` the hits and read the titles. Retry the create only if this Task's title is absent; if it
is present, the create did land — carry on with its parent link and close instead, and say in the
report that the create errored but wrote.

Report back one line per Task with its new id, then stop.

## Permissions

Writing needs `mode: write` (or `read-write`) in `.claude/secrets.json` and a PAT with **Work Items
(Read & Write)** — see `azure-devops-workflow` for the mode contract.

- `mode: read` → STOP before any write. Say the mode, and that the fix is a `mode` change in
  `.claude/secrets.json`. Print the plan so the user can file it by hand. Do not work around it.
- A write failing `401`/`403` → the token is read-scoped. Say exactly that, point at `AzurePat` in
  `.claude/secrets.json`, fall back to printing the plan. **Do not retry the write.**

If a create succeeds but the parent link or the close fails, **say which Tasks are left half-filed and
with which ids**. A dangling unparented Task is invisible on the Feature and will be re-created
tomorrow by the duplicate guard if it is not reported now.

## Common mistakes

- **One combined Task for the day.** The Activity split is the whole point. Two activities, two Tasks.
- **Hardcoding a name.** `<Name>` comes from whoever's PAT is running the skill — that is what makes
  it work for the whole team, not just its author.
- **Filing under someone else's name.** The identity behind the PAT is the person whose day this is.
  If the display name is not theirs, stop — the PAT is wrong, not the title.
- **Writing minutes into the estimate.** `90` is ninety hours. Convert: `1.5`.
- **Leaving Tasks open.** The agreement is filed *and closed*. A created-but-open Task is not done.
- **Firing the creates in parallel** to save a round trip. The second one fails with an empty error
  message. One `create` per block, in sequence.
- **Reusing an id, sprint number or area path from an example.** Every one of them is a placeholder.
- **Omitting `project`.** Stalls on an interactive picker.
