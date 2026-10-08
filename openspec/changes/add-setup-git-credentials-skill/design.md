## Context

The source is `gcm-ubuntu-wsl2-setup.md`, a hand-run record of one successful setup on Ubuntu WSL2 without systemd:
GCM 2.9.1 from the versioned `.deb`, `credential.azreposCredentialType oauth`, GPG + `pass` as
`credential.credentialStore`, and a manually started D-Bus session plus GNOME Keyring (`--components=secrets`) so
MSAL stops falling back to a plain-text token cache. It also records what did not work (the unversioned
`gcm-linux_amd64.deb` asset 404s; `credential.azreposUseMicrosoftSharedCache false` does not fix the warning) and
leaves auto-start open.

`clear-git` and the proposed `cleanup-local-wsl` set the pattern: a bundled script beside `SKILL.md`, called by
`<skill-dir>` path, and a strict line between what the agent runs and what it hands to the user.

## Goals / Non-Goals

**Goals:**

- An agent can take a user from "PAT in the remote URL" to "OAuth via GCM, encrypted at rest" on a fresh WSL instance
  in one guided session, and re-run the skill later to repair or extend a partial setup.
- Same skill on native Ubuntu, where Secret Service often already exists and the keyring steps collapse to a check.

**Non-Goals:**

- Using the Windows Credential Manager / Windows-side GCM from WSL (the source deliberately avoids it).
- Distros without `apt`, macOS, native Windows.
- Hosts other than Azure DevOps beyond what GCM does by default — the store and cache steps apply to any host, but
  only Azure Repos gets an explicit OAuth step.
- Reading, migrating or deleting secrets from an old plain-text store for the user.

## Decisions

**Category `workflow`, id `setup-git-credentials`.** Sits beside `azure-devops-workflow` and `clear-git`; the category
set in `skill-catalog` is fixed. Not named after WSL because native Ubuntu is a supported path.

**Ask, then detect, then walk.** WSL is detected from `/proc/sys/kernel/osrelease` (contains `microsoft`) or
`WSL_DISTRO_NAME`, and offered as the default answer — the user's answer wins (spec: Ask the environment). The real
branch point in the steps is not WSL itself but "is a Secret Service reachable on the session bus"; the WSL answer
sets the expectation (usually not, no systemd) and the probe decides. Alternative — detection only, no question — was
rejected: the user asked for the question, and WSL with `systemd=true` in `wsl.conf` behaves like native.

**Scope as a multi-select of five parts, ordered internally.** Install GCM → OAuth + clean remotes → GPG + `pass`
store → token cache (Secret Service) → auto-start. The skill reorders the user's selection to that order and flags
unmet prerequisites rather than failing midway.

**Agent/user split follows the user's choice: checks + git config by the agent, the rest handed off.** The agent runs
`git config --global` (credential settings), `git-credential-manager configure`, and `git remote set-url`, each after
confirmation. `sudo`, `gpg --full-generate-key`, `pass init`, `secret-tool`, rc edits and the first `git fetch` (opens
an OAuth browser/device-code flow the agent cannot complete) are handed off. `pass init` needs no `sudo` but is handed
off because it binds the store to a key the user picks; the skill shows `gpg --list-secret-keys --keyid-format LONG`
output (public key IDs only) and tells the user to use the **primary** key ID, not the encryption subkey. `SKILL.md`
teaches how to recognize it with an example listing using a made-up ID: the ID after the `/` on the `sec` line is the
primary key; the `ssb` line is the subkey and is not the one to pass.

**`credentialStore gpg` only after `~/.password-store/.gpg-id` exists.** Setting it earlier makes every Git
authentication fail. This check is the gate.

**GCM version: 2.9.1 by default, latest on request.** 2.9.1 is the version this setup was proven on. If the user wants
latest, the skill looks up the release on GitHub and confirms a `gcm-linux-x64-<version>.deb` asset exists before
handing off the download — the asset-name pitfall from the source.

**Redaction of embedded credentials.** Remote URLs are matched for `https://<user>:<secret>@` and `https://<secret>@`;
the skill prints them with the user-info part replaced by `***` and builds the clean URL by dropping user-info.
`~/.git-credentials` is checked with `test -e`, never read. Follows the repository's `secrets-safety` spec.

**Keyring session script is sourced, keeps state in one env file.** `gcm-keyring-session.sh` must be sourced (it
exports variables), works in bash and zsh, and:

1. If `DBUS_SESSION_BUS_ADDRESS` is set and `org.freedesktop.secrets` has an owner on that bus (`dbus-send` NameHasOwner
   probe) → return.
2. Else load the saved env file (`${XDG_RUNTIME_DIR:-$HOME/.cache}/gcm-keyring-session.env`); if its bus answers →
   export, ensure secrets (step 4), return.
3. Else `dbus-launch --sh-syntax`, write the address/PID to the env file (mode 600).
4. If no owner for `org.freedesktop.secrets` → `gnome-keyring-daemon --start --components=secrets` and export its
   output.

Silent on success; on failure prints one line to stderr and returns non-zero without exiting the shell. Executed
directly (not sourced) with `--check`, it reports the state for the skill's checks. Alternative — the two `eval` lines
in `.zshrc` — spawns a bus per terminal, which the source warns against. Alternative — enabling systemd in WSL — is a
bigger, machine-wide change the user did not choose.

**Installing the script is a handed-off copy plus a guarded rc line.** Installed skill folders move between agents,
so the rc must not point into one. The skill hands off copying the script to `~/.local/share/setup-git-credentials/`
and appending `[ -f <path> ] && . <path>` to `~/.zshrc` or `~/.bashrc` (whichever is the user's shell), after checking
the line is not already there.

**The source draft is folded in, not shipped.** Its pitfalls go into a short "Known pitfalls" section of `SKILL.md`;
its personal GPG key ID does not — the skill never contains a real key ID, only the made-up example above.

## Risks / Trade-offs

- [GNOME Keyring needs a prompter to create/unlock the keyring; without WSLg there may be no GUI] → the verification
  `secret-tool` round-trip is handed to the user first, before Git depends on it; the skill reports the failure and
  stops the token-cache part rather than leaving MSAL half-configured.
- [Saved session becomes stale after `wsl --shutdown`] → the script probes before reuse and restarts (spec scenario).
- [Login keyring locked after restart → MSAL may fall back again] → the "after a new session" note tells the user to
  unlock when prompted; re-running the skill's verification detects it.
- [Agent sandbox blocks `git config --global` writes to `~/.gitconfig`] → spec requires report-and-hand-off.
- [GCM release asset naming changes again] → the lookup checks the asset exists before handing off a URL.

## Open Questions

- Whether a leftover MSAL plain-text cache file from before the fix should be located and removal handed off. Its path
  needs confirming against GCM 2.9.1 docs during implementation; it does not change the steps or the agent/user split.
