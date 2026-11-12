---
name: dotnet-webapi
description:
  "Build a production-shaped .NET backend in our house style — FastEndpoints + EF Core (Postgres), Keycloak JwtBearer
  with an opaque-cookie session store (server-side revocation), Serilog, FusionCache, xUnit/Moq with a coverage gate."
type: prompt
tags: [dotnet, fastendpoints, efcore, keycloak, backend, auth]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.3.0
appPattern: dotnet-backend
author: Aliendreamer
---

# .NET Backend — house build template (FastEndpoints + cookie session)

A reusable build playbook for the **.NET API** we build: FastEndpoints + EF Core (Npgsql), Keycloak as the IdP, and a
**server-owned opaque-cookie session** (tokens never leave the server; logout revokes the session). This is the BE half
of the BFF stack, buildable on its own. Follow it top to bottom.

## How Claude must work on this

- **Ask me for one thing first** (STEP 0), then build everything.
- **Use Serena** for ALL code search/reading/editing (`get_symbols_overview`, `find_symbol`, `read_file`, `list_dir`,
  symbol edits) — never raw grep/sed/cat for code.
- **Use OpenSpec** if the repo uses it: `/opsx:propose` → `/opsx:apply` → `openspec validate <name> --strict` → archive.
  Otherwise implement directly.
- Conventional commits, **lowercase subject** (commitlint `subject-case`). Don't push or open PRs unless asked.
- Verify with real builds/tests before claiming done.

## STEP 0 — ask, then stop and wait

Ask me for **exactly one value**: the **BE project name** → use as the .NET project + root namespace `<BeName>`
(PascalCase). Derive a lowercase `<slug>` for cookie domain / hosts (`<slug>.localhost`). Then build.

## Outcome (what exists when done)

- `GET api/me` returns `{id, subject, email, roles[]}` from the cookie session; `401` when anon.
- Login → Keycloak (PKCE) → callback creates a server session, sets an **opaque** `<slug>_sid` HttpOnly cookie; the
  access/refresh/id tokens are stored **server-side only**.
- Logout is a **POST** that **revokes the session server-side** → reusing the old cookie → `401`.
- Token refresh is transparent (cookie resolver refreshes when the access token expires).

## Stack (pin exact versions; bump to current at build time)

.NET (latest LTS) + FastEndpoints + EF Core (Npgsql) + Serilog + `Microsoft.AspNetCore.Authentication.JwtBearer` +
FusionCache. xUnit + Moq + EF InMemory; treat-warnings-as-errors; ~90% coverage gate. All routes under `api/`. Runs
against PostgreSQL and a Keycloak realm.

## Exact dependencies & key config

### `<BeName>.csproj` (`Microsoft.NET.Sdk.Web`, `net10.0`)

PropertyGroups: `Nullable=enable`, `ImplicitUsings=enable`, `RootNamespace=<BeName>`, `EnableNETAnalyzers=true`,
`AnalysisLevel=latest-recommended`, `AnalysisMode=All`, `TreatWarningsAsErrors=true`,
`NoWarn=CA1812,CA1848,CA1707,CA1861`, `<Compile Remove="<BeName>.Tests/**/*.cs" />`. PackageReferences:

```xml
<PackageReference Include="FastEndpoints" Version="8.1.0" />
<PackageReference Include="FastEndpoints.Swagger" Version="8.1.0" />
<PackageReference Include="FastEndpoints.HealthChecks" Version="8.1.0" />
<PackageReference Include="Scalar.AspNetCore" Version="2.14.14" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.8" />
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.2" />
<PackageReference Include="Microsoft.EntityFrameworkCore" Version="10.0.8" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Relational" Version="10.0.8" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.8" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="10.0.8" />
<PackageReference Include="ZiggyCreatures.FusionCache" Version="2.6.0" />
<PackageReference Include="Serilog.AspNetCore" Version="10.0.0" />
<PackageReference Include="Serilog.Settings.Configuration" Version="10.0.0" />
<PackageReference Include="Serilog.Expressions" Version="5.0.0" />
<PackageReference Include="Serilog.Sinks.Console" Version="6.1.1" />
<PackageReference Include="Serilog.Sinks.File" Version="7.0.0" />
<PackageReference Include="NetEscapades.AspNetCore.SecurityHeaders" Version="1.3.1" />
<PackageReference Include="AspNetCore.HealthChecks.NpgSql" Version="9.0.0" />
<PackageReference Include="Bogus" Version="35.6.5" />
```

