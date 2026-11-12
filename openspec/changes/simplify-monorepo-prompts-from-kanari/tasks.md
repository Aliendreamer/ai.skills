## 1. `nx-monorepo` skeleton

- [x] 1.1 Add `tools/localdev/traefik/dynamic.yml` (routers `app`, `app-api`, `keycloak-app`, `keycloak`, `api`, plus
      `redisinsight`) with placeholders
- [x] 1.2 Add `tools/localdev/keycloak/realm.json` (no placeholder in the file name: `<>` is invalid on Windows):
      confidential `<app-name>_api` client, redirect and post-logout URIs on the app host, PKCE S256, test user with
      a pinned placeholder id
- [x] 1.3 `docker-compose.yml`: file-provider-only Traefik, no socket, no labels, loopback ports, compose `name:`,
      Keycloak `KC_HTTP_RELATIVE_PATH=/auth` + `kcdata` volume, issuer on the app host, no `extra_hosts`, no
      `SessionCookies__Domain`, no `KEYCLOAK_ORIGIN`, backend healthcheck, current image tags
- [x] 1.4 Mirror 1.3 in `docker-compose.coverage.yml`
- [x] 1.5 `stack.sh` URLs; `apps/proxy/files/nginx.conf` `/auth/(realms|resources)` route
- [x] 1.6 `tools/deploy/build.sh`: `IMAGE_NAMESPACE` env, proxy-only `validate` with `--add-host` per upstream;
      `apps/proxy/project.json`: `validate` as `build`, `deploy` fails with "not configured"
- [x] 1.7 Remove leftovers: OneTv OpenSSL block in `backend.dev.Dockerfile`, `--personal` in `test-all.sh`, the
      registry reference in `postgres.dev.Dockerfile`
- [x] 1.8 `pnpm-workspace.yaml`: `minimumReleaseAgeExclude`
- [x] 1.9 `PROMPT.md`: update the local-development, proxy, deploy, environment-specific and gotchas sections; bump to
      0.2.0

## 2. `dotnet-webapi`

- [x] 2.1 Replace the auth sections with the six-file `Auth/` layout (D1), keeping Keycloak roles and JIT provisioning
- [x] 2.2 Logout as `POST`, returning the id-token hint from `RevokeAsync`; `SessionService`/`SessionRules`
- [x] 2.3 Layout: `Options/` + namespace gotcha, `Enums/`, `Services/Interfaces/`, `ServiceResult<T>`, `PagedRequest`
- [x] 2.4 Serilog from appsettings only (drop `Serilog.Formatting.Compact`); design-time factory rule
- [x] 2.5 Exposure table and config: issuer on the app host under `/auth`, no cookie `Domain`, `__Host-` names in
      production; update verify list and build order; bump to 0.3.0

## 3. `fe-ssr-tanstack`

- [x] 3.1 Architecture: edge routes `/api/*` and `/auth/{realms,resources}`; remove the auth proxy, re-homing and
      `COOKIE_SECURE`
- [x] 3.2 Components: `lib/server/backend.ts` (cookie allow-list + deadline), `login-redirect` with
      `reloadDocument`, form-POST `logout()`
- [x] 3.3 Harness section and gotchas aligned with the skeleton stack; renumber gotchas
- [x] 3.4 Verify list and build order; description frontmatter; bump to 0.3.0

## 4. Verify

- [x] 4.1 Cross-check the three prompts: cookie names, logout method, issuer URL, routes and env vars agree
- [x] 4.2 Placeholder grep over `skeleton/` finds only the documented placeholders; no reference-project or company
      names (`kanari`, `OneTv`, `PCC`) anywhere under `prompts/`
- [x] 4.3 Every path the compose files and Nx targets reference exists in `skeleton/`
- [x] 4.4 Regenerate `catalog.json`, run catalog validation and markdown lint, `openspec validate
      simplify-monorepo-prompts-from-kanari --strict`
