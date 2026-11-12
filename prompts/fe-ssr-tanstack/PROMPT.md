---
name: fe-ssr-tanstack
description:
  "Build a TanStack Start SSR frontend that acts as the BFF — fetches page data server-to-server from an internal API
  through server functions, while the edge routes auth straight to that API, so the browser only ever talks to the
  app origin (no API host or token in the client)."
type: prompt
tags: [frontend, tanstack, ssr, bff, typescript, auth]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.3.0
appPattern: fe-ssr-tanstack
author: Aliendreamer
---

# FE — TanStack Start SSR BFF frontend

A reusable build playbook for the **frontend half** of the SSR BFF stack: a TanStack Start (SSR) app that is itself the
BFF. The browser only ever talks to `app.<slug>.localhost`. Page data is fetched **server-to-server** via server
functions; `/api/*` (auth included) and Keycloak's OIDC paths are routed by the **edge** on the same host. No API host,
no token, no `VITE_API_URL` in the client bundle.

Pairs with a cookie-session .NET API — see `dotnet-webapi` 0.3.0 or later, built in its **behind an SSR BFF, one
origin** mode. Both apps drop into the `nx-monorepo` workspace skeleton, which supplies the Nx wiring, the local-dev
stack and the nginx proxy that fronts them in production. Follow this top to bottom.

## Architecture — the organizing rule

> **One host is exposed: `app.`. The edge (nginx in production, Traefik locally) routes it: `/api/*` to the .NET API,
> `/auth/realms/*` and `/auth/resources/*` to Keycloak, everything else to the SSR server. The API owns the session
> and the tokens; the SSR server renders pages with data it fetches server-to-server.**

```text
Browser ──► app.<slug>.localhost  (the ONLY browser origin, the ONLY exposed host)
                 │
           edge (nginx in prod / Traefik locally)
                 ├── /api/*  (auth included) ──────────────► .NET API ──► Keycloak (code exchange, refresh)
                 ├── /auth/realms/*, /auth/resources/* ────► Keycloak (login form, OIDC endpoints)
                 └── everything else ──► SSR server ──server fn──► .NET API  (internal API_URL, auth cookies forwarded)
```

- **Auth is not proxied by the SSR server.** The browser goes to `/api/auth/login|callback` and POSTs
  `/api/auth/logout` on the app origin; the edge sends them to the API, which sets its cookies **host-only on the app
  host** (no `Domain`). Nothing rewrites a cookie.
- **Data**: route loaders call **server functions** (`createServerFn`) that run on the SSR server, forward **only** the
  auth cookies, and fetch the internal `API_URL`. Pages render **with data** (SSR-with-data).
- **Gate**: an `_authenticated` pathless layout route's `beforeLoad` calls `getMe()` and redirects anonymous requests
  to `/api/auth/login`; `me` goes into router context for every child route. **No client `/me` probe, no
  `AuthProvider`.** The gate is UX; the API authorizes.

Because Keycloak is served on the app origin under `/auth`, the login form, the callback and the logout redirect
chain are all same-origin: the CSP needs no extra `form-action` origin, and the issuer the API validates is the URL
the browser sees.

## How Claude must work on this

- **Ask me for one thing first** (STEP 0), then build everything.
- **Use Serena** for ALL code search/reading/editing (`get_symbols_overview`, `find_symbol`, `read_file`, `list_dir`,
  symbol edits) — never raw grep/sed/cat for code.
- **Use OpenSpec** if the repo uses it: `/opsx:propose` → `/opsx:apply` → `openspec validate <name> --strict` → archive.
  Otherwise implement directly.
- Conventional commits, **lowercase subject** (commitlint `subject-case`). Don't push or open PRs unless asked.
- Verify with real builds/tests before claiming done.

## STEP 0 — ask, then stop and wait

Ask me for **exactly one value**: the **FE project name** → pnpm package `<fe-name>` (kebab-case). Derive a lowercase
`<slug>` for hosts (`app.<slug>.localhost`) and cookie names (`<slug>_sid`, `<slug>_pkce`). The only API config is
the **server-side** `API_URL` (e.g. `http://<be-service>:8080`); it is never exposed to the client.

## Outcome (what exists when done)

