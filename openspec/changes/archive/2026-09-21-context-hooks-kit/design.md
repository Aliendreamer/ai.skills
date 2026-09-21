## Context

See `proposal.md` — Why, for the measured cost this removes.

Constraints that shape the approach:

- **The installer already supports this.** `libs/install/src/install.ts` copies the whole item folder
  recursively for folder-based agents and renders only `SKILL.md` for `cursor`. No installer change
  is needed; the specs pin the behaviour that already exists plus the mode-preservation guarantee.
- **The catalog ignores auxiliary files.** `generateCatalog` reads only `<item>/SKILL.md`, so extra
  files are invisible to `catalog.json`. `author` is frontmatter-only and never reaches the catalog.
- **`setup-flow` is the installed base.** It is the skill that puts the every-turn hooks into repos
  today, and its Phase 2.5 merge rule is append-if-absent keyed on event plus command string.
- **The kit is proven, not new.** The three scripts have run for months in one repo. Their value is
  in details that do not survive re-derivation: the word-boundary search filter, the `tr -cd`
  identity sanitisation, the prune-only-on-claim placement.
- **`jq` is a hard runtime dependency** of all three scripts, and `shellcheck` is not available in
  this workspace.

## Goals / Non-Goals

**Goals:**

- Ship the kit as artifacts, byte-identical to the proven originals.
- Make `setup-flow` install the kit and migrate repos off the inline hooks in one pass.
- Establish a reusable attribution convention for redistributed third-party items.

**Non-Goals:**

- Changing `libs/install` or `libs/catalog` code. This change is content plus specs that describe
  behaviour already implemented.
- Supporting `cursor` for script-bearing items.
- Adding `gemini` to the folder-copy list, which the existing `skill-install` spec omits — a real
  gap, but a separate change.
- Automating hook-text authoring. The delta rule requires reading the repo's instruction file and
  judging what is already covered; that is the agent's job at install time, not a generator's.

## Decisions

### Scripts are copied out of the item folder, not run in place

Wiring `settings.json` straight at `.claude/skills/context-hooks/kit/*.sh` would avoid a copy step,
but the project-authored `context/*.txt` sits beside the scripts, and reinstalling or updating the
skill would overwrite it. Copying the kit to `.claude/claude-hooks/` keeps project text under
project ownership. Re-running the skill refreshes the three scripts and never touches `context/`.

*Alternative considered:* scripts in place with the context directory resolved from an environment
variable. Cleaner separation, but it changes `state.sh`'s context resolution — giving up the
byte-identical property that motivated shipping files at all, for a problem the copy already solves.

### Installed directory is `claude-hooks`, not `hooks`

`.gitignore` ignores `.claude/hooks`, so a kit installed there would be invisible to version
control and lost on a fresh clone. `claude-hooks` is tracked.

### Repo-neutral text ships ready; repo-specific text is offered, not assumed

The two hooks differ in kind. `prefer-serena.txt` says something true of any repo using semantic
code tools, so shipping it ready-to-use costs nothing and makes adoption a copy. `dev-flow.full.txt`
is by definition the delta against *this* repo's always-loaded instructions, so it ships as an
example only.

Deriving the dev-flow text means reading the repo's instruction file and writing a file on the
user's behalf — a scan-and-rewrite they should agree to rather than discover. The skill asks first,
shows the draft, and leaves the `.example` unrenamed if they decline; that hook then stays silent
and the rest of the install still works.

*Alternative considered:* shipping both as examples. Rejected — it forces authoring for text that
never varies, and a pointless step is a step people skip badly. *Also considered:* shipping both
ready-made. Rejected for the dev-flow file — ready-made workflow text invites verbatim adoption,
which reintroduces exactly the always-loaded duplication the capability removes.

### `setup-flow` Phase 2.5 becomes detect-and-replace

Today's merge rule matches on event plus command string. The new hook commands differ from the old
inline ones, so append-if-absent would leave a repo running both — the every-turn hook *and* its
replacement, strictly worse than before. Phase 2.5 must recognise the old inline hooks by their
embedded `additionalContext` echo and replace them.

*Alternative considered:* leaving the merge rule alone and telling users to delete the old hooks by
hand. Rejected — the failure is silent and doubles the cost this change exists to remove.

### `setup-flow` depends on `context-hooks` rather than inlining it

Phase 0 already installs required skills, so the machinery exists. One source of truth for the hook
contract beats two copies drifting apart.

### `tile.json` is dropped from the ported third-party item

It is the upstream's own manifest format. `catalog.json` is generated from frontmatter here, so a
second manifest would be a stale duplicate. Its `version` carries over into frontmatter.

## Risks / Trade-offs

- **A repo has hand-edited its `setup-flow` hooks** → detect-and-replace rewrites them. Phase 2.5
  must report every hook it replaced, with the old command, so the change is reviewable in
  `git diff` rather than silent.
- **`jq` absent on a contributor's machine** → all three hooks no-op silently, and the guidance
  simply never appears. This is the designed failure mode (a hook must never fail a turn), but it
  fails *quiet*. The skill documents `jq` as a prerequisite and gives the one-line check.
- **`cursor` users install the skill and get no scripts** → the description states the limitation
  and the spec pins it, so it is a known degradation rather than a silent one.
- **No `shellcheck` in this workspace** → the scripts cannot be statically linted here. Mitigated by
  the stdin-payload tests, which exercise the behaviour the specs name (emit-then-silent, the
  search-filter arms) rather than the syntax.
- **Redistributing third-party work** → upstream is MIT, which permits it provided the notice
  travels. Shipping the upstream `LICENSE` in the item folder satisfies that; the new `skill-catalog`
  requirement makes it a standing rule rather than a one-off.
- **Scripts are executable content in an installable package** → anyone installing the skill gets
  shell scripts that a hook will run. They are short, readable, and in-repo, but this is a genuinely
  higher-trust artifact than a markdown file, and the store has not shipped one before.

## Migration Plan

1. Land `context-hooks` and `skill-optimizer`; regenerate and validate the catalog. Both are
   additive — no existing consumer is affected.
2. Land the `setup-flow` rewrite with the version bump. Repos adopt it only when they re-run
   `setup-flow`.
3. For a repo re-running `setup-flow`: the inline hooks are replaced, the kit is copied in, and the
   `context/*.txt` are authored from that repo's instruction file. Review `git diff` on
   `.claude/settings.json` before committing.

**Rollback:** revert the `setup-flow` version; restore the previous `.claude/settings.json` from git.
The kit is inert once unwired — leaving `.claude/claude-hooks/` in place costs nothing.

## Open Questions

- Whether the kit should eventually ship a third hook for `PostToolUse` output trimming. Deferrable:
  it adds a requirement rather than changing any here, and there is no measurement for it yet.
