## 1. Keyring session script

- [x] 1.1 Write `skills/workflow/setup-git-credentials/gcm-keyring-session.sh`: sourceable from bash and zsh,
  reuse → saved env → `dbus-launch` → `gnome-keyring-daemon --start --components=secrets`, env file mode 600, silent
  on success, `return` (never `exit`) on failure when sourced; executable bit set
- [x] 1.2 `--check` mode when executed directly: prints bus reachable yes/no and Secret Service owner yes/no, exit code
  0 only when both hold
- [x] 1.3 `bash -n`, `zsh -n` and `shellcheck` (if installed) pass

## 2. Write the skill

- [x] 2.1 `SKILL.md` frontmatter matching `clear-git`'s shape: `name: setup-git-credentials`, a "Use when…" description
  naming GCM, Azure DevOps OAuth, PAT in remote URL, GPG/`pass`, Secret Service/MSAL warning, WSL; trigger terms; tags;
  agents; `version: 0.1.0`; author
- [x] 2.2 Intro and parts table: each of the five parts, what it changes, who runs each command (agent / user), and
  its prerequisite
- [x] 2.3 Steps: detect + ask WSL; checks (read-only, redacted); multi-select scope with done parts marked; walk
  selected parts in order with the confirm/hand-off split and the `.gpg-id` gate; script install hand-off; verification
- [x] 2.4 Guards from the spec: no `sudo`, never print or read secrets, redaction format, revoke-PAT reminder,
  report-and-hand-off on a failed change
- [x] 2.5 `pass init` key ID: an example `gpg --list-secret-keys --keyid-format LONG` listing with a made-up ID,
  showing that the ID after `/` on the `sec` line is the one to use and the `ssb` subkey line is not
- [x] 2.6 "Known pitfalls" section from the source draft: `.deb` asset name 404, `azreposUseMicrosoftSharedCache` is
  not the fix, credential store vs MSAL cache are separate, don't paste the `eval` lines into `.zshrc`; no real key ID
  anywhere in the skill (grep the folder for the draft's ID before committing)
- [x] 2.7 Resolve the open question: confirm the MSAL plain-text cache location for GCM 2.9.1 and, if confirmed, add
  its detection (existence only) and hand-off removal

- [x] 2.8 Multi-host: hosts question pre-filled from remotes; per-host sign-in settings for Azure DevOps, GitHub,
  GitLab.com, self-hosted GitLab and other hosts; `gh`/`glab` helper override check; per-host PAT revoke locations;
  parts 4–5 only with Azure DevOps; frontmatter description, tags and README line no longer Azure-only

## 3. Catalog and docs

- [x] 3.1 Add `setup-git-credentials` to the skill list in `README.md` beside `azure-devops-workflow`
- [x] 3.2 Regenerate `catalog.json` and run catalog validation (via the tsc-compiled JS if Nx is blocked in the sandbox)
- [x] 3.3 `markdownlint-cli2` and `cspell` pass on the new markdown (add words such as `azrepos`, `MSAL` to
  `cspell.json` if needed)
- [ ] 3.4 Ask the user whether to delete the root draft `gcm-ubuntu-wsl2-setup.md` now that the skill holds its content

## 4. Verify the script

- [ ] 4.1 Source the script twice in one shell and once in a second shell; confirm one `dbus-daemon` and one
  `gnome-keyring-daemon` for the user (`pgrep -u "$USER" -c`)
- [ ] 4.2 Kill the saved bus, source again; confirm a new session is started and the env file updated
- [ ] 4.3 With a session already offering `org.freedesktop.secrets`, source it; confirm nothing new starts and
  `--check` exits 0
