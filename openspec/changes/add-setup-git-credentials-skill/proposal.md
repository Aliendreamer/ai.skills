## Why

Azure DevOps remotes on Linux dev machines end up with a PAT embedded in the URL or saved in plain text
(`~/.git-credentials`, the MSAL plain-text fallback cache), because the secure alternative — Git Credential Manager
with an encrypted store — takes a dozen non-obvious steps on Ubuntu, and more under WSL2 where there is no systemd to
provide a D-Bus session and Secret Service. A working setup was worked out by hand and written down in
`gcm-ubuntu-wsl2-setup.md`; nothing turns it into something an agent can walk the next person (or the next WSL
instance) through.

## What Changes

- New skill `skills/workflow/setup-git-credentials/` that sets up secure Git credentials on Ubuntu/Debian, WSL2 or
  native, interactively:
  - **Asks first:** confirms whether this is WSL (showing what it detected) and which parts to set up — install GCM,
    OAuth for Azure Repos plus PAT-free remote URLs, the encrypted GPG + `pass` credential store, the secure MSAL
    token cache via GNOME Keyring / Secret Service, and auto-start of that keyring session in new shells.
  - **Checks before acting:** reports what is already in place (GCM version, relevant `git config`, remotes with
    embedded credentials, a plain-text `~/.git-credentials`, a GPG key and `pass` store, a reachable Secret Service)
    and skips steps that are done.
  - **Walks the chosen parts in dependency order.** The agent itself runs only read-only checks and — after the user
    confirms — `git config --global` changes, `git-credential-manager configure`, and `git remote set-url` to a clean
    URL. Every `sudo`/`apt` step and every interactive one (`gpg --full-generate-key`, `pass init`, `secret-tool`,
    the first `git fetch` that triggers OAuth, shell rc edits) is handed to the user as an exact command.
  - **Ends with verification:** `secret-tool` round-trip, `git fetch` without the
    `cannot persist Microsoft authentication token cache securely` warning, and the expected `git config` values.
- Bundled `gcm-keyring-session.sh`: sourced from a shell rc, it reuses a live D-Bus session and Secret Service if one
  exists and starts `dbus-launch` + `gnome-keyring-daemon --components=secrets` only when not — the automatic startup
  the source document deliberately left undone because the naive `.zshrc` version spawns a new daemon per terminal.
- The skill never prints, reads back or logs a token or password, and points the user to revoke any PAT it found
  embedded or stored in plain text.

## Capabilities

### New Capabilities

- `setup-git-credentials`: how the secure Git credentials skill interviews the user, what it checks, what it may
  change itself after confirmation, what it must hand off, how it treats secrets it finds, and the session-reuse
  contract of its bundled keyring script.

### Modified Capabilities

<!-- none — the skill fits the existing `workflow` category and auxiliary-files convention in `skill-catalog` -->

## Impact

- New files: `skills/workflow/setup-git-credentials/SKILL.md` and `gcm-keyring-session.sh`.
- `catalog.json` regenerated (one new entry); `README.md` skill list updated.
- No change to the catalog library, either CLI, or the install flow.
- Runtime dependencies are installed by the user through the handed-off commands: `git-credential-manager`, `gnupg`,
  `pass`, `dbus-x11`, `gnome-keyring`, `libsecret-tools`. The skill itself needs only `bash`, `git` and coreutils.
- The draft `gcm-ubuntu-wsl2-setup.md` at the repo root is folded into the skill (without its personal GPG key ID);
  whether to delete it afterwards is the user's call.
