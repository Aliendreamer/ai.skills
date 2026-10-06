## 1. Bundle the scripts

- [ ] 1.1 Copy the six scripts from `SmartTV.Deploy/cleanupLocalMashine/` into
  `skills/workflow/cleanup-local-machine/`, keeping names and the executable bit (skip the empty `.claude/` folder)
- [ ] 1.2 `clean-all.sh`: add `--no-trim` (skip the closing `sudo fstrim`, still print disk after) and
  `--buildstorage PATH` (default `~/projects/BuildStorageRepo`); update the header usage line
- [ ] 1.3 `wsl-cleanup.sh`: dry run by default with `--delete` to apply; the dry run lists each command it would run
  and the sizes of the cache directories it can measure; update the header usage lines
- [ ] 1.4 `bash -n` and `shellcheck` (if installed) pass on all six scripts

## 2. Write the skill

- [ ] 2.1 `SKILL.md` frontmatter: `name: cleanup-local-machine`, a "Use when…" description that names the bundled
  scripts and the hand-off of sudo/WSL-shutdown steps, trigger terms (clean up machine, free disk space, WSL disk
  full, node_modules, nvm), tags, agents, `version: 0.1.0`, author — matching `clear-git`'s shape
- [ ] 2.2 Body: script table (what each removes, needs sudo or not, who runs it), and the steps — measure disk, ask
  nvm policy and project root, dry run (`clean-all.sh`, plus `clean-nvm.sh` for strict policy), confirm, run
  `clean-all.sh --delete --no-trim` (or component scripts for narrowed scope), show disk after, hand off
  `wsl-cleanup.sh --delete` / fstrim / BuildStorageRepo removal / `wsl-compact.sh` in order
- [ ] 2.3 Cover the guards from the spec: no `sudo` from the agent, VS Code remote-session detection
  (`TERM_PROGRAM=vscode` / `VSCODE_IPC_HOOK_CLI`), report-and-hand-off on a failed delete, `wsl-compact.sh` ends the
  agent's session

## 3. Catalog and docs

- [ ] 3.1 Add `cleanup-local-machine` to the skill list in `README.md` beside `clear-git`
- [ ] 3.2 Regenerate `catalog.json` and run catalog validation (via the tsc-compiled JS if Nx is blocked in the sandbox)
- [ ] 3.3 `markdownlint-cli2` and `cspell` pass on the new markdown

## 4. Verify the scripts

- [ ] 4.1 Run each deleting script with no flags and confirm it removes nothing (compare `df` before/after) and ends
  with the apply hint
- [ ] 4.2 Run each with an unknown option and confirm a non-zero exit naming it
- [ ] 4.3 Run `clean-project-builds.sh` against a scratch tree (a `node_modules`, a `bin/` beside a `.csproj`, a
  `bin/` with no project file) with `--delete` and confirm only the first two go