Note: don't reference `Microsoft.Extensions.*.Abstractions` (in the .NET 10 shared framework → `NU1510`).
`FluentValidation` ships with FastEndpoints.

### `<BeName>.Tests.csproj` (`Microsoft.NET.Sdk`, `net10.0`, `IsPackable=false`)

```xml
<PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.6.0" />
<PackageReference Include="xunit" Version="2.9.3" />
<PackageReference Include="xunit.runner.visualstudio" Version="3.1.5" /> <!-- PrivateAssets=all -->
<PackageReference Include="Moq" Version="4.20.72" />
<PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="10.0.8" />
<PackageReference Include="FluentValidation" Version="12.1.1" />
<PackageReference Include="coverlet.collector" Version="10.0.1" /> <!-- PrivateAssets=all -->
<PackageReference Include="Microsoft.AspNetCore.Http.Features" Version="5.0.17" />
<!-- ProjectReference: ../<BeName>.csproj -->
```

Solution: `<BeName>.slnx`. Build: `dotnet build <BeName>.csproj`. Migrations: `./build_migration.sh "Name"` (needs the
`dotnet-ef` 10.x global tool). Tests + coverage: `./build_test.sh` (~90% line gate via `coverage.runsettings`). Style:
`.editorconfig` is the single source of truth (4-space, Allman braces, file-scoped namespaces, explicit types,
PascalCase/\_camelCase, global usings in `globals.cs`).

## Components to build (`<BeName>`)

Startup (`Program.cs`):

```text
ConfigureBuilder → AddSharedConfiguration → AddDatabaseContext → AddCommonServices → AddEndpoints → build → UseRequestPipeline → MigrateAndSeedDbAsync → run
```

### Layout — group by job, keep it flat

```text
Auth/                          ← ALL auth code, six files, one namespace (<BeName>.Auth)
  AuthCookieWriter.cs          ← session + PKCE cookie attributes in one place
  CookieBearerTokenResolver.cs ← cookie → access token (refreshes when expired)
  KeycloakClient.cs            ← IKeycloakOidcClient, KeycloakOidcClient, OidcDiscoveryDocument, OidcTokenResponse
  OidcLogin.cs                 ← OidcState + OidcStateCodec, Pkce/PkceChallenge, ReturnToSanitizer, JwtSubjectReader
  SessionRules.cs              ← SessionToken, SessionLifetime (Usable / Purgeable)
  UserAccess.cs                ← AppClaims, ClaimsPrincipalExtensions, UserClaimsTransformation
Data/                          ← ProjectDbContext(+Factory), AuditInterceptor, Models/, ModelConfigurations/, Migrations/, Seeding/
Enums/                         ← every enum
Extensions/                    ← BuilderExtension, ApplicationExtensions, FastEndpointSetup
Options/                       ← KeycloakOptions, SessionCookieOptions, SessionStoreOptions
Services/                      ← BaseService, ServiceResult, SessionService, SessionCleanupService, UserProvisioningService
Services/Interfaces/           ← IService, ISessionService, IUserProvisioningService
Utils/                         ← Constants, CacheKeys
WebApi/Auth/                   ← LoginEndpoint, CallbackEndpoint, LogoutEndpoint, MeEndpoint/
WebApi/Dtos/                   ← PagedRequest (+ PagedRequestValidator<T>), ListQuery, PagedResponse<T>
WebApi/Groups/                 ← AuthGroup
globals.cs
```

- **A small helper used by one caller lives in that caller's file**, not its own. A file per type made the
  sign-in code a dozen files of a few dozen lines each.
- **`Options/` classes use the namespace `<BeName>Options`, never one ending in `.Options`**: a namespace segment
  named `Options` hides `Microsoft.Extensions.Options.Options` everywhere under it, and `Options.Create(...)` stops
  compiling.
- **One `ServiceResult<T>`** (`Status`, `Value?`, `Error?`) with `ServiceResultStatus { Ok, NotFound, Invalid,
  Conflict }` and factory methods `ServiceResult.Ok/NotFound/Invalid/Conflict`. Endpoints map it to 200/204, 404, 400
  and 409. Records a service owns (its query and update shapes) live in the service's file.
- **List endpoints share paging**: requests derive from `PagedRequest` (`Offset` ≥ 0, `Limit` 1–100, default 25) and
  their validators from `PagedRequestValidator<T>`; responses are `PagedResponse<T>`.

### Composition root — `Extensions/`

