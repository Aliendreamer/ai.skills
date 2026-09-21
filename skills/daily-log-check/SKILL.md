---
name: daily-log-check
description:
  'Use to check whether everyone on duty filed their Azure DevOps time-log Tasks for a given day, per platform —
  reports tickets, hours and activities per person against the headcount you give. Fires on "did everyone log
  yesterday", "check web 4 mobile 3", "who is missing for 8.09", "daily log check". Read-only. Org and project come
  from configuration.'
type: skill
disable-model-invocation: false
user-invocable: true
tags: [azure-devops, ado, task, activity, time-log, daily, compliance, check, audit]
agents: [claude, codex, cursor, copilot]
version: 0.1.0
author: Aliendreamer
---

# Daily Log Check

## Overview

The team agreement is that everyone files their hours at the end of each day, one Task per Activity,
under the current sprint's Feature (`daily-activity-log` writes those). This skill answers the
follow-up question: **did they?**

It compares the people who actually filed for a date against **a headcount the user supplies**, per
platform. The headcount cannot be derived — holidays and leave change it daily — so it is always
asked for and never guessed.

**This skill is READ-ONLY.** It never creates, updates or closes anything, so it needs no
confirmation step. If a day is under-filed, report it and stop; filing the missing hours is the
person's own job, not this skill's.

## When to Use

- "Did everyone write their tasks yesterday?"
- "Check web 4 mobile 3" / "check web for 8.09"
- Any question about who is missing a daily log, or how many hours a day added up to.

**When NOT to use:** filing the user's own hours (`daily-activity-log`); creating the sprint or PI
Feature; anything that writes.

## Configuration

`organization` and `projects` come from `.claude/secrets.json` — see `azure-devops-workflow` for the
schema and the mode contract. **Never hardcode an org or project**; resolve `project` once from
`projects[0]` and pass it on every call. If it is missing, ask.

### Platform aliases — configure this

Same mapping as `daily-activity-log`; keep the two in sync. The alias picks the area and the team.
Replace the placeholder rows with your own, and **verify each area path against ADO before relying
on it** — these strings are matched literally:

| The user says | `System.AreaPath` | team (for the sprint lookup) |
|---------------|-------------------|------------------------------|
| `<alias-a>`, `<long form>` | `<Project>` | `<Team A>` |
| `<alias-b>`, `<long form>` | `<Project>\<Sub Area>` | `<Team B>` |

A root-level area (the project node itself) must be matched with `=`, **never `UNDER`**, or every
nested area is swept in and the platforms' results merge into one. If your areas are all nested
siblings this does not apply — but check rather than assume.

The examples below use `web` and `mobile` as aliases. They are illustrations, not defaults.

## Flow

Always pass the resolved `project`. Locate tools at runtime with ToolSearch; full names are
`mcp__azure-devops__<tool>`. Run the steps below once per platform.

### 1. Resolve the date and the sprint

Default to yesterday. `work` action `list_team_iterations`, `timeframe: "current"`, with `project`
and the alias's `team`. If the target date falls outside that iteration's start/finish dates, fall
back to `work` action `list_iterations` and take the iteration whose range contains it — checking a
Monday for the previous Friday can cross a sprint boundary.

### 2. Find the sprint Feature

Substitute the values the earlier steps returned:

```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = '<project>'
  AND [System.WorkItemType] = 'Feature'
  AND [System.IterationPath] = '<resolved iteration path>'
  AND [System.AreaPath] = '<alias area path>'
  AND [System.Title] CONTAINS '-Sprint'
```

The `-Sprint` clause matters: on a PI's last sprint, a PI-level Feature can share the area, iteration
and type with that sprint's own Feature, and without the clause the lookup returns two hits. Zero
hits → stop, say which sprint has no Feature.

### 3. Pull the day's Tasks

```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = '<project>'
  AND [System.WorkItemType] = 'Task'
  AND [System.Parent] = <feature-id from step 2>
  AND [System.Title] CONTAINS '8.09'
```

Query with the **un-padded** day (`8.09`, not `08.09`). That single substring catches every format in
use, because `08.09` and `08.09.2026` both contain `8.09`.

Then `wit_work_item` action `get_batch` with:

```text
fields: ["System.Id", "System.Title", "System.State", "System.CreatedBy", "System.AssignedTo",
         "Microsoft.VSTS.Common.Activity", "Microsoft.VSTS.Scheduling.OriginalEstimate"]
```

### 4. Filter the titles properly

**`CONTAINS '8.09'` also matches `18.09` and `28.09`.** Discard those: the character before the day
must not be a digit. Accept `8.09`, `08.09`, `8.09.2026`, `08.09.2026`, and the same shapes wrapped
in separators (`<name>/Meetings/08.09.2026`). Reject anything where a digit immediately precedes.

Skipping this filter silently pulls in another day's tasks and reports a day as complete when it is
not — the exact failure this skill exists to catch.

### 5. Group by person

Group on **`System.CreatedBy`**, not `System.AssignedTo`. Some people file without assigning, and
grouping on an empty field under-counts them.

Names in titles are not a grouping key either — teams routinely run several title formats at once
(`<name> meetings 8.09`, `<name> Meetings 08.09`, `<name>/Development/08.09.2026`, …). Only the
identity field is reliable.

Per person, total: **ticket count**, **summed Original Estimate**, and the **list of Activities**.

### 5a. Everyone who files counts

