## Why

WSL dev machines run out of disk: `node_modules`, .NET `bin`/`obj`, old nvm Node versions, superseded VS Code
server extensions, Gradle and package-manager caches pile up, and freed blocks are not returned to Windows until the
disk is trimmed and the `ext4.vhdx` made sparse. Scripts that handle all of this already exist in
`SmartTV.Deploy/cleanupLocalMashine`, but they sit in a deploy repo where neither the team nor an agent finds them,
and nothing tells you which one to run, in what order, or which steps need `sudo` or a WSL shutdown.

## What Changes

- New skill `skills/workflow/cleanup-local-wsl/` that frees disk space on a local WSL dev machine using bundled
  scripts:
  - `clean-all.sh` — orchestrator: BuildStorageRepo `git gc` (or removal), project build output, dev tools, fstrim.
  - `clean-project-builds.sh` — `node_modules`, `.next`, and `bin`/`obj` beside a .NET project file.
  - `clean-dev-tools.sh` — old nvm Node versions (keeps current + newest per major), VS Code server leftovers,
    Gradle caches, pnpm store prune.
  - `clean-nvm.sh` — stricter nvm cleanup (keeps only current + `default`).
  - `wsl-cleanup.sh` — package-manager caches, apt, journal, optional test browsers and Docker, fstrim.
  - `wsl-compact.sh` — fstrim, then a detached PowerShell `wsl --shutdown` + `--set-sparse true`.
- The skill measures disk usage, runs dry runs and shows what would go and how much space it frees. After the user
  confirms, it runs the **non-`sudo`** deletions itself. Every `sudo` step (apt, journal, fstrim) and
  `wsl-compact.sh` (which ends the agent's own session) is handed to the user as an exact command.
- Small fixes while moving the scripts:
  - `wsl-cleanup.sh` becomes dry run by default with an explicit `--delete`, like the others (today it deletes on
    first run).
  - `clean-all.sh` gains `--no-trim` (skip the closing `sudo fstrim`, so an agent can run the user-space part) and
    `--buildstorage PATH` (today hardcoded to `~/projects/BuildStorageRepo`).
- The originals in SmartTV.Deploy are left in place; removing them is a separate decision for that repo.

## Capabilities

### New Capabilities

- `cleanup-local-wsl`: what the local WSL cleanup skill measures, what it may delete on its own after
  confirmation, what it must always hand off to the user, and the dry-run-by-default contract of its bundled scripts.

### Modified Capabilities

<!-- none — the skill fits the existing `workflow` category and auxiliary-files convention in `skill-catalog` -->

## Impact

- New files: `skills/workflow/cleanup-local-wsl/SKILL.md` plus six bundled `*.sh` scripts.
- `catalog.json` regenerated (one new entry); `README.md` skill list updated if it enumerates skills.
- No change to the catalog library, either CLI, or the install flow. Bundled scripts reach agents the same way
  `clear-git`'s `cleargit.sh` does.
- Runtime dependencies are optional and detected: `nvm`, `pnpm`, `yarn`, `uv`, `npm`, `dotnet`, `docker`, `sudo`,
  `powershell.exe` (WSL interop). Only `bash` and coreutils are required.
