## Context

The six scripts in `SmartTV.Deploy/cleanupLocalMashine` already work and share conventions (`set -uo pipefail`,
`step` headings, before/after `df`). Four are dry run by default with `--delete`; `wsl-cleanup.sh` deletes on first
run; `wsl-compact.sh` is interactive and ends with `wsl --shutdown`. `clean-all.sh` locates its helpers next to
itself or on `PATH` (with or without `.sh`) and always finishes `--delete` with `sudo fstrim`.

`clear-git` is the precedent for a skill with a bundled script: the script lives beside `SKILL.md`, is called by its
path (`<skill-dir>`), and the skill hands the destructive command to the user. Here the user chose a looser model:
the agent deletes regenerable user-space data after confirmation (see `specs/cleanup-local-wsl/spec.md`).

## Goals / Non-Goals

**Goals:**

- One skill an agent can follow end to end: measure → dry run → confirm → user-space delete → hand off.
- Keep the scripts runnable by hand, outside any agent, exactly as today.

**Non-Goals:**

- Native Windows, macOS or non-WSL Linux support beyond what already works by accident.
- Removing the originals from SmartTV.Deploy or adding new cleanup targets.
- Scheduling or automatic periodic cleanup.

## Decisions

**Category `workflow`, id `cleanup-local-wsl`.** The category set is fixed in `skill-catalog`; `workflow` already
holds `clear-git`, the other cleanup skill. A new `wsl` category would mean a catalog spec change for one item.
The id names what the scripts actually target — a local WSL instance, not any machine; the script names stay as they are.

**Agent runs component scripts through the orchestrator with `--no-trim`.** `clean-all.sh --delete --no-trim` covers
BuildStorageRepo gc, project builds and dev tools in one call, with no `sudo`. Alternative — the agent calling
`clean-project-builds.sh` and `clean-dev-tools.sh` separately and running `git gc` inline — duplicates the
orchestrator's logic in prose. The skill still calls the component scripts directly when the user narrows scope
(different root, skip VS Code, strict nvm policy), since the orchestrator does not forward those.

**Strict nvm policy runs `clean-nvm.sh` before the orchestrator.** Running it first leaves only current + default, so
the orchestrator's nvm step then finds nothing extra to remove. No change to either script's keep logic.

**VS Code session detection by environment.** `TERM_PROGRAM=vscode` or a set `VSCODE_IPC_HOOK_CLI` means the agent
lives inside a VS Code remote session. In that case the skill hands off the dev-tools delete rather than adding a
`--skip-vscode` flag; the user closes VS Code and runs it from a plain terminal. Keeps the script change set small.

**`wsl-cleanup.sh` gains `--delete`, dry run otherwise.** The dry run prints the commands it would run and the sizes
of the cache directories it can measure (`~/.npm/_cacache`, `~/.cache/yarn`, `~/.nuget/packages`, `~/.cache/uv`,
`~/.cache/typescript`, browser caches). It needs `sudo` when applied, so the skill only ever hands it off.

**`clean-all.sh` flags.** Add `--no-trim` and `--buildstorage PATH` (default unchanged:
`~/projects/BuildStorageRepo`). Existing flags and default behaviour stay as they are.

**Scripts are copied, not symlinked or fetched.** Same reason as `cleargit.sh`: the installer copies the item folder
to each agent, and the skill must work without the SmartTV.Deploy checkout.

## Risks / Trade-offs

- [Deleting `node_modules` of an active project forces a reinstall] → the report lists every folder; the skill offers
  to narrow the root or exclude projects before confirming.
- [Agent sandbox blocks writes under `~/.nvm`, `~/.vscode-server`, `~/.gradle`] → the spec requires reporting the
  failure and handing off the command, never working around the sandbox.
- [VS Code detection misses a session] → the script's own header warns to close VS Code windows; the skill repeats it
  in the confirmation prompt.
- [Two copies of the scripts drift (SmartTV.Deploy vs ai.skills)] → the proposal leaves the originals; recommend
  replacing them with a pointer to the skill in a follow-up in that repo.
