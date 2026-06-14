# ai.skills

[![npm](https://img.shields.io/npm/v/@aliendreamer/ai-skills)](https://www.npmjs.com/package/@aliendreamer/ai-skills)
[![NuGet](https://img.shields.io/nuget/v/AiSkills.Cli)](https://www.nuget.org/packages/AiSkills.Cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A store for **AI agent skills and app-pattern starter prompts**, with one-command installers for
Claude Code, Codex, Cursor, Copilot, and Gemini — via `npx` (Node) or a `dotnet tool` (.NET).

The Git repo **is** the store: a generated `catalog.json` lists every item, and the CLIs fetch
content straight from GitHub — no clone required.

## Install the CLI

npx (no install needed):

```sh
npx @aliendreamer/ai-skills list
```

dotnet tool:

```sh
dotnet tool install -g AiSkills.Cli
ai-skills list
```

## Usage

```sh
ai-skills list [--type skill|prompt] [--agent <agent>]
ai-skills search <query>
ai-skills info <id>
ai-skills add [ids...] [--all] [--agent <agent>] [--project|--global] [--yes]
```

- **Skills** install for `claude`, `codex`, `copilot` (a `SKILL.md` folder) and `cursor` (a single
  `.mdc`). **Prompts** install for all five, rendered to each agent's format: a markdown command
  (claude/codex/cursor), a `.prompt.md` (copilot), or TOML (gemini).
- `add` with no ids opens an interactive multi-select. `--project` (default) installs into the
  current repo; `--global` into your home config.
- Point at a fork/branch with `--repo <owner/repo>` / `--ref <ref>` (or `AI_SKILLS_REPO` /
  `AI_SKILLS_REF`).

## What's in the store

Items live under `skills/<id>/SKILL.md` and `prompts/<id>/PROMPT.md`; related items share a tag,
so `ai-skills search <tag>` surfaces a whole set. The lists below are a snapshot — run
`ai-skills list` for the live catalog.

### Skills

General:

- `audit-package-version` — enforce exact dependency versions (no `^`/`~`) in npm + .NET.
- `conventional-commits` — write Conventional Commits messages.
- `development-flow` — the brainstorm → OpenSpec → TDD → verify → archive build cycle.
- `llm-setup-audit` — harden Claude Code config (permissions, sandbox, hooks, secrets).
- `web-security-audit` — app-security regression checks (auth, cookies, CORS, OIDC, secrets).

Smart-TV (`smarttv`):

- `audit-tv-focus` — audit a component/screen for TV D-pad focus + Magic Remote correctness.
- `compact-tv-check` — check code for Chromium 70 / TV-platform compatibility.
- `design-review` — review UI changes against a reference TV app as a designer.
- `graphql-audit` — flag `@deprecated` fields/args used in `.graphql` operations.
- `norigin-focus` — audit Norigin `useFocusable` for missing `autoRestoreFocus`.
- `scaffold-tv-screen` — scaffold a TV screen (focus, D-pad, Magic Remote, RSC/client split).

React quality gates (`react-dev`):

- `circular-check` — detect circular imports in `src/`.
- `semantic-html-audit` — flag non-semantic clickables; enforce native `<button>`.
- `use-effect-guard` — flag `useEffect` not syncing with an external system.

### Prompts

- `cookie-auth-direct` — Direct BFF cookie-session stack (browser → public .NET API).
- `cookie-auth-ssr` — SSR BFF cookie-session stack (TanStack SSR → private API).
- `dotnet-webapi` — build a .NET FastEndpoints backend (EF/Postgres, Keycloak, sessions).
- `fe-ssr-tanstack` — build the TanStack Start SSR BFF frontend half.

## Repository layout

```text
skills/            store skills (one SKILL.md per folder)
prompts/           store prompts (one PROMPT.md per folder)
catalog.json       generated index — do not hand-edit
libs/catalog/      catalog types + generate / validate / load (TypeScript)
libs/install/      agent adapters, GitHub fetch, install logic (TypeScript)
apps/cli-npx/      the npx CLI, bundled to a single self-contained file
apps/cli-dotnet/   the dotnet tool (Spectre.Console.Cli)
openspec/          specifications and change history
scripts/           publish / release scripts
```

It is an Nx + pnpm monorepo; the dotnet project uses the .NET SDK with xUnit tests.

## Development

```sh
pnpm install
pnpm nx run-many -t lint test build typecheck   # all quality gates
pnpm generate-catalog                           # rebuild catalog.json from content
pnpm validate                                   # validate catalog + up-to-date check
pnpm lint:md                                    # markdownlint the authored docs
```

## Authoring content

Each item's YAML frontmatter is the single source of truth for the catalog:

```yaml
---
name: my-skill # = id; kebab-case; matches the folder name
description: "one-line summary"
type: skill # or: prompt
tags: [example]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
# prompts additionally need: appPattern: <slug>
---
```

After adding or editing content, run `pnpm generate-catalog` and commit `catalog.json`. Use exact
dependency versions (no `^`/`~`) — see the `audit-package-version` skill.

## Releasing & publishing

One fixed version spans the workspace (Nx Release + Conventional Commits drive `CHANGELOG.md`).
**npm and NuGet are published by separate scripts** so they can ship independently.

| command | what it does |
| --- | --- |
| `pnpm release:dry` | preview the next version + changelog (no changes) |
| `pnpm release:version` | bump version, write CHANGELOG, commit, tag (no publish / push) |
| `pnpm publish:npm` | build + `npm publish` `@aliendreamer/ai-skills` |
| `pnpm publish:nuget` | `dotnet pack` + push `AiSkills.Cli` |
| `pnpm release:npm` | gates → publish npm → push commit & tags |
| `pnpm release:nuget` | gates → publish nuget → push commit & tags |

Typical release:

```sh
pnpm release:version    # once per release: shared version + tag
pnpm release:npm        # gates → npm publish → git push --follow-tags
pnpm release:nuget      # gates → nuget publish → git push --follow-tags (needs nuget_key)
```

The first ever release needs `pnpm release:version --first-release` (no prior tag to diff from).
Each `release:*` script runs the gates, publishes its registry, and pushes the commit + tags;
pass `--skip-checks` to bypass the gates.

### Credentials (git-crypt)

Publish tokens live in `config.conf`, encrypted in the repo with **git-crypt** (plaintext only in
your local working copy). The publish scripts read them by name without executing the file:

```ini
npm_token=<npm automation token>
nuget_key=<nuget.org api key>
```

After cloning, unlock with your key (`git-crypt unlock <your-key>`); never commit the key itself.

## Contributing

1. Add a skill at `skills/<id>/SKILL.md` or a prompt at `prompts/<id>/PROMPT.md`, using the
   frontmatter shown above (`name` must equal the folder).
2. Run `pnpm generate-catalog` and commit the updated `catalog.json`.
3. Make the gates pass: `pnpm nx run-many -t lint test build typecheck`, `pnpm lint:md`,
   `pnpm validate`.
4. Use Conventional Commits and exact dependency versions (the `audit-package-version` skill
   enforces the latter).
5. Open a pull request.

## License

[MIT](LICENSE) © Aliendreamer
