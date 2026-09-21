## 1. Extract and genericise the workspace skeleton

- [x] 1.1 Create `prompts/nx-monorepo/skeleton/` and copy the workspace files from the source repo:
      `nx.json`, `pnpm-workspace.yaml`, root `package.json`, `.husky/pre-commit`,
      `.husky/commit-msg`, `commitlint.config.js`, `.lintstagedrc.json`, `.editorconfig`,
      `cspell.json`, `.markdownlint-cli2.jsonc`, `.prettierignore`, `.nxignore`
- [x] 1.2 Copy the local dev stack: `tools/localdev/docker-compose.yml`, the per-app dev
      Dockerfiles, `postgres.dev.Dockerfile`, and `stack.sh`
- [x] 1.3 Copy the test/coverage tooling: `tools/test-all.sh`, `tools/e2e.sh`,
      `tools/coverage-report.sh`, `tools/e2e-coverage.sh`, `coverage.runsettings`,
      `flush-coverage.cjs`, and the coverage compose overlay
- [x] 1.4 Copy the release tooling: `tools/nx-release/dotnet-version-actions.cjs` and the
      `release` block of `nx.json` (independent groups, conventional commits, per-project
      changelogs, `{projectName}@{version}` tags)
- [x] 1.5 Copy the proxy app: `Dockerfile` and `files/nginx.conf`, plus its `project.json` targets
- [x] 1.6 Copy `tools/deploy/build.sh` (portable: image build + `YYYYMMDD.<short-sha>` tagging,
      registry credentials from env) and the per-app `push`/`deploy` target definitions. Do NOT ship
      `update-deploy.sh` — its mechanism is a sibling ArgoCD repo with a fixed internal layout, not
      something a find-replace generalises
- [x] 1.7 Genericise every copied file: replace the internal container registry with a documented
      placeholder, remove the vendor-specific integration, and replace the source project's name
      throughout with the skeleton's placeholder
- [x] 1.8 Leakage gate: grep the whole `prompts/nx-monorepo/` tree for the source org, project,
      registry, vendor names and any real identifiers; zero hits required before proceeding

## 2. Write the `nx-monorepo` prompt

- [x] 2.1 Write `prompts/nx-monorepo/PROMPT.md` frontmatter: `name`, folded `description` naming
      the stack (Nx + pnpm + .NET + TanStack SSR + nginx) and that it ships skeleton files,
      `type: prompt`, `appPattern: nx-monorepo`, `tags`, `agents` (folder-based only — the skeleton
      files do not reach cursor), `version: 0.1.0`, `author`
- [x] 2.2 Follow the existing prompts' structure: STEP 0 (ask, then stop), Outcome, Stack,
      Components, gotchas, Verify before claiming done, Suggested build order
- [x] 2.3 Document each skeleton area with why it exists and what to change — task wiring, commit
      hygiene, local dev stack, test/coverage, release, proxy and deploy — referring to the shipped
      file rather than reproducing it
- [x] 2.3a Document the `deploy` contract in prose, since no script ships for it: `push` prints a
      deployable tag, and `deploy` patches that tag into whatever the target reads. State that the
      Nx `deploy` target's command is a placeholder the adopter replaces
- [x] 2.4 Document the Nx targets a CI pipeline should call, and explicitly do NOT ship a pipeline
      file
- [x] 2.5 Call out the pieces most likely to be rebuilt badly from scratch: the .NET version-actions
      shim, the proxy routing rule, and `lint-staged --no-stash`
- [x] 2.6 State the environment-specific items the adopter must replace: container registry, deploy
      target, Keycloak realm

## 3. Merge the auth prompts into the app prompts

- [x] 3.1 Merge the BE half of `cookie-auth-ssr` into `prompts/dotnet-webapi/PROMPT.md` — cookie
      session, token resolution, private-behind-the-BFF posture — into the existing sections rather
      than as an appended block
- [x] 3.2 Merge the FE half of `cookie-auth-ssr` into `prompts/fe-ssr-tanstack/PROMPT.md` — auth
      proxy route, cookie re-homing, Keycloak harness — likewise
- [x] 3.3 Carry over every CRITICAL gotcha from `cookie-auth-ssr` into whichever merged prompt owns
      it; these are the hardest-won content in the set and must not be dropped in the merge
- [x] 3.4 Add a line to both merged prompts pointing at the `nx-monorepo` skeleton as the workspace
      they drop into
- [x] 3.5 Verify no content from `cookie-auth-ssr` is lost: diff its section list against the two
      merged prompts and account for every section as merged, superseded, or deliberately dropped
- [x] 3.6 Bump both merged prompts' `version` (minor — they gain capability)

## 4. Remove the superseded prompts

- [x] 4.1 Delete `prompts/cookie-auth-direct/` and `prompts/cookie-auth-ssr/`
- [x] 4.2 Confirm `bff-cookie-auth` no longer appears as an `appPattern` anywhere
- [x] 4.3 Grep the repo (skills, prompts, README, specs) for references to either removed id and
      update or remove them

## 5. Write the `monorepo-hygiene` skill

- [x] 5.1 Create `skills/monorepo-hygiene/SKILL.md` with catalog frontmatter; the description must
      state that it retrofits an existing repo and name the boundary with `setup-flow`
- [x] 5.2 Structure the audit by the six areas: task wiring, commit hygiene, local development,
      test and coverage, release, deployment
- [x] 5.3 Encode the spec's contract: report before changing, respect existing configuration, each
      finding carries a verdict, say so when evidence is insufficient
- [x] 5.4 Encode the read-only rule: determine presence by reading configuration, never by running
      builds, test suites, container stacks or deploy commands
- [x] 5.5 Reference the `nx-monorepo` skeleton for content instead of restating it — verify by
      checking no skeleton file's content is reproduced in the skill

## 6. Catalog and gates

- [x] 6.1 Regenerate the catalog with the compiled CLI (`node libs/catalog/dist/cli/generate.js`) —
      Nx cannot run in this sandbox
- [x] 6.2 Confirm the catalog holds 26 entries: two prompts removed, `nx-monorepo` and
      `monorepo-hygiene` added; and that no entry lists an agent that cannot install it
- [x] 6.3 Run catalog validation; confirm valid and up to date
- [x] 6.4 Run markdownlint to zero errors; add any new domain terms to `cspell.json`
- [x] 6.5 Confirm shipped scripts are recorded by git as executable (mode `100755`)
- [x] 6.6 Repo-wide leakage gate: zero hits for the source org, project, registry and vendor names
      across `skills/`, `prompts/` and `catalog.json`

## 7. Close out

- [x] 7.1 Re-read the change's spec and confirm every requirement has an implementing or verifying
      task above
- [x] 7.2 Run `openspec validate monorepo-skeleton --strict`
- [x] 7.3 Commit with a conventional-commit `!` and a `BREAKING CHANGE:` footer naming both removed
      ids, so the generated changelog carries it; note in the body that the Direct BFF write-up
      remains in git history
- [x] 7.4 Report what changed, what was verified and how, and what remains environment-specific for
      an adopter to fill in
