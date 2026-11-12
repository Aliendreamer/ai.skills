## Why

The first project built from the three monorepo prompts (`nx-monorepo`, `dotnet-webapi`, `fe-ssr-tanstack`) ended up
simpler than the prompts that built it: auth in fewer files, one exposed host, no cookie re-homing, and a local stack
that routes from one file. It also showed that the skeleton ships with broken references and leftovers from the
company repo it was taken from. The next project built from the prompts should start from where that one finished.

## What Changes

**`dotnet-webapi`: auth layout and general structure (the access model does not change)**

- Auth code grouped by job into one `Auth/` folder of six files: `OidcLogin` (state codec, PKCE, returnTo sanitizer,
  subject reader), `SessionRules` (session token + one usable/purgeable rule), `UserAccess` (claims, `ClaimsPrincipal`
  extensions, claims transformation, pre-processor), `KeycloakClient` (moved from `Data/Auth/`), `AuthCookieWriter`,
  `CookieBearerTokenResolver`. `Data/Auth/` and `WebApi/Authentication/` go away.
- No scoped `CurrentUser`/`ICurrentUser`: endpoints and services read the user from the request's
  `ClaimsPrincipal` through extension methods. Keycloak roles and JIT provisioning stay exactly as they are; the
  provisioned local user id becomes a claim instead of a field on a scoped service.
- **Logout is a POST.** `SameSite=Lax` withholds the cookie from a cross-site POST, so another site cannot sign the
  user out.
- `SessionStore`/`ISessionStore` renamed `SessionService`/`ISessionService`.
- Layout: `Options/` (with the namespace gotcha), `Enums/`, flat `Services/` with `Services/Interfaces/`, one
  `ServiceResult<T>`, shared `PagedRequest` + validator base and `PagedResponse<T>` in `WebApi/Dtos`.
- Serilog configured only from appsettings; `Serilog.Formatting.Compact` dropped.
- The design-time `DbContext` factory reads only `ConnectionStrings__Postgres` and throws without it.
- Session cookie names are config, so production can use `__Host-` names directly.

**`fe-ssr-tanstack`: the SSR server no longer proxies auth**

- The edge (nginx in production, Traefik locally) routes `app./api/*`, auth included, straight to the backend. The
  browser has one origin, and only the app host is exposed.
- Removed: the `routes/api/auth/$.ts` proxy route, `auth-proxy.ts`, cookie re-homing, `COOKIE_SECURE`, and the
  gotchas that existed only because of them.
- Server functions still forward only the auth cookies to the internal `API_URL`, with a deadline.
- Logout is a same-origin form POST. Login is a document redirect (`reloadDocument`) to `/api/auth/login`.
- Keycloak's public OIDC paths are served on the app origin under `/auth`, so the CSP needs no extra
  `form-action` origin and the backend needs no `extra_hosts`.

**`nx-monorepo`: skeleton fixes and simplifications**

- Ship what the compose files already mount: `tools/localdev/traefik/dynamic.yml` (the only routing definition) and a
  placeholder realm file `tools/localdev/keycloak/realm.json`.
- Traefik uses the file provider only: no docker socket, no container labels. Ports are bound to `127.0.0.1`.
- Keycloak is served under `/auth` (`KC_HTTP_RELATIVE_PATH`) on the app host for OIDC, and on `keycloak.` for the admin
  console only. Its data is kept in a `kcdata` volume, and the dev user's id is pinned in the realm file.
- Backend healthcheck with a `start_period`; a compose project `name:`.
- `nginx.conf` gains the `/auth/(realms|resources)` route. `build.sh validate` maps each upstream host to a dummy
  address so `nginx -t` passes outside the cluster, and `IMAGE_NAMESPACE` comes from the environment.
- Removed leftovers: the `update-deploy.sh` call in the proxy's `deploy` target (now an explicit "not configured"
  failure), the OneTv MSSQL OpenSSL override in `backend.dev.Dockerfile`, and the `--personal` flag in `test-all.sh`.
- `pnpm-workspace.yaml` gains `minimumReleaseAgeExclude` for the core framework packages.
- The root `.npmrc` the dev compose file mounts is shipped (`save-exact`, empty `save-prefix`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No spec constrains what a prompt's body says (same reasoning as the archived `monorepo-skeleton` change), so
this change sets `skip_specs: true`.

## Impact

- `prompts/dotnet-webapi/PROMPT.md` (0.2.0 → 0.3.0), `prompts/fe-ssr-tanstack/PROMPT.md` (0.2.0 → 0.3.0),
  `prompts/nx-monorepo/PROMPT.md` (0.1.0 → 0.2.0) and files under `prompts/nx-monorepo/skeleton/`.
- `catalog.json` regenerated (versions, and descriptions where the frontmatter changes).
- Projects already built from the older prompts are untouched. The FE and BE prompts change their logout contract
  together, so they must be taken from the same release.
