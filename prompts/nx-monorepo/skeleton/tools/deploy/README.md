# Deploy: build and push app images

`build.sh` builds one app's container image and pushes it to a registry. It is the only deploy
step this skeleton ships — **it stops at the push**. Choosing which pushed image runs, and rolling
back, is your deployment mechanism's job and is deliberately not modelled here.

## Usage

```bash
tools/deploy/build.sh <proxy|frontend|backend> [push|local|validate]
```

Or through Nx (each app has a `push` target that calls the script):

```bash
nx push proxy       # = tools/deploy/build.sh proxy   (build + push)
nx push frontend
nx push backend

nx run-many -t push                      # build + push ALL three images
nx run-many -t push -p proxy frontend    # or a subset

nx validate proxy   # build locally, then `nginx -t` (build.sh proxy validate)
```

Or as pnpm scripts (no global Nx needed — they wrap the Nx `push` targets above):

```bash
pnpm push            # build + push ALL three images
pnpm push:backend    # one app (also push:frontend, push:proxy)
```

`build` never publishes. The proxy has no compile step, so its `build` target is `validate`: build
the image locally and run `nginx -t`, with no credentials needed, so it is safe in the PR gate. For
`frontend` and `backend`, `build` is the app compile (Vite / `dotnet build`). Publish with the `push`
target: `nx run-many -t push`, not `-t build`.

### Modes

| Mode             | What it does                                            | Needs credentials |
| ---------------- | ------------------------------------------------------- | ----------------- |
| `push` (default) | build the image, log in, push, print the tag            | yes               |
| `local`          | build the image locally only (`<image>:local`), no push | no                |
| `validate`       | build locally, then `nginx -t` inside it (proxy only)¹  | no                |

¹ The in-cluster upstream names (`*.svc.cluster.local`) do not resolve outside the cluster, and nginx
resolves them at load time, so `validate` maps each `proxy_pass` host to a dummy address with
`--add-host`. It checks the config, not upstream reachability.

## What the script does (push mode)

1. Resolves the per-app **image name**, **build context**, and **Dockerfile** from a `case` on the
   app argument:
   - `proxy` → `$IMAGE_NAMESPACE/<app-name>-proxy`, context `apps/proxy`, `apps/proxy/Dockerfile`
   - `frontend` → `$IMAGE_NAMESPACE/<app-name>-frontend`, context repo root,
     `apps/frontend/Dockerfile` (the SSR/BFF build needs the pnpm workspace root)
   - `backend` → `$IMAGE_NAMESPACE/<app-name>-backend`, context `apps/backend`,
     `apps/backend/Dockerfile`
2. Computes the tag `TAG=$(date +%Y%m%d).$(git rev-parse --short HEAD)` — e.g. `20260720.f0a04ce`.
   **This tag is the deployable version and the rollback unit.**
3. Reads registry settings from the environment: `ACR_REGISTRY`, `ACR_USER`, `ACR_PASS` and
   `IMAGE_NAMESPACE`. Missing values
   fail fast, before any build. There is no config-file fallback — supply them from your own
   credential store so nothing here reaches for a path outside the repo.
4. Builds `$ACR_REGISTRY/<image>:$TAG`, logs in (`--password-stdin`), and pushes. `ACR_REGISTRY` is
   the **bare** registry host; the `$IMAGE_NAMESPACE/` path is part of `<image>`, so the full ref
   is e.g. `registry.example.com/team/<app-name>-backend:$TAG`. Local and validate builds work
   without it (images are then plain `<app-name>-<app>:local`).
5. Prints the tag as the final stdout line (everything else goes to stderr), so it can be captured:
   `TAG=$(tools/deploy/build.sh proxy)`.

`build.sh` never edits a deployment manifest or triggers a sync.

## The `deploy` step is yours to write

Each app has a `deploy` target that **fails on purpose** with "deploy not configured" until you
replace it. The skeleton ships no deploy
script, because the mechanism — GitOps repo, Helm release, `kubectl` apply, a platform API — is
environment-specific, and a generic one would fail on first run for nearly everyone.

The contract to implement is small:

> `push` prints a tag on stdout. `deploy` takes that tag and puts it wherever your target reads
> the image version from, then triggers or awaits a rollout.

A GitOps flow, for example, pipes one into the other and patches a value file in a deploy repo:

```bash
tools/deploy/build.sh backend push | your-deploy-script backend
```

Whatever you write, keep two properties the tagging scheme gives you: the tag is **immutable** and
**traceable to a commit**, so rolling back is re-pointing at a previous tag rather than rebuilding.

## Prerequisites

- A container runtime (`docker` or `podman`) on PATH.
- `ACR_REGISTRY`, `ACR_USER`, `ACR_PASS`, `IMAGE_NAMESPACE` exported for `push` mode.
- A clean git worktree is not required, but the tag carries the **current** short SHA — pushing
  from a dirty tree produces a tag that does not describe what was built.