- **BuilderExtension** `AddCommonServices`:
  - `AddAuthentication(JwtBearer).AddJwtBearer(...)` — `Authority`/`Audience` from `Keycloak` config,
    `RequireHttpsMetadata = !Development`, `NameClaimType=sub`, `RoleClaimType=ClaimTypes.Role`, **`ValidateAudience`
    only when an audience is set**.
  - **`options.Events = new JwtBearerEvents { OnMessageReceived = CookieBearerTokenResolver.OnMessageReceivedAsync }`**.
  - `IClaimsTransformation` = `UserClaimsTransformation` (scoped). `AddHttpContextAccessor()`.
  - `AddFusionCache()` (sub→User.Id, L1; Redis L2 later).
  - CORS policy: `WithOrigins(<exact FE origin>).AllowAnyHeader().AllowAnyMethod().AllowCredentials()` (NEVER `*` with
    credentials).
  - Bind options: `Configure<KeycloakOptions>`, `Configure<SessionCookieOptions>`, `Configure<SessionStoreOptions>`.
  - Typed `HttpClient` for `IKeycloakOidcClient` (15 s timeout); `AuthCookieWriter` singleton; register
    `SessionCleanupService` (hosted).
  - Rate limiter with a fixed-window policy (20/min per client IP) applied to login and callback.
  - Convention auto-register `XxxService : BaseService, IXxxService`.
  - **Serilog only from configuration**: `AddSerilog((services, cfg) => cfg.ReadFrom.Configuration(...)
    .ReadFrom.Services(services))`. Levels, sinks and enrichers live in the `Serilog` section of appsettings; no
    sink or formatter is hard-coded.
- **ApplicationExtensions** `UseRequestPipeline`: forwarded headers, security headers, exception handler, Serilog
  request logging, rate limiter, `UseCors`, `UseAuthentication`/`UseAuthorization`, FastEndpoints (RoutePrefix `api`,
  global `RequireCors`), Swagger/Scalar, `MapHealthChecks("/api/health").AllowAnonymous()`. `MigrateAndSeedDbAsync`
  applies EF migrations on startup.
- **FastEndpointSetup**: `AddFastEndpoints()` + health checks + Swagger.

### Auth flow — `WebApi/Auth/` (group `Groups/AuthGroup.cs`, sub-prefix `auth/`)

All `AllowAnonymous()` except `/me`. Endpoints are thin (`[ExcludeFromCodeCoverage]`) over the tested helpers in
`Auth/`.

- **LoginEndpoint** `GET api/auth/login?returnTo=` (rate-limited): `ReturnToSanitizer.Sanitize` → `Pkce.Create()`
  (verifier+challenge S256 + nonce) → set short-lived HttpOnly **PKCE cookie** `"<nonce>.<verifier>"` →
  `OidcStateCodec.Encode({nonce, returnTo})` → `IKeycloakOidcClient.BuildAuthorizeUrlAsync` → 302.
- **CallbackEndpoint** `GET api/auth/callback?code&state` (rate-limited): read+clear PKCE cookie;
  `OidcStateCodec.TryDecode`; verify `state.Nonce == cookieNonce`; `ExchangeCodeAsync(code, verifier)` (a 400/401
  from Keycloak — an expired or replayed code — redirects to the app root instead of a 500); extract `sub` via
  `JwtSubjectReader`; compute expiries; revoke any session this browser already held;
  **`ISessionService.CreateAsync` (stores access, refresh and id token) → rawToken**; `SetSession`; **302 to the
  ABSOLUTE `{KeycloakOptions.AppBaseUrl}{returnTo}`** (re-sanitized: the state is unsigned). Any failed check
  redirects to the app root with no session.
- **LogoutEndpoint** **`POST api/auth/logout`**: read the session cookie → **`ISessionService.RevokeAsync` returns the
  session's id token** → `ClearSession` → 302 `BuildEndSessionUrlAsync(idTokenHint)` → app post-logout URL. **POST,
  not GET**: `SameSite=Lax` withholds the cookie from a cross-site POST, so another site cannot sign the user out.
