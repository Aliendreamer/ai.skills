---
name: graphql-audit
description:
  "Audit .graphql operation files and flag any field, argument, query, or mutation marked @deprecated in the schema. Use
  after a .graphql operation changes, before adding query arguments, or when reviewing PRs that touch .graphql files."
type: skill
disable-model-invocation: false
user-invocable: true
tags: [smarttv, graphql, quality, schema]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# graphql-no-deprecated

Audit `.graphql` operation files and flag any field, argument, query, or mutation that is marked `@deprecated` in
`infrastructure/schema.graphql`.

## When to use

- After any `.graphql` operation file is added or modified (mandatory quality gate)
- When writing a new query — check the schema before adding arguments
- When reviewing a PR that touches `.graphql` files

---

## The rule

Fields, arguments, queries, and mutations marked `@deprecated` in `infrastructure/schema.graphql` **SHALL NOT** appear
in any `.graphql` file under `src/gql/operations/`.

**If you cannot remove the deprecated element without losing required data, raise a design discussion — do not silently
leave it in.**

---

## Known deprecated patterns (as of schema audit)

The following are deprecated and MUST NOT be used:

| Element                                                                                                                                            | Deprecated since | Replacement                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------- |
| `profileId` argument on `homeRows`, `homeHeader`, `myLibrary`, `myLibraryHeader`, `vodRootContentFolderList`, `channelLists`, `initialChannelList` | 2020-07-10       | Omit — server uses active profile automatically |
| `profileId` argument on `personalInfo(profileId:)` field                                                                                           | 2020-07-10       | Use `personalInfo` with no argument             |
| `personalChannelList` mutation                                                                                                                     | 2018-05-26       | `setChannelListChannels`                        |
| `addChannel` mutation                                                                                                                              | 2018-05-26       | `setChannelListChannels`                        |
| `purchaseChannelProduct` mutation                                                                                                                  | 2018-05-04       | `purchaseUpsellProduct`                         |
| `vodProducts` query                                                                                                                                | 2018-09-28       | `upsellProducts`                                |
| `VODAsset.description` field                                                                                                                       | ~2017            | `shortDescription` / `fullDescription`          |
| `VODAsset.image` field                                                                                                                             | 2017-12-07       | `thumbnail`                                     |
| `Event.notAvailableForDevice` field                                                                                                                | 2019-02-08       | `liveTV` eventEntitlement                       |
| `Banner.link` field                                                                                                                                | 2019-11-26       | `actions`                                       |
| `isTrackingConsentGiven` on Profile                                                                                                                | 2022-10-26       | `consents`                                      |
| `Series.seasonsInfo` / `VODSeries.seasonsInfo`                                                                                                     | 2018-09-18       | `groupingInfos`                                 |

---

## Steps

### Step 1 — Identify changed operation files

```bash
git diff --name-only HEAD | grep "src/gql/operations"
```

Or for a full audit of all operations:

```bash
find src/gql/operations -name "*.graphql"
```

### Step 2 — Scan for known deprecated patterns

```bash
grep -rn "profileId" src/gql/operations/
grep -rn "personalInfo(profileId" src/gql/operations/
```

Check for any other `@deprecated`-annotated elements by searching the schema:

```bash
grep -n "@deprecated" infrastructure/schema.graphql
```

For each deprecated element found, check if it appears in any operation file.

### Step 3 — Report findings

**Clean:**

```text
✓ graphql-no-deprecated — N operation files checked, no deprecated elements found
```

**Issues found:**

```text
✗ graphql-no-deprecated — N violations

[src/gql/operations/home/HomeRows.graphql:2] Deprecated argument — $profileId on homeRows
Fix: remove $profileId from query variables and homeRows(profileId: $profileId) call

[src/gql/operations/vod/GetVodAsset.graphql:42] Deprecated argument — profileId on personalInfo
Fix: use personalInfo { ... } with no argument
```

### Step 4 — Fix guidance

For `profileId` arguments: remove the variable declaration (`$profileId: ID`) and all usages. The server automatically
uses the active profile. Run `pnpm codegen` after to regenerate types, then update TypeScript callers that passed
`profileId`.

For deprecated queries/mutations: replace with the listed replacement. Check the schema SDL for the replacement's
argument shape.

For deprecated fields: use the replacement field listed above.

---

## Notes

- `profileId` was deprecated server-side on 2020-07-10. The server has ignored it since then — removing it has zero
  behavioral impact.
- After removing a deprecated argument from a `.graphql` file, always run `pnpm codegen` immediately. TypeScript will
  then surface all callers that still pass the removed argument via `TS2353` errors.
- The `infrastructure/schema.graphql` file is the authoritative source. Check it before using any field or argument you
  haven't used before.
