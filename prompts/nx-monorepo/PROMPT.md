---
name: nx-monorepo
description:
  "Scaffold the Nx + pnpm workspace that holds a .NET API, a TanStack Start SSR frontend and an nginx proxy — task
  wiring and caching, commit hygiene, a docker-compose local-dev stack with Postgres/Redis/Keycloak, cross-language
  test and coverage runs, and Nx Release that versions .csproj alongside package.json. Ships the config as real files
  in skeleton/ rather than describing them, so they arrive identical. Folder-based agents only."
type: prompt
tags: [monorepo, nx, pnpm, workspace, docker-compose, release, tooling, dotnet, tanstack]
agents: [claude, codex, copilot]
version: 0.2.0
appPattern: nx-monorepo
author: Aliendreamer
---

# Nx monorepo — workspace skeleton

The workspace that `dotnet-webapi` and `fe-ssr-tanstack` drop into. Those prompts build the apps;
this one builds everything around them.

## How Claude must work on this

- **The skeleton is shipped, not written.** `skeleton/` next to this file holds the real config.
  Copy it; do not retype it. Prose here explains *why* each piece exists and what to change — the
  file is the content.
- **Substitute placeholders, then verify none remain.** Every `<app-name>`, `<AppName>`,
  `<namespace>`, `<environment>`, `<keycloak-host>` and `<Realm>` is a value you collect in STEP 0.
  `<Version>`, `<PropertyGroup>`, `<Function>` and `<Exclude>` are **not** placeholders — they are
  MSBuild/XML tags. Leave them alone. The registry and image namespace are **not** placeholders
  either: `build.sh` reads them from the environment at push time.
- **Do not invent a deploy mechanism or a CI pipeline.** Neither ships, deliberately. See below.
- Work in the build order at the end. The stack is testable long before the apps exist.

## STEP 0 — ask, then stop and wait

Collect these before writing anything, and stop for the answers:

1. **App name** — PascalCase and kebab-case (`<AppName>` / `<app-name>`). Used in service names,
   image names, hostnames (`app.<app-name>.localhost`) and the Keycloak client.
2. **Which apps** — backend, frontend, proxy, or a subset. The proxy only earns its place if the
   frontend is an SSR BFF.
3. **Container registry** — the registry host and image path prefix, or "none yet". They are not
   written into any file: `build.sh` reads `ACR_REGISTRY` and `IMAGE_NAMESPACE` from the environment,
   so you only document where contributors get them.
4. **Deploy target** — what reads the image tag (GitOps repo, Helm, `kubectl`, a platform API).
   You will *document* this, not implement it.
5. **Keycloak realm name** — `<Realm>`, for the local stack and the backend's authority URL.
6. **Backing services** — what the system actually depends on. The skeleton's local stack ships
   Postgres, Redis and Keycloak; a more complex system will need more (a message broker, object
   storage, a search index, a mail catcher, a second database…) and a simpler one less. Get the full
   list now, because every service lands in `docker-compose.yml`, its coverage twin, the backend's
   connection settings and the `depends_on` graph. Drop what is not used — an unused Redis is a
   container someone has to explain later.