- `Auth/OidcLogin.cs` holds the login/callback helpers: `Pkce`, `OidcState`+`OidcStateCodec`, `ReturnToSanitizer`
  (relative path starting with a single `/`; reject `//`, `/\`, `://` and control characters), `JwtSubjectReader`
  (pure `sub` from the JWT payload). `Auth/SessionRules.cs` holds `SessionToken` (256-bit base64url + SHA-256 hash —
  store the hash only) and `SessionLifetime`.

### Token resolution — `Auth/CookieBearerTokenResolver.cs`

`ResolveTokenAsync(request, response, cookies, sessions, oidc, ct)` (testable core):

1. `Authorization` header present → return null (header bearer path preserved).
2. read the session cookie → `sessions.GetValidAsync` → none → null.
3. access token unexpired (small leeway) → return it.
4. expired + refresh usable → `oidc.RefreshAsync` → `sessions.UpdateTokensAsync` → return new token.
5. else → null (→ 401).

### Session rules — `Auth/SessionRules.cs`

`SessionLifetime` is the **one** place that decides whether a session is usable: not revoked, and either its access
token is live or its refresh token can still be exchanged (a null refresh expiry means it never expires — Keycloak
reports `refresh_expires_in: 0` for those). `Usable(now)` is an expression EF translates; `Purgeable(now)` is built
as its exact negation (`Expression.Not` of the same body), so "can be deleted" can never drift from "can be used".
`SessionService` and `SessionCleanupService` both use it.

### User access — `Auth/UserAccess.cs`

- `AppClaims.UserId` (e.g. `"app:user_id"`): the local user id claim.
- **`ClaimsPrincipalExtensions`**: `Subject()`, `Email()`, `DisplayName()`, `UserId()`, `Roles()` — each reads the
  short JWT claim name and falls back to the long `ClaimTypes` name. **There is no `ICurrentUser`/`CurrentUser`**:
  endpoints read `User` and pass the `ClaimsPrincipal` to services, so the request principal is the single source of
  who is calling.
- **`UserClaimsTransformation : IClaimsTransformation`** (scoped, idempotent — authentication can run it more than
  once per request): flatten `realm_access.roles` into `ClaimTypes.Role` claims, then **JIT-provision** the local
  `User` by `sub` through `IUserProvisioningService` behind FusionCache (`CacheKeys.User(sub)` → `User.Id`) and add
  `AppClaims.UserId`. No global pre-processor: every authenticated principal has a user row.

### Identity — `WebApi/Auth/MeEndpoint/`

`MeEndpoint` `GET api/me` `[Authorize]` → `MeResponseFactory.Create(User)` builds `MeResponse {id, subject, email,
roles[]}` from the principal's claims; `Cache-Control: no-store`; 401 when anon.

### Data — `Data/`

- `ProjectDbContext` (`Users`, `UserSessions` DbSets; `UseIdentityAlwaysColumns`; `ApplyConfigurationsFromAssembly`).
- **`ProjectDbContextFactory` (design-time) reads only `ConnectionStrings__Postgres` and throws without it** — it
  never builds the host or reads appsettings. `build_migration.sh` exports the local stack's connection string unless
  one is already set; generating a migration never connects.
- `Models/AuditableEntity` (CreatedAt/UpdatedAt/Version via `AuditInterceptor`), `Models/User` (`int Id`, unique
  `Sub`, `Email?`, `FullName?`), `Models/UserSession` (`long Id`, unique `TokenHash`, indexed `Subject`,
  `AccessToken`, `RefreshToken?`, `IdToken?`, `AccessTokenExpiresAt`, `RefreshTokenExpiresAt?`, `RevokedAt?`).
- `ModelConfigurations/UserConfiguration`, `UserSessionConfiguration` (token cols `text`).
- `Migrations/` — `AddUsers` + `AddUserSessions` (generate via `./build_migration.sh "Name"`). `Seeding/` (placeholder).

### Services — `Services/` (interfaces in `Services/Interfaces/`)

`BaseService` (Context/Logger/paging) + `IService`; `ServiceResult<T>`; `UserProvisioningService` (race-safe upsert by
`sub`); **`SessionService : BaseService, ISessionService`**
(`CreateAsync/GetValidAsync/UpdateTokensAsync/RevokeAsync/RevokeAllForSubjectAsync/PurgeExpiredAsync`, hash via
`SessionToken`, validity via `SessionLifetime`; `RevokeAsync` returns the id token for the end-session hint);
`SessionCleanupService` (`BackgroundService`, periodic `PurgeExpiredAsync`, scoped DbContext, interval from config).

### Cookies & config

- Cookies (session + PKCE): `HttpOnly`, `SameSite=Lax`, `Path=/`, **no `Domain`** (host-only on the one host the
  browser talks to), `Secure` only outside Development, all set and cleared through `AuthCookieWriter` (a delete with
  different attributes silently deletes nothing). The session cookie has no `Expires`: the server-side session
  decides validity.
- **Names are config** (`SessionCookies:SessionName`/`PkceName`, e.g. `<slug>_sid`/`<slug>_pkce`). In production use
  `__Host-<slug>_sid`/`__Host-<slug>_pkce`: the attributes above are exactly what `__Host-` requires (`Secure`,
  `Path=/`, no `Domain`).
- `Utils/Constants.cs`: `RoutePrefix="api"`, CORS/cookie/route/table constants, rate-limit policy name,
  `Roles.Admin/User`. `Utils/CacheKeys.cs`: `KeycloakDiscovery`, `KeycloakTokenRefresh`, `User(sub)`.
- `Config/appsettings*.json`: `Serilog`, `Keycloak` (`Authority`, `Audience`, `ClientId`, `ClientSecret`,
  `CallbackUri`, `PostLogoutRedirectUri`, `AppBaseUrl`), `SessionCookies` (`SessionName`, `PkceName`, optional
  `Domain` — leave empty), `SessionStore` (`CleanupInterval`), `AllowedCorsOrigins`, `ConnectionStrings:Postgres`.
  Environment variables override the files.

### Exposure — public API vs private behind an SSR BFF

The C# is identical either way. Only configuration and exposure change, so decide this in STEP 0 and apply the
right column.

| | **Public API** (browser calls it directly) | **Behind an SSR BFF, one origin** (recommended) |
| --- | --- | --- |
| `Keycloak:Authority` (issuer) | `http://keycloak.<slug>.localhost/auth/realms/<Realm>` | `http://app.<slug>.localhost/auth/realms/<Realm>` — Keycloak's OIDC paths are routed on the app host |
| `Keycloak:CallbackUri` | `http://api.<slug>.localhost/api/auth/callback` | `http://app.<slug>.localhost/api/auth/callback` — the edge routes `/api/` straight to this API |
| `AppBaseUrl` / `PostLogoutRedirectUri` | the API origin | `http://app.<slug>.localhost` |
| Realm client `redirectUris` / `webOrigins` | the API origin | `http://app.<slug>.localhost` |
| Public route | the API host | **only the app host**: the edge sends `app./api/*` here; no API host in production |
| CORS | the browser's front line; lock to the app origin | no longer the front line (the browser is same-origin to `app.`), but **still** lock `AllowedCorsOrigins` to the app origin — never `*` |

Cookies are host-only (no `Domain`) in both modes, so they belong to whichever host the browser calls. Behind the
BFF that is the app host: the browser sends them on `app./api/*`, which the edge forwards here, and the SSR server
forwards them on its own server-to-server calls. No proxy rewrites them.

Everything else is unchanged: token resolver, session service and revocation, `/me`, claims transformation, EF
model, cleanup service.

> **Behind a BFF, pair this with `fe-ssr-tanstack` 0.3.0 or later** (same cookie names, POST logout, edge-routed
> auth). Both apps drop into the `nx-monorepo` workspace skeleton, whose nginx proxy and local Traefik route the app
> host.

## Infrastructure to run it

PostgreSQL + a Keycloak realm (confidential client `<slug>_api`) served under `/auth`
(`KC_HTTP_RELATIVE_PATH=/auth`). A minimal `docker-compose.yml` with Postgres + Keycloak + Traefik is enough to run
and test the API locally. For a full workspace stack — Postgres, Redis, Keycloak with a seeded realm, one routing
file that mirrors production, and every app wired together — use the `nx-monorepo` skeleton instead of
hand-rolling compose.

## Verify before claiming done

- `dotnet build <BeName>.csproj` warning-clean; `./build_test.sh` green — cover the **session service, session
  rules (usable ⇔ not purgeable), token hashing, returnTo sanitizer, PKCE/state codec, cookie resolver, claims
  transformation (roles flattened, user provisioned once, idempotent), `ClaimsPrincipal` extensions, `/me`**.
- `docker compose up --build` → Postgres + Keycloak healthy, realm imports, `GET /api/health` → 200.
- End-to-end: log in (`testuser`/`Test123!`) → `GET /api/me` with cookie → `200`; without → `401`; **revocation**:
  capture `<slug>_sid`, `POST /api/auth/logout`, reuse old `<slug>_sid` → `GET /api/me` → **401**.
  `GET /api/auth/logout` → **405**.
- The design-time factory throws a clear error without `ConnectionStrings__Postgres`; `./build_migration.sh` works
  against the local stack with nothing exported.

## Suggested build order

1. (If OpenSpec) propose the spec. 2. Data + migration → session rules + session service → auth wiring
   (`OnMessageReceived`) → claims transformation + `ClaimsPrincipal` extensions → endpoints (login/callback/logout)
   → `/me` → cleanup service. 3. Harness compose + realm import. 4. Verify end-to-end incl. revocation.