- Anonymous visit to `app.<slug>.localhost` → SSR guard redirects to `/api/auth/login?returnTo=…`.
- After Keycloak login → app renders **server-side, with data** ("Hello, …" + roles + live tiles), no client "Loading…".
- The browser only ever opens `app.`; the API host is never referenced in the client. Logout (a form POST) and
  revocation bounce back to login.

## Stack (pin exact versions; bump to current at build time)

TanStack Start (SSR) + TanStack Router (file-based) + TypeScript strict + Tailwind v4 + native `fetch` (no axios) +
(optional) react-i18next/TanStack Store. Vitest + RTL. pnpm, `save-exact`. Prod served by **srvx** (or Nitro
`node-server`). **Two SSR deltas vs a plain SPA baseline:** drop the browser API client (data comes from server
functions, so TanStack Query is optional), and **never add `VITE_API_URL`** — the only API config is the server-side
`API_URL`.

### `package.json` (baseline; drop Query if you don't use it client-side)

```jsonc
{
  "name": "<fe-name>",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "packageManager": "pnpm@11.5.2",
  "imports": { "#/*": "./src/*" },
  "scripts": {
    "dev": "vite dev --port 3000",
    "generate-routes": "tsr generate",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint",
    "format": "prettier --write . && eslint --fix",
    "check": "prettier --check .",
    "prepare": "husky",
  },
  "dependencies": {
    "@tailwindcss/vite": "4.3.0",
    "tailwindcss": "4.3.0",
    "@tanstack/react-start": "1.168.25",
    "@tanstack/react-router": "1.170.15",
    "@tanstack/react-router-ssr-query": "1.167.1",
    "@tanstack/router-plugin": "1.168.18",
    "@tanstack/react-store": "0.11.0",
    "@tanstack/store": "0.11.0",
    "i18next": "26.3.1",
    "i18next-browser-languagedetector": "8.2.1",
    "react-i18next": "17.0.8",
    "lucide-react": "1.17.0",
    "react": "19.2.7",
    "react-dom": "19.2.7",
  },
  "devDependencies": {
    "@commitlint/cli": "21.0.2",
    "@commitlint/config-conventional": "21.0.2",
    "@tailwindcss/typography": "0.5.20",
    "@tanstack/devtools-vite": "0.7.0",
    "@tanstack/eslint-config": "0.4.0",
    "@tanstack/nitro-v2-vite-plugin": "1.155.0",
    "@tanstack/router-cli": "1.167.17",
    "@testing-library/dom": "10.4.1",
    "@testing-library/react": "16.3.2",
    "@types/node": "25.9.2",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.2",
    "cspell": "10.0.1",
    "eslint": "10.4.1",
    "husky": "9.1.7",
    "jsdom": "29.1.1",
    "lint-staged": "17.0.7",
    "prettier": "3.8.4",
    "typescript": "6.0.3",
    "vite": "8.0.16",
    "vitest": "4.1.8",
  },
}
```

- `.npmrc`: `save-exact=true` + empty `save-prefix=`.
- `pnpm-workspace.yaml`: `minimumReleaseAge: 10080` (supply-chain cooldown),
  `onlyBuiltDependencies: [esbuild, lightningcss, unrs-resolver, '@parcel/watcher']`.
- `vite.config.ts` plugin order: `devtools()`, `tailwindcss()`, `tanstackStart()`,
  `nitroV2Plugin({ preset: 'node-server' })`, `viteReact()`; path alias `@/* → src/*`.
- Tooling: ESLint (`@tanstack/eslint-config`), Prettier, cspell, husky + lint-staged + commitlint.

## Components to build (`<fe-name>`)

```text
src/
  router.tsx                      ← createRouter({ context: { me: null }, … })
  routeTree.gen.ts (generated)    ← run `pnpm generate-routes` after route changes
  server.ts                       ← custom server entry: CSP header (form-action 'self')
  styles.css, env.d.ts
  routes/
    __root.tsx                    ← createRootRouteWithContext<RouterContext>()
    _authenticated.tsx            ← beforeLoad guard + identity chip + Outlet
    _authenticated/
      index.tsx                   ← dashboard loader (server fns) → presentational tiles
      <page>.tsx …                ← per-feature loaders
      forbidden.tsx
  lib/
    server/backend.ts             ← forwardCookieHeader / serverFetch (auth-cookie allow-list + deadline)
    server/api-loaders.ts         ← Me, hasRole, load*(fetchImpl)  (PURE, unit-tested)
    server/api.ts                 ← createServerFn getMe/get*… wrapping the loaders w/ serverFetch
    auth/login-redirect.ts        ← loginUrl(returnTo) / loginRedirect() — document redirect to /api/auth/login
    auth/session.ts               ← logout() — same-origin form POST to /api/auth/logout
    settle.ts                     ← settle(promise) → {data} | {error}; re-throws redirects
  components/…                    ← PRESENTATIONAL (data via props from loaders)
```

