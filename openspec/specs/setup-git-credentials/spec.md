# setup-git-credentials Specification

## Purpose

Defines how the secure Git credentials skill sets up Git Credential Manager with per-host sign-in (Azure DevOps,
GitHub, GitLab and others), encrypted credential storage and a secure Microsoft token cache on Ubuntu/Debian (WSL2 or
native): what it asks, what it checks, what it may change itself, what it hands to the user, how it treats secrets,
and the contract of its bundled keyring session script.

## Requirements

### Requirement: Ask the environment, the hosts and the scope before any step

Before running or handing off any setup step, the skill SHALL ask the user whether the machine is WSL, presenting
what it detected; which Git hosts are in use (Azure DevOps, GitHub, GitLab.com, self-hosted GitLab, other), pre-filled
from the hosts of the remotes it found; and which parts to set up from: install Git Credential Manager; sign-in for
the selected hosts with PAT-free remote URLs; encrypted Git credential store (GPG + `pass`); secure Microsoft token
cache (Secret Service); auto-start of the keyring session in new shells. Parts already in place SHALL be shown as
such. The token cache and auto-start parts SHALL be offered only when Azure DevOps is among the selected hosts.

#### Scenario: Hosts pre-filled from remotes

- **WHEN** the remotes it checked point at `github.com` and `dev.azure.com`
- **THEN** the hosts question offers GitHub and Azure DevOps as selected and lets the user add or remove hosts

#### Scenario: No Azure DevOps

- **WHEN** the user's hosts are GitHub and GitLab only
- **THEN** the scope question does not offer the Microsoft token cache or auto-start parts

#### Scenario: WSL detected

- **WHEN** the kernel or environment identifies a WSL instance
- **THEN** the skill says it looks like WSL, asks the user to confirm, and asks which parts to set up before doing
  anything else

#### Scenario: User overrides the detection

- **WHEN** the user answers differently from what was detected
- **THEN** the skill follows the user's answer and says which steps that changes

#### Scenario: Part already configured

- **WHEN** a part's checks show it is already in place (for example `credential.credentialStore` is `gpg` and the
  `pass` store is initialized)
- **THEN** the skill marks it as done in the scope question and does not repeat its steps unless the user asks

### Requirement: Steps run in dependency order

The skill SHALL walk the selected parts in an order where each step's preconditions hold: GCM installed before it is
configured; a GPG key and an initialized `pass` store before `credential.credentialStore` is set to `gpg`; a reachable
Secret Service before the token-cache verification. If a selected part depends on an unselected part that is not in
place, the skill SHALL say so and ask whether to add it.

#### Scenario: Encrypted store selected without a pass store

- **WHEN** the user selects the encrypted store and no `pass` store is initialized
- **THEN** the skill hands off key creation and `pass init` first and sets `credential.credentialStore` only after
  the user confirms they are done and the check passes

#### Scenario: Missing prerequisite part

- **WHEN** the user selects the token cache but GCM is not installed and was not selected
- **THEN** the skill reports the missing prerequisite and asks whether to add the install step

### Requirement: Sign-in is configured per selected host

For each selected host the skill SHALL configure Git Credential Manager so that sign-in does not depend on a PAT in
the URL: OAuth for Azure DevOps (`credential.azreposCredentialType` `oauth`); OAuth for GitHub (browser, or device
code where no browser can open); OAuth for GitLab.com; for self-hosted GitLab, either a registered OAuth application
the user supplies or a PAT entered at GCM's prompt; for other hosts, the credential entered at GCM's prompt. In every
case the credential SHALL end up in the configured credential store, not in a remote URL or a plain-text file. When a
host-specific helper (for example `gh auth git-credential` or `glab auth git-credential`) overrides GCM for a selected
host, the skill SHALL report it and ask whether to keep it or hand that host to GCM.

#### Scenario: GitHub without a browser

- **WHEN** the user selects GitHub on WSL where no browser can be opened
- **THEN** the skill configures device-code sign-in for GitHub and tells the user the first fetch will show a code to
  enter on another device

#### Scenario: Self-hosted GitLab

- **WHEN** the user selects a self-hosted GitLab instance
- **THEN** the skill asks whether an OAuth application is registered for GCM; with one, it configures that instance's
  client ID and provider; without one, it configures PAT sign-in so GCM prompts for the PAT once and stores it

