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

Below, `ai-skills` is the installed dotnet tool command. With npx, replace it with
`npx @aliendreamer/ai-skills` (e.g. `npx @aliendreamer/ai-skills add web-security-audit`).

```sh
ai-skills list [--type skill|prompt] [--agent <agent>]
ai-skills search <query>
ai-skills info <id>
ai-skills add [ids...] [--all] [--agent <agents>] [--all-agents] [--project|--global] [--yes]
```

Examples (shown via npx — drop the prefix if you installed the dotnet tool):

```sh
npx @aliendreamer/ai-skills                                                # bare = the interactive wizard
npx @aliendreamer/ai-skills add web-security-audit --agent claude,cursor   # one item, two agents
npx @aliendreamer/ai-skills add --all --all-agents                         # everything, everywhere
```

- **Skills** install for `claude`, `codex`, `copilot` (a `SKILL.md` folder) and `cursor` (a single
  `.mdc`). **Prompts** install for all five, rendered to each agent's format: a markdown command
  (claude/codex/cursor), a `.prompt.md` (copilot), or TOML (gemini).
- Running the CLI with **no command** launches the interactive wizard directly (it's the default
  command). `add` with no ids does the same: pick a type (skills / prompts / everything), multi-select
  the items, multi-select the agents, then choose one scope — each chosen item is installed to
  **every** chosen agent. A failure for one item/agent pair is reported without aborting the rest.
- You can step **back** at any point: choose **← Back** on the type/scope menus, or submit an empty
  selection on the item/agent menus to return to the previous step (back from the first step cancels).
- Target agents non-interactively with `--agent claude,cursor` (comma-separated) or `--all-agents`.
  `--project` (default) installs into the current repo; `--global` into your home config. `--yes`
  skips prompts and requires `--agent` or `--all-agents`.
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
| `pnpm release:version` | manually bump version + CHANGELOG + tag (release:npm does this for you) |
| `pnpm publish:npm` | build + `npm publish` `@aliendreamer/ai-skills` (guards against a duplicate) |
| `pnpm publish:nuget` | `dotnet pack` + push `AiSkills.Cli` (guards against a duplicate) |
| `pnpm release:npm` | gates → bump (minor by default) → publish npm → push commit & tags |
| `pnpm release:nuget` | gates → publish nuget at the shared version → push commit & tags |

Typical release:

```sh
git commit -m "feat(cli): ..."   # commit first so the CHANGELOG + tag reflect the change
pnpm release:npm                 # bumps minor (e.g. 0.3.0 -> 0.4.0), publishes npm, pushes tag
pnpm release:nuget               # publishes that same version to NuGet, pushes (needs nuget_key)
```

`release:npm` bumps the single shared workspace version from its current value — **minor by
default**; pass a level to change it (`pnpm release:npm -- --patch` or `-- --major`). `release:nuget`
ships that version (no second bump). Pass `-- --no-bump` to publish the current version as-is, or
`-- --skip-checks` to skip the gates.

The bump itself does not need any commits, but the `CHANGELOG.md` entry is generated from
Conventional Commits since the last tag — so **commit your work before releasing**, or the entry
will read "version bump only, there were no code changes" and the tag won't contain the source.

### Credentials (git-crypt)

Publish tokens live in `config.conf`, encrypted in the repo with **git-crypt** (plaintext only in
your local working copy). The publish scripts read them by name without executing the file:

```ini
npm_token=<npm automation token>
nuget_token=<nuget.org api key>
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
