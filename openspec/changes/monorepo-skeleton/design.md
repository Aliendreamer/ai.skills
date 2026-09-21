## Context

See `proposal.md` — Why, for the gap and the duplication figures.

Constraints that shape the approach:

- **Prompts are folder items, same as skills.** `generateCatalog` reads `prompts/<id>/PROMPT.md`
  frontmatter; the folder may carry auxiliary files, which the installer copies recursively for
  folder-based agents. The `nx-monorepo` skeleton can therefore ship real config files rather than
  describing them in prose — the same capability the `context-hooks` kit established.
- **`CHANGELOG.md` is generated.** `nx release` owns it (`nx.json` → `release.changelog`), so the
  breaking removal is recorded by a conventional-commit `!` and a `BREAKING CHANGE:` footer, not by
  editing the file.
- **The source repo is a live product, not a template.** Its workspace layer is worth generalising;
  its domain is not. An internal container registry and a vendor integration have to come out.
- **Prompts are already long** (12–25k chars). The workspace skeleton covers six areas and cannot
  be a wall of prose without becoming unusable.
- **Nx cannot run in this workspace's sandbox** (`tsx`/`nx` need a Unix socket that is denied).
  Catalog regeneration goes through the `tsc`-compiled CLI.

## Goals / Non-Goals

**Goals:**

- One workspace skeleton that a fresh repo can adopt whole, shipping files rather than descriptions
  wherever a file is the clearer artifact.
- A prompt set with no duplicated content between entries.
- A retrofit path for repos that already exist.

**Non-Goals:**

- A CI pipeline file. See proposal — Impact.
- Preserving the Direct BFF architecture. The user chose to drop it; it is recoverable from git
  history if that turns out to be wrong.
- Changing `libs/catalog` or `libs/install`. This is content plus one skill spec.
- Making the skeleton stack-agnostic. It is deliberately Nx + pnpm + .NET + TanStack; a
  general-purpose monorepo generator is a different thing and a worse one.
- Shipping a deployment mechanism. The source repo's `update-deploy.sh` patches an image tag into a
  sibling ArgoCD repo with a fixed internal layout — the mechanism itself is infrastructure, so
  genericising it would leave a script that hard-fails on first run for nearly everyone. The
  portable half (`build.sh`: build, tag `YYYYMMDD.<short-sha>`, push) ships; the `deploy` contract
  is documented in prose and its Nx target is a placeholder. Same reasoning as the CI file.

## Decisions

### The skeleton ships files, not descriptions of files

`nx.json`, the husky hooks, `commitlint.config.js`, `.lintstagedrc.json`, the compose file and the
`tools/` scripts go in `prompts/nx-monorepo/skeleton/` as real files. Prose describes *why* each
exists and what to change; the file is the content. Config transcribed into a prompt body is
transcription an agent can get wrong, and it cannot be diffed against the source it came from.

*Alternative considered:* prose-only, matching the existing prompts. Rejected — those prompts
describe code an agent writes, which is genuinely generative; this is configuration that should
arrive identical every time.

### The proxy is a first-class app in the skeleton

The source repo's third app is what makes the SSR architecture coherent: `/api/` to the backend,
everything else to SSR, `/hc` to a health endpoint. Without it the prompt set describes two apps
and leaves the reader to invent the thing that joins them. It ships with a placeholder base image
and an explicit note that the image is environment-specific.

### `dotnet-version-actions.cjs` ships as-is

The backend has no `package.json`, so Nx Release cannot version it natively; the shim teaches Nx to
read and write the MSBuild `<Version>` in `Directory.Build.props`. This is the single least
guessable piece in the whole setup and the most likely to be rebuilt badly from scratch. It is
generic — no project names in it — so it copies unchanged.

### The skill checks; the prompt defines

`monorepo-hygiene` expresses its checks against the skeleton and links to it, and ships no copy of
the skeleton's content. Two descriptions of one shape drift, which is the failure the previous
change was about. This is pinned as a spec requirement, not left to discipline.

### Prompt merges keep the app prompts' existing structure

`dotnet-webapi` and `fe-ssr-tanstack` already have a working shape (STEP 0, Outcome, Stack,
Components, Gotchas, Verify, Build order). The absorbed auth material slots into those sections
rather than arriving as an appended block, so the merged prompts read as one document.

## Risks / Trade-offs

- **Deleting two published entries breaks installs** → unavoidable given the decision to remove
  rather than deprecate. Mitigated by the `!` commit and the generated changelog entry; the SSR
  path is fully covered by the merged prompts.
- **The Direct BFF write-up is lost from the store** → it stays in git history. Worth stating in
  the commit body so it is findable.
- **Shipping config files dates faster than prose** → a pinned `packageManager` or an Nx version
  goes stale. The prompt says to bump to current at build time, as the existing prompts already do
  for dependencies.
- **The skeleton encodes one opinionated stack** → that is the point, but a reader on a different
  stack gets less than the title promises. The description names the stack explicitly.
- **Generalising from a live repo risks carrying its domain over** → the same leakage check that
  the earlier port used runs over everything copied, and is a task rather than an intention.
- **`monorepo-hygiene` overlaps `setup-flow`** → they touch different files (`setup-flow` owns the
  agent instruction file and `.claude/settings.json`; this owns workspace tooling). The boundary is
  stated in both descriptions so neither grows into the other.

## Migration Plan

1. Land the `nx-monorepo` prompt and the merged app prompts together — the merges reference the
   skeleton, so a half-landed state has dangling references.
2. Delete the two cookie-auth prompts in the same commit; regenerate the catalog.
3. Land `monorepo-hygiene` after the prompt, since it points at it.
4. Release with a `!` commit so the generated changelog carries the breaking note.

**Rollback:** the deleted prompts are recoverable with `git revert`; the catalog regenerates from
whatever is on disk.

## Open Questions

- Whether `skills-lock.json` (third-party skills pinned by content hash) belongs in the skeleton or
  is its own change. It solves a real problem the store now has, having just taken on its first
  third-party item, but it is a store-wide mechanism rather than a workspace file. Deferrable: it
  adds a capability rather than changing any here.