There is **no `routes/api/auth/*` route** in the frontend: `/api/*` never reaches the SSR server, because the edge
sends it to the API.

### `lib/server/backend.ts` — how a server function reaches the API (unit-tested)

- `forwardCookieHeader(cookieHeader)`: build the `Cookie` header sent inward from the browser's incoming `Cookie` —
  keep **only** the API's auth cookies (`<slug>_sid`, `<slug>_pkce`; in production the same names with `__Host-`, as
  the API sets them), drop everything else. `null` when nothing is left.
- `serverFetch()`: a `fetch` that sets that cookie header, resolves a rooted path (`/api/me`) against `API_URL`
  (throw a clear error when it is unset), and abandons the call after a deadline (e.g. 20 s via
  `AbortSignal.timeout`, combined with any caller signal) so a hung API ends in the page's own error state.

**Server-only module**: it reads `@tanstack/react-start/server` and `process.env.API_URL`, so reference it **only**
inside `createServerFn().handler()` bodies (stripped from the client bundle). Tests pass a mock fetch to the loaders.

### `lib/server/api-loaders.ts` — pure loaders (unit-tested with a mock fetch)

- `Me {id, subject, email?, roles[]}` + `hasRole(me, role)` + `ADMIN_ROLE`.
- `loadMe(fetchImpl)`: `GET /api/me` → `401` ⇒ **`null`** (the guard redirects); other non-2xx ⇒ throw.
- `load<Resource>(fetchImpl)`: `GET /api/<resource>` → `401` ⇒ **`loginRedirect()`**; other non-2xx ⇒ throw `Error`.

### `lib/server/api.ts` — server functions

```ts
import { createServerFn } from '@tanstack/react-start'
import { serverFetch } from './backend'
export const getMe       = createServerFn({ method: 'GET' }).handler(() => loadMe(serverFetch()))
export const get<Things> = createServerFn({ method: 'GET' }).handler(() => load<Things>(serverFetch()))
```

These run on the SSR server during SSR, and via RPC **to the same SSR server** on client navigation — so the
browser→app-only invariant holds even on in-app navigation.

### `lib/settle.ts`

`settle(promise)`: wrap into `{data}` / `{error:true}` so one source's outage degrades only its tile — but **re-throw
redirects** (`isRedirect(e)`) so a revoked session still bounces to login.

### Auth navigation — `lib/auth/`

- **`login-redirect.ts`**: `loginUrl(returnTo)` = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}` (the one
  login URL), and `loginRedirect(returnTo)` = `throw redirect({ href: loginUrl(returnTo), reloadDocument: true })`.
  **`reloadDocument` is required**: `/api/auth/login` is not a frontend route, and without it a client-side navigation
  matches it as one and renders "not found" instead of reaching the API.
- **`session.ts`**: `logout()` builds a `<form method="POST" action="/api/auth/logout">`, appends it and submits it.
  The API accepts **only POST** (`SameSite=Lax` withholds the cookie from a cross-site POST, so another site cannot
  sign the user out); a form submit makes the API's 302 to Keycloak's end-session a normal top-level navigation.

### Routing — guard + context + SSR-with-data

- **`router.tsx`**: `createRouter({ routeTree, context: { me: null }, … })`.
- **`__root.tsx`**: `export interface RouterContext { me: Me | null }` +
  `createRootRouteWithContext<RouterContext>()({ … })`. No `AuthProvider`.
- **`_authenticated.tsx`** (pathless layout):

  ```ts
  beforeLoad: async ({ location }) => {
    const me = await getMe();
    if (!me) loginRedirect(location.href);
    return { me };
  };
  ```

  Its component renders the identity chip + a Logout button (`logout()` from `lib/auth/session.ts`) and an `<Outlet/>`.
  Children read `me` via `Route.useRouteContext()`.

- **`_authenticated/index.tsx`** (and feature pages): a `loader` that
  `Promise.all([settle(getThis()), settle(getThat())])` and a component that reads `Route.useLoaderData()` and renders
  **presentational** components (data via props).
- **Components are presentational**: they take resolved data + an `error` flag as props and render a degraded state when
  `error || !data`. No `useEffect` fetching, no loading state (SSR provides the data).

### Env, build, prod

- **No `VITE_API_URL`.** The only API config is the **server-side** `API_URL` (`http://<be-service>:8080`), read by the
  server functions. Never expose it to the client bundle. `env.d.ts` declares no API URL. No cookie or Keycloak
  settings: the API owns both.
