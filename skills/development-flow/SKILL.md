---
name: development-flow
description:
  "Use when starting, implementing, or completing any feature, change, or fix in any software project — at feature
  start, before writing code, and before claiming a change is done, fixed, working, or green. Stack- and
  repo-agnostic: works for a single repo or a monorepo."
type: skill
tags: [workflow, tdd, quality, review]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.2.0
author: Aliendreamer
---

# Dev Flow

## Overview

The repeatable cycle for building and changing a project, one unit of work at a time. Each change runs the same loop:
**brainstorm → plan/propose → implement with TDD → review → verify all green → finalize.** **A change is not done until
every quality gate and test that applies to it is green.**

This flow is stack- and repo-agnostic. It does **not** assume a language, framework, monorepo layout, or specific
tooling — those are discovered per repo (see Quality Gates). The discipline is the same whether you ship a single-repo
Python service, a Go CLI, or a multi-language monorepo.

**Core principle:** No change is "done" on assertion. Done = gates and tests run, output seen, all green. Evidence
before claims.

## When to Use

- Starting any new feature, module, or fix.
- Before writing implementation code for a change.
- Before claiming a change is "done", "fixed", "working", or "green".
- Before committing, merging, or releasing.

## The Cycle

1. **Brainstorm** (`superpowers:brainstorming` if available) — turn the idea into a short design before code. Get
   explicit approval on the approach before implementing.
2. **Plan / propose** — capture the work as a plan or change proposal (e.g. an OpenSpec change via `/opsx:propose`, an
   issue, or a written plan) so scope and tasks are explicit before code.
3. **Implement with TDD** (`superpowers:test-driven-development`) — for each task: write the failing test first, watch
   it fail, write the minimal code to pass, watch it pass, refactor.
4. **Edit with the best tool available** — prefer semantic/symbol-aware edits (e.g. Serena's `find_symbol`,
   `replace_symbol_body`, `find_referencing_symbols`, or an LSP) over blind text replacement where it helps.
5. **Add tests for every new behavior** — no behavior ships without a test that covers it. New endpoint, new function,
   new component, new branch of logic → new test.
6. **Verify all green** (Quality Gates below) — run the gates that apply to what you touched, read the output, confirm
   green.
7. **Review** (`superpowers:requesting-code-review` or your review command) before merge.
8. **Finalize** — merge / release / archive the change once it is implemented and green.

## Quality Gates (must be GREEN before a change is done)

**Discover the repo's gates — do not assume them.** Different repos have different stacks and commands. Find the
authoritative list before running anything:

- **CI config is the source of truth** — read `.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, etc. The
  checks CI runs are the gates the change must pass.
- **Task runners / scripts** — `package.json` scripts, `Makefile`, `justfile`, `Taskfile.yml`, `nx.json` targets,
  `pyproject.toml`, `Cargo.toml`, `.csproj`/`*.sln`.
- **Pre-commit hooks** — `.pre-commit-config.yaml`, Husky/lefthook configs.

Map those to the usual gate categories and run the ones that apply to what you changed:

| Gate | Look for |
| ---- | -------- |
| Build / compile | `build`, `tsc --noEmit`, `dotnet build -warnaserror`, `cargo build`, `go build` |
| Format | `prettier --check`, `dotnet format --verify-no-changes`, `ruff format --check`, `gofmt` |
| Lint / static analysis | `eslint`, `ruff`, `clippy`, `golangci-lint`, analyzers |
| Tests | `vitest`/`jest`, `pytest`, `dotnet test`, `cargo test`, `go test` |
| Typecheck | `tsc --noEmit`, `mypy`/`pyright` |

**Scope to the change.** Run the gates for whatever the change touched. In a monorepo, prefer an `affected`/changed-
scope target (e.g. `nx affected -t lint test build typecheck`) over running everything; in a single repo, run the
repo's gate scripts. **When in doubt, run the full set CI would run.** If any command exits non-zero or any test is
red, the change is **not done** — fix it.

## The Done Gate (non-negotiable)

A change is done ONLY when ALL of these are true and you have **seen the output**:

- [ ] Every new/changed behavior has a test covering it.
- [ ] The repo's build gate is green.
- [ ] The repo's format + lint + typecheck gates are green.
- [ ] The repo's test gate is green.
- [ ] The plan/proposal tasks for the change are checked off.

## Red Flags — STOP, you are about to violate the flow

- "It's a small change, I'll skip the test." → Small changes break. Write the test.
- "I'll write the test after." → Tests-after prove nothing. Test first (TDD).
- "It builds, so it's done." → Done = all gates + tests green, output seen.
- "I'm confident it passes." → Confidence is not evidence. Run the gate, read the output.
- "I don't know this repo's gates, I'll just run the build." → Discover the gates from CI/scripts first.
- "I'll just edit the text directly." → Use semantic/symbol-aware edits where they apply.
- Claiming green without running the commands. → Run them. Observe the result.

All of these mean: stop, discover and run the gates, write the missing test, and confirm green before saying done.

## Releasing

Releasing is driven by **Conventional Commits** (which this flow already produces) so a tool can derive the next
version and changelog. The tool varies by repo — Nx Release, semantic-release, Changesets, release-please, or a manual
tag — so use whatever the repo already configures.

- **Preview first** — run the release tool's dry-run (e.g. `pnpm release:dry`, `semantic-release --dry-run`) to see the
  next version + changelog without changing anything.
- **Release** — bump versions, update the changelog, then commit (e.g. `chore(release): vX.Y.Z`) and tag `vX.Y.Z`.
- **First release** — most tools have a baseline/first-release flag; check the tool's docs.

Release after a meaningful batch of `feat`/`fix` commits is on the main branch and green. Publishing and pushing are
separate steps — only do them if the repo is configured for them.

## Common Mistakes

| Mistake                                  | Fix                                                  |
| ---------------------------------------- | ---------------------------------------------------- |
| Coding before a design/proposal exists   | Brainstorm → plan/propose first.                     |
| Implementation before a failing test     | TDD: red, then green.                                |
| Assuming gate commands                   | Discover them from CI config / task runners first.   |
| Marking done with red/unknown gate state | Run gates, see green, then done.                     |
| New behavior with no test                | Add the test as part of the same change.             |
| Editing by blind text replace            | Use semantic/symbol-aware edits (`find_symbol`, LSP).|
