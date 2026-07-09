# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

`ai.skills` is an **Nx monorepo** hosting a store of AI-agent skills and prompts, plus two CLIs
(`apps/cli-dotnet`, `apps/cli-npx`) that build and validate the catalog. Nx drives every task —
use the **`nx-workspace`** skill to explore projects/targets and **`nx-generate`** to scaffold
new apps or libs (both are described in the Nx block below). Prefer `nx affected` on a change.

## Tooling present

- **Serena** (`.serena/`) — MCP-based code navigation/editing server. Project config lives in `.serena/project.yml`;
  `languages: []` is unset, so populate it once a primary language is chosen. `.serena/memories/` holds on-demand
  project memories.
- **remember** (`.remember/`) — session-state skill. Logs live under `.remember/logs/`; write session handoffs to
  `.remember/remember.md`.

Both directories are tooling artifacts, not project source.

## Commands

Run tasks through Nx (prefix with `pnpm`); use `nx affected` to scope to what a change touched.

- `pnpm nx run-many -t lint test build` — lint, test, and build every project.
- `pnpm nx affected -t lint test build` — same, scoped to the current change.
- `pnpm nx run cli-dotnet:test` / `pnpm nx run cli-dotnet:lint` — the .NET CLI gates.
- `pnpm lint:md` (`pnpm lint:md:fix`) — markdownlint over authored docs.

For scaffolding new apps or libs, invoke the `nx-generate` skill first (see the Nx block below).

## Architecture

_None yet._ Document the big-picture structure (the parts that require reading multiple files to understand) once code
is added.

<!-- markdownlint-disable MD013 MD012 -->
<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->
<!-- markdownlint-enable MD013 MD012 -->