#### Scenario: gh helper overrides GCM

- **WHEN** `credential.https://github.com.helper` points at `gh auth git-credential`
- **THEN** the skill reports it and, if the user wants GCM for GitHub, removes those entries after confirmation

### Requirement: Agent changes only user-level Git configuration, after confirmation

The skill MAY run read-only checks at any time. After the user confirms each change, it MAY run `git config --global`
for the credential settings, `git-credential-manager configure`, and `git remote set-url` to a URL without
credentials. It SHALL NOT invoke `sudo`. It SHALL hand the user as exact commands every package install, `gpg` key
generation, `pass init`, `secret-tool` store or clear, shell rc edit, and the first authenticating `git fetch`.

#### Scenario: Confirmed configuration change

- **WHEN** the user confirms a listed `git config` or `set-url` change
- **THEN** the skill runs exactly that change and shows the resulting value

#### Scenario: Step needs sudo or interaction

- **WHEN** a selected step needs `sudo`, a password prompt or a browser/device-code login
- **THEN** the skill prints the exact command with the user's values filled in, waits for the user to report back,
  and re-runs the relevant check

#### Scenario: Change fails

- **WHEN** a change the skill runs fails
- **THEN** the skill reports the failure and hands off the command instead of retrying another way

### Requirement: Secrets are never shown and found exposures are reported

The skill SHALL NOT print, read back or log a token, password or credential file's contents. When it finds a remote
URL with embedded credentials or a plain-text credential store, it SHALL show the location with the secret part
redacted, offer the clean URL or the removal command, and tell the user to revoke the exposed PAT.

#### Scenario: Remote URL contains a PAT

- **WHEN** `git remote -v` shows a URL with a user-info part containing a password or token
- **THEN** the skill shows the remote with the secret replaced by a placeholder, proposes the clean URL, and reminds
  the user to revoke that PAT, naming where for that host (Azure DevOps, GitHub or GitLab)

#### Scenario: SSH remote

- **WHEN** a remote uses SSH
- **THEN** the skill leaves it unchanged and does not flag it

#### Scenario: Plain-text credential file present

- **WHEN** `~/.git-credentials` exists or `credential.helper` is `store`
- **THEN** the skill reports it without reading its contents and hands off its removal after the secure store works

### Requirement: Setup ends with verification

The skill SHALL finish by checking the configured parts: the expected `git config` values (`credential.credentialStore`
`gpg`, a GCM `credential.helper`, and the per-host settings it made), and for each selected host a `git fetch` the user
runs that signs in and completes. When Azure DevOps is selected it SHALL also check a Secret Service round-trip with a
throwaway test secret that is cleared afterwards, and that the Azure DevOps fetch completes without the
`cannot persist Microsoft authentication token cache securely` warning. It SHALL report each check as passed or
failed.

#### Scenario: Second fetch needs no sign-in

- **WHEN** the user runs a second `git fetch` against a host after signing in once
- **THEN** it completes without a prompt, showing the credential was stored

#### Scenario: Token-cache warning still appears

- **WHEN** the user reports the plain-text fallback warning after setup
- **THEN** the skill checks that the fetch ran in a shell with a reachable Secret Service and walks the keyring
  session step again; it does not suggest `credential.azreposUseMicrosoftSharedCache` as a fix

### Requirement: Keyring session script reuses a live session

The bundled keyring session script, when sourced, SHALL export a D-Bus session address with a reachable Secret
Service. It SHALL reuse an existing reachable session (from the environment or one it saved earlier) and start a new
D-Bus session or keyring daemon only when none is reachable. Sourcing it repeatedly, or in many terminals, SHALL NOT
start additional daemons while a reachable session exists. It SHALL NOT prompt or print on success, so it is safe in a
shell rc.

#### Scenario: Second terminal

- **WHEN** the script is sourced in a new terminal while a session started by an earlier terminal is alive
- **THEN** the new terminal uses that session and no new `dbus-daemon` or `gnome-keyring-daemon` process starts

#### Scenario: Stale saved session

- **WHEN** the saved session is no longer reachable (for example after `wsl --shutdown`)
- **THEN** the script starts a new session, saves it, and exports it

#### Scenario: Secret Service already provided

- **WHEN** the current session already offers Secret Service (for example a native desktop or systemd user session)
- **THEN** the script changes nothing
