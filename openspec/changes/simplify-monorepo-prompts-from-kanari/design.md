## Context

The reference is the first project built from these prompts, after its `consolidate-auth` and
`apply-review-cleanup` changes. It was taken apart in three areas; see proposal.md for the list. The prompts are prose
plus, for `nx-monorepo`, real files in `skeleton/`. Nothing here is executable in this repo, so verification is
reading, linting and cross-checking the three prompts against each other.

## Goals / Non-Goals

**Goals:**

- The three prompts describe one consistent stack: the same cookie names, the same logout method, the same routes at
  the edge, locally and in production.
- Every file the skeleton's compose and Nx targets reference exists in the skeleton.
- No project-specific or company-specific value enters the store.

**Non-Goals:**

- Changing who gets access. The prompt keeps Keycloak realm roles flattened into role claims and JIT provisioning of a
  local `User` by `sub`. The reference project's database-sourced access, out-of-contract users and bootstrap super
  admins are its business logic and stay out.
- Domain content from the reference project: audit-log scope columns, contracts, municipalities, i18n locales.
- Adding a CI pipeline or deploy mechanism (still deliberately absent).

## Decisions

### D1. Keep the access model, remove the scoped current-user service

`KeycloakRolesClaimsTransformation` and `UserProvisioningPreProcessor` collapse into `Auth/UserAccess.cs`: the claims
transformation flattens `realm_access.roles` and, through the FusionCache `sub → Id` lookup the prompt already has,
JIT-provisions the user and adds the local id as a claim. `ClaimsPrincipal` extensions (`Subject`, `Email`,
`UserId`, `Roles`) replace `ICurrentUser`. Behaviour is unchanged: the same users get the same roles, and first
sign-in still creates the row.

*Alternative:* keep `ICurrentUser`. Rejected: it is a second copy of what the principal already carries, and the
reference project removed it with no loss.

### D2. The edge routes auth; the SSR server does not proxy it

Production nginx already sends `/api/` to the backend, and the local Traefik does the same on the app host. The
SSR auth proxy therefore duplicated a route the edge already had, and it needed cookie re-homing only because it sat
in the middle. With the edge routing, the backend sets cookies for the app host directly (no `Domain`), which is what
re-homing produced.

`__Host-` in production: the cookie names are already config (`SessionCookies:SessionName`/`PkceName`), and the
backend already sets `Path=/`, no `Domain`, and `Secure` outside Development. Production sets the names to
`__Host-<slug>_sid`/`__Host-<slug>_pkce`. The FE's forwarded-cookie allow-list reads the same names.

*Alternative:* keep the proxy as an option. Rejected: two auth paths to document and test, and the user has moved to
the edge-routed shape.

### D3. Keycloak on the app origin under `/auth`

`KC_HTTP_RELATIVE_PATH=/auth` plus edge routes for `/auth/realms/` and `/auth/resources/` on the app host make the
issuer `http://app.<slug>.localhost/auth/realms/<Realm>`. Inside the compose network the proxy's network alias
resolves the app host to Traefik, so the backend validates the same issuer the browser sees without `extra_hosts`.
The admin console stays on `keycloak.<slug>.localhost/auth/admin` and is never routed on the app host. The CSP's
`form-action 'self'` now covers the logout redirect chain, so `KEYCLOAK_ORIGIN` goes.

### D4. One routing file, no docker socket

Traefik's docker provider breaks when the daemon's minimum API version moves, and mounting the socket gives a dev
container control of the host's Docker. A file provider over `traefik/dynamic.yml` removes both. The coverage
compose uses the same file. The `api.` host stays for local Scalar/curl only; production exposes only the app host.

### D5. Layout conventions that travel

`Options/` must not use a namespace ending in `.Options`, because that hides `Microsoft.Extensions.Options.Options`
everywhere under it. The prompt states the rule and names the options namespace `<BeName>Options`.
`ServiceResult<T>` + `ServiceResultStatus` (`Ok`, `NotFound`, `Invalid`, `Conflict`)
is the one return type endpoints map to 200/204, 404, 400 and 409.

### D6. Genericising the reference files

Each skeleton file taken from the reference project gets the app name, slug, realm and dev ids replaced by the
existing placeholders (`<AppName>`, `<app-name>`, `<Realm>`), and dev-user ids replaced by a fixed, documented
placeholder UUID. The last verification step's placeholder grep extends to the new files.

## Risks / Trade-offs

- [The FE and BE prompts change their logout contract together] → both bump minor versions in the same release, and
  each prompt names the other's matching version in its pairing note.
- [Without the SSR proxy, the backend's `/api/` is reachable from the browser through the edge] → it always was in
  production (nginx routes `/api/`); authorization stays on the backend, and the prompt's gotcha about route guards
  not protecting server functions remains.
- [A realm placeholder file cannot be fully generic] → it ships the minimum (realm, confidential client, redirect
  URIs, post-logout attribute, test user) with placeholders, the shape the FE prompt's harness section already
  describes.