7. **Kubernetes namespace(s) and Keycloak service** — `<namespace>`, `<environment>` and
   `<keycloak-host>` (Keycloak's fully-qualified service and port), if the proxy is included; the
   proxy config uses fully-qualified cross-namespace service names.

## Outcome (what exists when done)

- An Nx + pnpm workspace with cached `build`/`test`/`lint` and a `dotnet` named input, so .NET
  changes do not bust the JS cache and vice versa.
- Conventional commits enforced at commit time, and formatting applied to staged files.
- `tools/localdev/stack.sh up` brings the whole system up: Postgres, Redis, RedisInsight, Keycloak
  (pre-seeded realm), and the apps, behind one Traefik that routes exactly like the production nginx.
- The browser needs one origin: `app.<app-name>.localhost` serves the frontend, `/api/` and Keycloak's
  OIDC paths, locally and in production.
- One command runs every test across both languages; another produces a combined coverage report.
- `nx release` versions the .NET project from its MSBuild `<Version>` and the JS projects from
  `package.json`, independently, from conventional commits.
- `nx push <app>` builds and pushes an immutable, commit-traceable image tag.

## The skeleton, area by area

### Task wiring — `nx.json`, `pnpm-workspace.yaml`, `package.json`

`targetDefaults` caches `build`, `test` and `lint`, with `build` depending on `^build`. The
`namedInputs.dotnet` entry is the piece worth understanding: without it, every JS change
invalidates the backend's cache, because the default input is "everything in the project". It
lists `.cs`, `.csproj`, `.slnx`, `Directory.Build.props` and the runsettings, and excludes `bin/`
and `obj/`.

Root `package.json` pins `packageManager` with a hash — keep that pinned and bump it deliberately;
an unpinned package manager is how a workspace drifts between machines. The `push:*` / `deploy:*`
scripts are thin wrappers over the Nx targets so contributors need no global Nx.

### Commit hygiene — `.husky/`, `commitlint.config.js`, `.lintstagedrc.json`

`commit-msg` runs commitlint (conventional commits — **Nx Release reads these to decide version
bumps**, so this is load-bearing, not decoration). `pre-commit` runs `lint-staged --no-stash`.

**`--no-stash` is deliberate.** The default stashes unstaged changes and restores them after; when
a hook fails mid-run that restore can lose work. Keep the flag.

`lint-staged` formats `json`/`md`/`yml`/`yaml` only — code formatting belongs to each app's own
lint target, where it can be language-aware.

### Local development — `tools/localdev/`

`docker-compose.yml` brings up Postgres (built, not pulled — it needs `pg_cron` and `pg_partman`),
Redis + RedisInsight, Keycloak with the realm from `keycloak/realm.json` and an init container that
grants the API's service account its roles, and the apps with their sources bind-mounted. That is a
starting set, not the set: add the services from STEP 0 item 6 with the same shape (healthcheck,
named volume, `depends_on` with `condition: service_healthy`) and mirror each in
`docker-compose.coverage.yml`; remove the ones the system does not use.

**Routing lives in one file, `traefik/dynamic.yml`**, read through Traefik's file provider. There
are no container labels and no docker socket: the docker provider breaks whenever the daemon's
minimum API version moves, and a mounted socket hands a dev container the host's Docker. A new
service gets its router and service entry there. The file mirrors the production nginx:

| Host and path | Goes to |
| --- | --- |
| `app.<app-name>.localhost` | frontend |
| `app.<app-name>.localhost/api/` | backend |
| `app.<app-name>.localhost/auth/realms/`, `/auth/resources/` | Keycloak (OIDC) |
| `keycloak.<app-name>.localhost` | Keycloak (admin console at `/auth/admin`) |
| `api.<app-name>.localhost` | backend — local Scalar/curl only, never in production |

Every published port is bound to `127.0.0.1`: the dashboard has no auth, Keycloak's admin is
`admin/admin`, and the database credentials are the well-known dev pair.

**Keycloak runs under `/auth` (`KC_HTTP_RELATIVE_PATH`) and takes its hostname from the forwarded
host**, so the issuer is `http://app.<app-name>.localhost/auth/realms/<Realm>` — on the app origin,
exactly as in production. The proxy's network aliases resolve the app host to Traefik inside the
compose network, so the backend fetches the same issuer the browser sees with no `extra_hosts`.

Keycloak keeps its data in the `kcdata` volume, so users and console changes survive restarts. The
realm file is therefore imported **only into an empty Keycloak**: after editing it, run
`stack.sh down -v` (which also resets Postgres). The test user's id is pinned in the realm file
(`00000000-0000-4000-8000-000000000001`), so its `sub` stays the same across re-imports and any
local data keyed on it survives.

`stack.sh` wraps it and is container-runtime agnostic — `docker compose`, `podman compose` or
`docker-compose`, whichever exists:

```bash
tools/localdev/stack.sh up            # build + start detached
tools/localdev/stack.sh down -v       # also drop volumes (fresh DB + Keycloak)
tools/localdev/stack.sh logs [svc]
```

**The Keycloak issuer URL must resolve identically inside containers and in the browser.** Serving
it on the app host and aliasing that host to Traefik is what guarantees it. Get this wrong and
tokens validate in one place and not the other — the failure looks like a broken login, not a DNS
problem.

### Test and coverage — `tools/`

| Script | Does |
| --- | --- |
| `test-all.sh` | every test across both apps, one command |
| `e2e.sh` | brings the stack up, installs browsers, runs Playwright, tears down |
| `coverage-report.sh` | combined coverage for both languages |
| `e2e-coverage.sh` | builds an instrumented stack and reports coverage from E2E traffic |

`coverage.runsettings` and `flush-coverage.cjs` support the instrumented run — the `.cjs` flushes
the frontend's coverage buffer so E2E coverage is not lost on container stop.

### Release — `nx.json` `release` block + `tools/nx-release/dotnet-version-actions.cjs`

Projects version **independently** (`projectsRelationship: "independent"`), each from its own
conventional commits, each with its own changelog, tagged `{projectName}@{version}`. There is no
workspace-level changelog.

**`dotnet-version-actions.cjs` is the least guessable file here.** Nx Release versions JS projects
natively from `package.json`; the backend has no `package.json` — its version lives in the MSBuild
`<Version>` property of `apps/backend/Directory.Build.props`. This shim teaches Nx Release to read
and write that property. It is wired through the backend project's
`release.version.versionActions` with `currentVersionResolver: "disk"`. Copy it as-is; it contains
no project-specific values.

### Proxy — `apps/proxy/`

One nginx container as the single public entrypoint: `/api/` to the backend (auth included — the
SSR server does not proxy it), Keycloak's `/auth/realms/` and `/auth/resources/` to Keycloak,
everything else to the SSR frontend, `/hc` served locally as a 200 for readiness probes. This is what
makes the SSR-BFF architecture coherent — the browser knows one host, and only that host is exposed.

`nginx.conf` ships only the generic routes — `/hc`, `/api/` to the backend, the two Keycloak paths,
`/` to the frontend. The Keycloak admin console (`/auth/admin/`) is deliberately not routed.
Every app has its own routing; per-endpoint overrides go above `/api/`, and a commented recipe in
the file shows the shape. Three things worth reading before editing:

- **Fully-qualified cross-namespace service names.** The proxy may not live in the app's namespace.
- **`proxy_buffering off` on large responses.** Anything over the 256k of `proxy_buffers` spools to
  disk on every request otherwise.
- **`proxy_request_buffering off` on large uploads**, with raised timeouts, so bodies stream
  through instead of spooling. Keep `client_max_body_size` equal to the backend's own limit so the
  edge never refuses first.

The image is plain official `nginx`; `nginx.conf` makes it listen on :8080. Swap the base only if your
platform mandates a non-root image (e.g. `nginxinc/nginx-unprivileged`), and keep the port.

### Deploy — `tools/deploy/build.sh` only

`build.sh` builds an image and pushes it, tagged `YYYYMMDD.<short-git-sha>`. That tag is the
deployable version and the rollback unit: immutable, and traceable to a commit. Registry settings
come from `ACR_REGISTRY` / `ACR_USER` / `ACR_PASS` / `IMAGE_NAMESPACE` in the environment — no file
fallback, so nothing reaches outside the repo. `local` and `validate` need none of them.

`validate` (proxy only) runs `nginx -t` in the built image. nginx resolves `proxy_pass` hosts at load
time and the in-cluster names do not resolve outside the cluster, so the script maps each upstream to
a dummy address with `--add-host`: it checks the config, not reachability. The proxy's `build`
target **is** `validate`, so the PR gate checks the config without credentials.

**No deploy script ships.** Each app's Nx `deploy` target fails with "deploy not configured" until
you replace it. The contract is one sentence:

> `push` prints a tag on stdout; `deploy` puts that tag where your target reads the image version,
> then triggers or awaits the rollout.

A GitOps flow pipes one into the other. A Helm flow passes it as a value. Both are yours to write —
the mechanism is environment-specific, and a generic one fails on first run for nearly everyone.

### CI — targets, not a pipeline

**No pipeline file ships**, for the same reason. Wire your CI to these targets:

```bash
pnpm install --frozen-lockfile
nx affected -t lint test build      # PR gate
nx run-many -t push                 # on merge to the release branch
```

Use `nx affected` on pull requests and `run-many` on the release branch. Nx's cache is what makes
the PR gate fast; make sure CI restores it.

## Environment-specific — the adopter must replace these

| Item | Where |
| --- | --- |
| Container registry + image namespace | `ACR_REGISTRY` / `IMAGE_NAMESPACE` in the environment |
| Kubernetes namespaces + Keycloak service | `apps/proxy/files/nginx.conf` |
| Keycloak realm, client and test user | `tools/localdev/keycloak/realm.json` |
| Keycloak issuer URL | `tools/localdev/docker-compose.yml` (+ coverage twin) |
| Local routes | `tools/localdev/traefik/dynamic.yml` |
| Deploy target | each app's `deploy` target |

## CRITICAL gotchas (each cost real debugging — bake them in)

- **`lint-staged --no-stash`.** The default can lose unstaged work when a hook fails mid-run.
- **The `dotnet` named input.** Omit it and every JS commit invalidates the backend cache; CI gets
  slower and nobody notices why.
- **Conventional commits are load-bearing.** Nx Release derives bumps from them. A repo that lets
  `wip:` through gets no release.
- **Keycloak issuer must resolve the same inside and outside containers.** Otherwise login fails in
  a way that looks like an app bug. Keep it on the app host under `/auth`; do not reintroduce a
  separate Keycloak host for OIDC.
- **The realm file is imported only into an empty Keycloak.** `kcdata` persists it, so edits to
  `realm.json` do nothing until `stack.sh down -v`.
- **A Keycloak volume on `data/h2` breaks Keycloak.** That path does not exist in the image, so the
  volume is created root-owned and Keycloak (uid 1000) cannot write it. Mount `data/`.
- **`nx run-many -t build` does not publish.** For the proxy, `build` is `validate` (`nginx -t`);
  for the other two, `build` is the compile. Publish with `-t push`.
- **A dirty worktree produces a lying tag.** `YYYYMMDD.<sha>` describes the commit, not your
  uncommitted changes.

## Verify before claiming done

1. `pnpm install` succeeds and `packageManager` is pinned.
2. `git commit -m "bad message"` is **rejected** by commitlint; a conventional message passes.
3. `tools/localdev/stack.sh up` reaches a healthy state for every service; `down -v` cleans up.
   `curl -s http://app.<app-name>.localhost/auth/realms/<Realm>/.well-known/openid-configuration`
   reports the issuer on the app host, and `/auth/admin/` on the app host does **not** reach
   Keycloak.
4. `nx run-many -t lint test build` passes, and a second run is served from cache.
5. Touch a `.cs` file — the frontend's cached targets stay cached. Touch a `.ts` file — the
   backend's do.
6. `nx release --dry-run` proposes a version for the backend read from `Directory.Build.props`.
7. `tools/deploy/build.sh <app> local` builds without credentials; `nx validate proxy` passes
   `nginx -t` outside the cluster.
8. `grep -rnE '<(app-name|AppName|namespace|environment|keycloak-host|Realm)>' .` returns nothing.

## Suggested build order

1. Copy `skeleton/`, substitute placeholders, `pnpm install`.
2. Husky + commitlint — prove a bad commit message is rejected before anything else lands.
3. Nx wiring: `targetDefaults`, `namedInputs`, per-app `project.json`.
4. Local stack: Postgres, Redis, Keycloak first; add apps as they exist.
5. Build the apps — `dotnet-webapi` and `fe-ssr-tanstack`.
6. Test and coverage scripts, once there are tests to run.
7. Proxy, once both apps serve.
8. Release config, then `build.sh` and the registry.
9. Write your `deploy` target and wire CI to the targets above.
