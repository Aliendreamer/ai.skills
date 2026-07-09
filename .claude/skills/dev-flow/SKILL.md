---
name: dev-flow
description: Use when starting, implementing, or completing any feature/change/plugin in an Nx + .NET + TanStack Start project (e.g. PersonalCommandCenter) — at feature start, before writing code, and before claiming any change done or green.
---

# Dev Flow

## Overview

The repeatable cycle for building and changing this project, one subsystem/plugin at a
time. Each change runs the same loop: **brainstorm → OpenSpec propose → OpenSpec apply with
TDD → verify all green → simplify → review → archive.** Navigation and edits use Serena's
semantic tools. **A change is not done until every quality gate and test is green.**

**Core principle:** No change is "done" on assertion. Done = gates and tests run, output
seen, all green. Evidence before claims.

## When to Use

- Starting any new subsystem, plugin, or feature.
- Before writing implementation code for a change.
- Before claiming a change is "done", "fixed", "working", or "green".
- Before committing, merging, or archiving an OpenSpec change.

## The Cycle

1. **Brainstorm** (`superpowers:brainstorming`) — turn the idea into a design doc in
   `docs/superpowers/specs/`. Get explicit approval before any code.
2. **Propose** (`/opsx:propose`) — create the OpenSpec change: proposal, design, tasks.
3. **Apply with TDD** (`/opsx:apply`, `superpowers:test-driven-development`) — for each task:
   write the failing test first, watch it fail, write minimal code, watch it pass, refactor.
4. **Edit with Serena** — use Serena semantic tools (`find_symbol`, `replace_symbol_body`,
   `find_referencing_symbols`, etc.) for navigation/edits over raw text search where it helps.
5. **Add tests for every new functionality** — no behavior ships without a test that covers
   it. New endpoint, new plugin, new widget, new branch of logic → new test.
6. **HTTP endpoints changed → update the `.http` file** — if the change adds or modifies a web
   endpoint (controller action or minimal-API route), create or update the matching `.http`
   file with a request that exercises it (method, path, headers, body). See Web Endpoints below.
7. **Verify all green** (Quality Gates below) — run the gates, read the output, confirm green.
8. **Simplify** (`/simplify` or the `code-simplifier` agent) — clean up the change for reuse,
   simplification, and clarity. Quality only; it does not hunt for bugs. Re-run the gates after.
9. **Review** (`superpowers:requesting-code-review` or `/code-review`) after simplify, before merge.
10. **Archive** (`/opsx:archive`) — finalize the OpenSpec change once implemented and green.

## Quality Gates (must be GREEN before a change is done)

Run the gates for whatever the change touched. In this Nx monorepo, prefer `affected`.

**.NET (core-api + `*.api` plugin modules):**
```bash
dotnet build      -warnaserror           # build clean, warnings fail
dotnet format     --verify-no-changes    # formatting/analyzers
dotnet test                              # all tests pass
```

**TanStack Start / frontend (`web` + `*.ui` plugin libs):**
```bash
nx affected -t typecheck     # tsc --noEmit, no type errors
nx affected -t lint          # eslint clean
nx affected -t test          # vitest/jest pass
nx affected -t build         # builds clean
npx prettier --check .       # formatting
```

**Whole-change gate:** when in doubt run `nx run-many -t lint test build typecheck` plus the
.NET trio. If any command is non-zero or any test red, the change is **not done** — fix it.

## The Done Gate (non-negotiable)

A change is done ONLY when ALL of these are true and you have **seen the output**:

- [ ] Every new/changed functionality has a test covering it.
- [ ] If a web endpoint was added or changed, its `.http` file is created/updated.
- [ ] `.NET` gates green (build · format · test).
- [ ] Frontend gates green (typecheck · lint · test · build · prettier).
- [ ] Change simplified, then reviewed (simplify precedes review).
- [ ] OpenSpec tasks for the change are checked off.

## Web Endpoints → `.http` file

If a change **adds or modifies a web endpoint** (a controller action or minimal-API route),
create or update the matching `.http` file so the endpoint is exercisable by hand.

