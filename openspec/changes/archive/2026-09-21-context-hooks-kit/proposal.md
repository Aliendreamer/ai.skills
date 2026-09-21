# Reusable context-hooks kit

## Why

A Claude Code hook's `additionalContext` is injected into the conversation on **every fire** and is
never compacted away. The `setup-flow` skill currently installs exactly this shape: an inline
`UserPromptSubmit` hook carrying an ~800-character dev-flow contract, plus `PreToolUse` Grep/Bash
nudges. Measured over 16 sessions of a repo running them, the dev-flow reminder fired 255 times
(~49k tokens) and the Serena nudge 880 times (~28k tokens) — roughly **4.8k tokens per session** of
re-stating text that had not changed, growing with session length.

A proven fix exists but lives in one private repo: the same hooks, claiming a per-session marker so
each says its piece once, with the wording moved out of `settings.json` into project-owned text
files. That takes the two hooks to ~103 and ~60 tokens per session, flat. The store should ship the
fix, and `setup-flow` should stop installing the problem.

## What Changes

- **New skill `context-hooks`.** Ships the hook kit as files inside the item folder: a shared
  `state.sh` marker helper, a `UserPromptSubmit` reminder hook, a `PreToolUse` prefer-semantic-search
  hook, and example context files. `SKILL.md` drives installation: copy the kit to
  `.claude/claude-hooks/`, author the project's `context/*.txt` as the delta against its already-loaded
  instruction file, and wire `settings.json`.
- **First store item with auxiliary files.** Every existing item is a lone `SKILL.md`. This one ships
  executable shell scripts alongside it, which the installer's recursive folder copy already
  supports for folder-based agents.
- **`setup-flow` Phase 2.5 rewritten** to wire the kit's scripts instead of embedding context strings
  in `settings.json`, and Phase 0 gains `context-hooks` in its install list. Minor version bump.
- **BREAKING (for `setup-flow` consumers):** Phase 2.5's hook merge rule changes from append-if-absent
  to detect-and-replace. Without this, a repo already carrying the inline hooks would receive the
  new hooks *alongside* the old ones — both firing, strictly worse than before the change. Repos
  that have hand-edited their hooks will see them rewritten.
- **`skill-optimizer` ported from a third party.** Upstream is `mcollina/skills`, MIT,
  © 2026 Matteo Collina. It ships with its upstream `LICENSE` and an attribution line, establishing
  the convention for redistributed work in a store that is otherwise MIT © the repo owner and
  published to npm and NuGet.

## Capabilities

### New Capabilities

- `context-hooks`: the behavioural contract of the hook kit — the once-per-session guarantee, the
  never-fail-a-turn rule, marker storage outside the repo, opt-out by removing a context file, and
  the "write only the delta against always-loaded instructions" authoring rule.

### Modified Capabilities

- `skill-catalog`: the content convention permits an item folder to carry auxiliary files beside its
  `SKILL.md`, and requires an item redistributing third-party work to ship that work's licence and
  attribution.
- `skill-install`: auxiliary files in an item folder reach folder-based agents with their file mode
  intact; `cursor` receives only the rendered `SKILL.md`, so script-bearing items are explicitly
  degraded there.

## Impact

- **New:** `skills/context-hooks/` (SKILL.md + `kit/` scripts + example context files);
  `skills/skill-optimizer/` (SKILL.md + `rules/` + upstream `LICENSE`).
- **Modified:** `skills/setup-flow/SKILL.md` (Phase 0 install list, Phase 2.5 hook wiring and merge
  rule, version); `catalog.json` (24 → 26 entries, regenerated).
- **Specs:** `openspec/specs/skill-catalog/`, `openspec/specs/skill-install/`.
- **Dependencies:** the hooks require `jq` at runtime and no-op silently without it. No new build or
  package dependency.
- **Consumers:** repos that ran an earlier `setup-flow` and re-run it will have their inline hooks
  replaced. Repos on `cursor` gain the skill's guidance but not its scripts.
- **Also corrected:** `gemini` removed from the `agents` list of all 20 skill items. There is no
  `gemini` skill destination, so `resolveSkillDestination` throws for it — every skill in the store
  was advertising an agent that fails at install. Prompts keep `gemini`, which does have a prompt
  destination. The alternative fix, adding a gemini skill adapter, was not taken.
- **Not in scope:** porting `typescript-magician` (same third-party upstream, same attribution
  question).