**Every person who filed counts toward the headcount — no exceptions, no roles carved out.** If the
agreement says PM and QA file the same as developers, the number the user gives covers everyone on
duty that day, whatever their role.

Do not maintain a list of people to exclude. If a count looks off, the headcount is the thing to
question, not someone's job title.

### 5b. Blank Activity is a warning, not a miss

A Task can carry a title and hours with `Microsoft.VSTS.Common.Activity` empty. It counts as filed
(the person logged their time), but it contributes nothing to the activity breakdown the agreement
exists for. Show it as `(none)` in the activity list and add a warning line under that person:

```text
  <person c>               3 tickets   8 h      Meetings, (none), (none)
       ⚠ 2 tasks have no Activity set: 110301, 110302
```

Never convert this into a miss, and never guess the Activity from the title.

### 6. Report

One block per platform. List each person who filed, then the comparison against the headcount.
**Names, ids and sprint numbers below are placeholders in an example — never reuse one:**

```text
web — 8.09 (Sprint <n>, Feature 110234)   expected 5

  <person a>              3 tickets   8 h     Meetings, Code Review, Development
  <person b>              3 tickets   10 h    Meetings, Documentation, Requirements
  <person c>              3 tickets   8 h     Meetings, (none), (none)
       ⚠ 2 tasks have no Activity set: 110301, 110302
  <person d>              3 tickets   8 h     Meetings, Development, Testing
  <person e>              3 tickets   8 h     Meetings, Testing, Development

  5 of 5 filed — complete.   42 h.

mobile — 8.09 (Sprint <n>, Feature 110235)   expected 4

  <person f>              3 tickets   6.75 h  Meetings, Development, Testing
  <person g>              3 tickets   9 h     Development, Meetings, Code Review
  <person h>              2 tickets   8 h     Meetings, Development

  3 of 4 filed — 1 MISSING.   23.75 h.
```

State `MISSING` plainly with the number. That line is the answer to the question; everything else is
supporting detail. The hours total covers everyone listed.

**More filed than expected is an anomaly, not a pass.** Say so rather than rounding it down to
"complete" — it means either the headcount is wrong or somebody filed who was not on duty, and both
are worth knowing:

```text
  5 of 4 filed — 1 MORE than expected. Check the headcount.
```

The likeliest cause is simply that the stated headcount was low — someone came back from leave, or a
person the user forgot about is on the team. Report the number and let them reconcile it.

**Report what the data says, nothing more.** Do not name who you think is missing (the roster is not
being read), do not judge anyone's hours as too few or too many, and do not speculate about leave.
Numbers and names present, that is all.

### 7. When someone looks missing, check the obvious cause first

A person can file correctly and still be absent from the report if their Tasks are **not parented to
the Feature** — an unparented Task is invisible to step 3's query. Before reporting a shortfall, run
one widening query over the area, without the parent clause:

```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = '<project>'
  AND [System.WorkItemType] = 'Task'
  AND [System.AreaPath] = '<alias area path>'
  AND [System.Title] CONTAINS '8.09'
```

Anything that appears here but not under the Feature is filed-but-unparented. Report those
separately — they are a different problem from not filing at all, and the person will insist they
did it:

```text
  1 task filed for the day but NOT parented to Feature 110234:
     110303  <name> Development 8.09   Development   6 h   (no parent)
```

## Input

| Input | Required | Notes |
|-------|----------|-------|
| Platform | yes | One alias, or **both**. One run can cover both. |
| Headcount per platform | yes | **Ask.** Varies daily with holidays and leave. |
| Date | no | Defaults to **yesterday** — the usual case is checking the previous day. |

> "check web 4 mobile 3" → both platforms, 4 expected on the first, 3 on the second, for yesterday.
> "check web 4 for 8.09" → that platform only, that date.

**Never invent the headcount** — not from team size, not from who filed last time, not from the
number of people who happen to appear in the results. A count the user did not state makes the whole
report meaningless, because the missing-people number is the only thing being asked for.

If the user names a platform but no headcount, ask for just that number and continue.

## Permissions

Read-only, so `mode: read` is sufficient — this skill works under the default mode and must never
need more. If any instinct here says to write something, that is out of scope: report and stop.

A `401`/`403` on a read means the PAT cannot see the project. Say exactly that and stop.

## Common mistakes

- **Guessing the headcount.** It changes daily with leave. Ask; never infer it from the results.
- **Counting the people who filed as the headcount.** That makes every day complete by definition.
- **Grouping by `AssignedTo`.** Some tasks have none. Group by `CreatedBy`.
- **Matching people by the name in the title.** Several formats are in use. Use the identity field.
- **Accepting a bare `CONTAINS '8.09'`.** It matches `18.09` and `28.09` too — filter them out.
- **Querying with the zero-padded day** (`08.09`). It misses `8.09`. Query un-padded, filter after.
- **Using `UNDER` on a root-level area.** It sweeps in the nested areas and merges the platforms.
- **Forgetting the `-Sprint` clause.** Two Feature hits on the last sprint of a PI.
- **Reporting a shortfall without the unparented check.** The person did file; the link is missing.
- **Naming who is missing.** The roster is not read. Report the names present and the count.
- **Carving anyone out of the headcount by role.** Everyone who files counts, PM and QA included.
- **Treating "more filed than expected" as complete.** Report it as an anomaly.
- **Treating a blank Activity as a miss**, or guessing the Activity from the title.
- **Writing anything.** Read-only, always.
- **Omitting `project`.** Stalls on an interactive picker.