**Convention — one `.http` file per API project:**

- **Location & name:** `{ProjectName}.http` at the project root, beside its `.csproj` — the
  ASP.NET Core default. So `core-api/core-api.http`; a plugin module `Weather.Api` →
  `Weather.Api/Weather.Api.http`. One file per project, never a shared grab-bag.
- **Environments:** a single `http-client.env.json` at the solution root defines the shared
  environments (`dev`, `docker`) with a `hostAddress`. Each `.http` file opens with
  `@HostAddress = {{hostAddress}}` and builds requests as `{{HostAddress}}/api/...` — no
  hard-coded hosts, so the same file runs against local and docker.
- **One block per endpoint:** separate requests with `###`, label each `# @name Verb_Route`,
  and order them to mirror the controller/route grouping. Include required headers (auth,
  `Content-Type`) and a representative body. Reuse `@vars` for tokens and shared paths.

**On change:** new endpoint → add its block; changed endpoint (path, verb, params,
request/response shape) → update the existing block so it still reflects reality.

No new/changed HTTP surface → no `.http` change needed. This is the one predicate: *did the
web endpoint surface change?* If yes, the `.http` file is part of the same change.

## Security (Non-Negotiable)

**REQUIRED:** Follow `secrets-safety` for every bash command or script written in this flow.
No credential reads, no secret echoing, no running credential-touching operations on the
user's behalf. The user runs those. See `secrets-safety` for the full rule set.

## Red Flags — STOP, you are about to violate the flow

- "It's a small change, I'll skip the test." → Small changes break. Write the test.
- "I'll write the test after." → Tests-after prove nothing. Test first (TDD).
- "It builds, so it's done." → Done = all gates + tests green, output seen.
- "I'm confident it passes." → Confidence is not evidence. Run the gate, read the output.
- "I'll just edit the text directly." → Use Serena semantic tools where they apply.
- Claiming green without running the commands. → Run them. Observe the result.
- "Changed the endpoint, the `.http` file can wait." → It's part of this change. Update it now.
- "I'll review it, simplifying is extra." → Simplify first, then review. Both, in that order.

All of these mean: stop, run the gate, write the missing test, and confirm green before
saying done.

## Releasing

Versioning and changelogs use **Nx Release**, driven by Conventional Commits (which this
flow already produces). One fixed version spans the whole repo — JS and .NET stay in lockstep.

- **Preview:** `pnpm release:dry` — reports the next version + changelog, changes nothing.
- **Release:** `pnpm release` — bumps versions, stamps `<Version>` into `Directory.Build.props`,
  updates root `CHANGELOG.md`, then commits `chore(release): vX.Y.Z` and tags `vX.Y.Z`.
- First release only: `pnpm release --first-release` (seeds the baseline).

Release after a meaningful batch of `feat`/`fix` commits is on `main` and green. Nothing is
published (private workspace); nothing is pushed (no remote yet).

## Conventions this flow assumes

- **Plugins are compile-time modules activated via `appsettings`** (`Plugins:{id}:Enabled`).
- **A plugin = an `*.api` .NET module + a matching `*.ui` Nx React lib.**
- **Hybrid boundary:** device/IoT logic goes through Home Assistant; the UI never calls HA
  directly — only via core-api.
- **Deploy via docker-compose**; adding infra (e.g. `home-assistant`) = another service.
- Spec docs in `docs/superpowers/specs/`; OpenSpec changes in `openspec/changes/`.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Coding before a design/proposal exists | Brainstorm → propose first. |
| Implementation before a failing test | TDD: red, then green. |
| Marking done with red/unknown gate state | Run gates, see green, then done. |
| New endpoint/widget with no test | Add the test as part of the same change. |
| Endpoint added/changed, `.http` file untouched | Update the `.http` file in the same change. |
| Reviewing before simplifying | Simplify first, then review. |
| Editing by blind text replace | Use Serena `find_symbol` / `replace_symbol_body`. |
