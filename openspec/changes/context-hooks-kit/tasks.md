## 1. Ship the `context-hooks` item

- [x] 1.1 Create `skills/context-hooks/kit/` and copy `state.sh`, `dev-flow-reminder.sh` and
      `prefer-serena.sh` in byte-identically from the source repo; confirm with `cmp` and confirm the
      executable bit is set on all three
- [x] 1.2 Ship `kit/context/prefer-serena.txt` ready to use (repo-neutral), and
      `kit/context/dev-flow.full.txt.example` as a clearly-marked placeholder only
- [x] 1.3 Write `skills/context-hooks/SKILL.md` with catalog frontmatter (`name`, `description`,
      `type`, `disable-model-invocation`, `user-invocable`, `tags`, `agents`, `version: 0.1.0`,
      `author: Aliendreamer`); the description must state the `jq` prerequisite and that scripts do
      not reach `cursor`
- [x] 1.4 In `SKILL.md`, document the three install steps: copy `kit/` → `.claude/claude-hooks/`,
      handle the context files (serena ready-to-use; ASK before scanning the instruction file and
      writing `dev-flow.full.txt`), wire `settings.json` using `${CLAUDE_PROJECT_DIR:-.}` paths
- [x] 1.5 In `SKILL.md`, carry over the two rules that carry the value: "write only the delta" and
      the per-prompt-text warning (why no `*.short.txt` ships, and the bar for adding one)
- [x] 1.6 In `SKILL.md`, document the contract: missing/empty context file means silence, a hook
      never fails a turn, markers live outside the repo, re-running refreshes scripts but never
      `context/`

## 2. Verify the kit behaves as specified

- [x] 2.1 Verify once-per-session: pipe `{"session_id":"t1"}` to `dev-flow-reminder.sh` twice —
      first emits, second is silent; a different session id emits again
- [x] 2.2 Verify the search filter: a `Bash` payload running `grep -rn x .` emits; one running
      `pnpm test` is silent and claims no marker; a `Grep` payload always emits
- [x] 2.3 Verify the failure modes: absent/renamed context file and empty stdin are silent at rc 0;
      malformed stdin speaks once via the fallback identity at rc 0; `jq` absent is silent at rc 0
- [x] 2.6 Guard both hooks with an early `command -v jq` exit so a missing `jq` cannot emit rc 127
      and stderr on every fire; re-verify no regression with `jq` present
- [x] 2.4 Verify markers land under the temp directory and the repo working tree stays clean
- [x] 2.5 Record the clearing command (`find "${TMPDIR:-/tmp}/cc-hook-state-$(id -u)" -type f -delete`)
      in `SKILL.md`'s testing section

## 3. Port `skill-optimizer` with attribution

- [x] 3.1 Create `skills/skill-optimizer/` with `SKILL.md` and `rules/` (5 files) copied from source;
      do not copy `tile.json`
- [x] 3.2 Fetch the upstream `LICENSE` from `mcollina/skills` and save it verbatim as
      `skills/skill-optimizer/LICENSE`; confirm the copyright line reads `Copyright (c) 2026 Matteo Collina`
- [x] 3.3 Convert `SKILL.md` frontmatter to catalog shape with `author: Matteo Collina` and
      `version: 0.1.0` (carried from `tile.json`)
- [x] 3.4 Add an attribution line near the top of `SKILL.md` naming the upstream author, linking
      `https://github.com/mcollina/skills`, and stating the MIT licence and the in-folder `LICENSE`
- [x] 3.5 Confirm the ported content carries no org-, project- or person-identifying strings

## 4. Rewrite `setup-flow` Phase 2.5

- [x] 4.1 Add `context-hooks` to the Phase 0 install list
- [x] 4.2 Replace the inline `UserPromptSubmit` and `PreToolUse` hook JSON in Phase 2.5 with wiring
      that points at `${CLAUDE_PROJECT_DIR:-.}/.claude/claude-hooks/*.sh`
- [x] 4.3 Change the Phase 2.5 hook merge rule from append-if-absent to detect-and-replace: identify
      existing entries whose command embeds the old inline `additionalContext` echo and replace them
      rather than appending
- [x] 4.4 Require Phase 2.6's report to list every hook replaced, with the old command, so the
      rewrite is reviewable in `git diff`
- [x] 4.5 Add a Phase 2.5 step that invokes `context-hooks` to author the repo's `context/*.txt`
      rather than writing hook text into `settings.json`
- [x] 4.6 Bump `setup-flow` frontmatter `version` to `0.5.0` and update its `description` to mention
      the hook kit

## 5. Catalog and gates

- [x] 5.1 Regenerate the catalog and confirm it grows 24 → 26 entries with `context-hooks` and
      `skill-optimizer` present and correct
- [x] 5.2 Run catalog validation and confirm it reports valid and up to date
- [x] 5.3 Run markdownlint across all authored markdown and reach zero errors; add any new
      domain terms to `cspell.json`
- [x] 5.4 Confirm `git` records the three scripts as executable (mode `100755`)
- [x] 5.5 Confirm the new item folders are not caught by `.gitignore`

## 6. Close out

- [x] 6.1 Re-read the change's specs and confirm every requirement has a corresponding
      implementation or verification task above
- [x] 6.2 Run `openspec validate context-hooks-kit --strict`
- [x] 6.3 Report what changed, what was verified and how, and what remains manual (the `cursor`
      degradation, the `jq` prerequisite)

## 7. Correct false `gemini` advertisements

- [x] 7.1 Confirm empirically that `resolveSkillDestination` has no `gemini` entry and throws
      `Agent "gemini" does not support skills`, while the prompt adapters do support it
- [x] 7.2 Remove `gemini` from the `agents` list of every `skills/*/SKILL.md` (20 files), editing
      only the frontmatter block
- [x] 7.3 Leave `prompts/*/PROMPT.md` untouched — gemini has a real prompt destination
      (`.gemini/commands/<id>.toml`)
- [x] 7.4 Regenerate and validate the catalog; confirm no skill entry lists `gemini` and all four
      prompt entries still do