- **CSP** (custom `src/server.ts` entry): `form-action 'self'` is enough — the logout POST and its redirect chain to
  Keycloak stay on the app origin.
- **Prod serve**: the SSR server must actually **run** (it handles server-function RPC + SSR). With
  **srvx**: `srvx --prod -s ../client dist/server/server.js` (gotcha #2). With Nitro: `node .output/server/index.mjs`.
- **Dockerfile**: multi-stage; build with `pnpm --filter <fe-name> build`; runtime needs production deps present (the
  SSR entry imports framework code at runtime). Pass `API_URL` as **runtime** env, not a build arg. `.dockerignore`
  excludes `dist`/`.output`/`.nitro`/`.tanstack`/`node_modules`/`.git`/`.env*`.

## Harness — run it against a real API and Keycloak

**In an `nx-monorepo` workspace, use its `tools/localdev/` stack** — it already wires Postgres, Redis, Keycloak and
every app together, with the routing below in `traefik/dynamic.yml`. Standalone, reproduce the same shape with
compose; **only the edge publishes a port** (bind it to `127.0.0.1`):

- `proxy` (Traefik v3, **file provider only**: no docker socket, no labels) with routes:
  `Host(app.<slug>.localhost) && PathPrefix(/api/)` → `<be-service>:8080`;
  `Host(app.<slug>.localhost) && (PathPrefix(/auth/realms/) || PathPrefix(/auth/resources/))` → `keycloak:8080`;
  `Host(app.<slug>.localhost)` → `<fe>:3000`; `Host(keycloak.<slug>.localhost)` → `keycloak:8080` (admin console
  only). Give the proxy the network alias `app.<slug>.localhost` so containers resolve the app host to it.
- `postgres`: healthcheck.
- `keycloak` (26): `start-dev --import-realm`; `KC_HTTP_RELATIVE_PATH=/auth`, `KC_HOSTNAME_STRICT=false`,
  `KC_HTTP_ENABLED=true`, `KC_PROXY_HEADERS=xforwarded` (hostname from the forwarded host — no `KC_HOSTNAME`);
  mount the realm directory; keep `data/` in a volume.
- `<be-service>` (build the BE — see `dotnet-webapi`): Authority
  `http://app.<slug>.localhost/auth/realms/<Realm>`, ClientId `<slug>_api`, secret,
  **`CallbackUri=http://app.<slug>.localhost/api/auth/callback`**, AppBaseUrl/PostLogout
  `http://app.<slug>.localhost`, cookie names `<slug>_sid`/`<slug>_pkce` (no cookie `Domain`), Postgres conn.
  **No `extra_hosts`** — the alias above makes the issuer resolve inside the container.
- `<fe>` (build this app): env **`API_URL=http://<be-service>:8080`** (server-side). `depends_on: <be-service>`.

Realm import JSON (any file name in the import directory): realm `<Realm>`; roles `Admin`,`User`; **confidential**
client `<slug>_api` (`publicClient:false`, secret, **`redirectUris:[http://app.<slug>.localhost/api/auth/callback]`**,
`webOrigins:[http://app.<slug>.localhost]`, `attributes.post.logout.redirect.uris` `##`-separated =
`http://app.<slug>.localhost`, `pkce.code.challenge.method:S256`); test user `testuser`/`Test123!` with a pinned `id`
and realm roles `Admin`,`User`.

## CRITICAL gotchas (each cost real debugging — bake them in)

1. **`/api/*` must never reach the SSR server.** The edge routes it to the API, in production **and** locally. A route
   that sends `/api/auth/login` to the frontend renders its "not found" page; do not "fix" it by adding a proxy route.
2. **srvx `--static` is resolved relative to the server-entry directory**, not the cwd. Use `-s ../client` (sibling of
   `dist/server`); `-s dist/client` silently disables static serving and every `/assets/*` 404s → the SSR shell loads
   but is unstyled.
3. **The SSR server must RUN in prod** — it is the BFF, not a static host. A static-only serve breaks every server
   function. Run the server entry (srvx/Nitro).
4. **Login redirects need `reloadDocument: true`.** Without it, a redirect raised during client-side navigation is
   matched as a frontend route and never reaches the API.
5. **Logout is a form POST.** A link or `location.assign` sends a GET, which the API rejects (405) on purpose.
6. **Server functions forward only the auth cookies.** Forward the whole `Cookie` header and every app cookie leaks to
   the API; forward none and the session never reaches it.
7. **Callback still redirects to the ABSOLUTE app URL** `{AppBaseUrl}{returnTo}`. Keep `returnTo` sanitized
   (relative, single leading `/`) — no open redirect. The API re-sanitizes it; the frontend only builds it.
8. **Keycloak issuer must match from BOTH the browser and the BE container** or `iss` validation 401s. Serve Keycloak
   under `/auth` on the app host and alias the app host to the edge inside the network; do not reintroduce a separate
   Keycloak host for OIDC or `extra_hosts`.
9. **Realm import**: post-logout redirects go in the client `attributes` as `post.logout.redirect.uris`
   (`##`-separated); a top-level `postLogoutRedirectUris` aborts the Keycloak 26 import → discovery 404 → login 500.
   Import only happens into an **empty** Keycloak (`--import-realm` skips existing realms, and the data volume keeps
   them) — `down -v` after changing the realm JSON.
10. **Route guards do NOT protect server functions.** A `beforeLoad` gate is UX; the real boundary is the API's
    `[Authorize]`. Server functions must forward the cookie and let the API decide.
11. **`*.localhost` resolution**: browsers auto-resolve to loopback (RFC 6761) — no `/etc/hosts`. `curl` needs
    `-H "Host: app.<slug>.localhost" http://127.0.0.1/`.

## Verify before claiming done

- `pnpm generate-routes`, `typecheck`+`lint`+`test`+`build` clean. **Unit-test the pure pieces**: `backend.ts`
  (`forwardCookieHeader` keeps only the auth cookies, empty/none → `null`; deadline aborts), `api-loaders.ts`
  (`loadMe` 401→null; data loaders 401→redirect, 5xx→throw), `settle` (data/error/redirect-passthrough),
  `login-redirect` (URL encoding, `reloadDocument`).
- Against the running stack: anonymous `app./` → **302/307** to `/api/auth/login`; `app./api/auth/login` → **302** to
  `app./auth/realms/<Realm>/…` with a host-only PKCE cookie (no `Domain`); `GET app./api/auth/logout` → **405**.
- **End-to-end (Playwright)** — the browser only ever opens `app.`:
  1. Anonymous `app./` → Keycloak login form (on `app./auth/…`).
  2. Log in → identity chip + nav render.
  3. **SSR-with-data**: the raw server HTML (no JS) already contains the identity **and** live tile data, with **no
     "Loading…"**.
  4. **Logout** (form POST) → back to login; the old cookie → `401` from `/api/me`.
  5. **Revocation**: present a revoked cookie to the SSR guard (`maxRedirects: 0`) → **302/307** to `/api/auth/login`.
- Log in once per E2E run (a setup project that saves the session) and run the logout spec last: the API rate-limits
  login and callback, and a login per spec trips it on repeated runs.

## Suggested build order

1. (If OpenSpec) propose the spec. 2. FE data layer: `backend.ts` (+tests) → `api-loaders.ts` (+tests) → `api.ts`
   server functions → `settle`. 3. FE routing: `createRootRouteWithContext` + router `context` → `login-redirect` +
   `_authenticated` guard → `logout()` form POST → pages under `_authenticated/` as **loaders** feeding presentational
   components; no browser API client, no `AuthProvider`, no `VITE_API_URL`, no auth route. 4. Point `API_URL` at the
   backend, put the edge in front, and verify SSR-with-data, logout and revocation.
