---
name: setup-git-credentials
description: "Use when the user wants Git to stop using a PAT in the remote URL or a plain-text credential store, wants Git Credential Manager (GCM) with OAuth for GitHub, GitLab or Azure DevOps on Ubuntu/Debian or WSL2, or sees 'cannot persist Microsoft authentication token cache securely' / 'using plain-text fallback token cache'. Asks whether this is WSL, which Git hosts and which parts to set up, checks what is already done, sets git config itself after confirmation and hands every sudo or interactive step (apt, gpg, pass init, secret-tool, first sign-in) to the user. Bundles gcm-keyring-session.sh to start or reuse a D-Bus + GNOME Keyring session without systemd. Trigger terms - git credentials, PAT in URL, token in remote, git credential manager, gcm, github auth, gitlab auth, azure devops auth, pass, gpg store, secret service, gnome keyring, msal token cache, wsl git auth."
type: skill
disable-model-invocation: false
user-invocable: true
tags: [git, credentials, gcm, oauth, github, gitlab, azure-devops, gpg, pass, keyring, wsl, security]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# Setup Git Credentials

Take a Linux (Ubuntu/Debian, WSL2 or native) Git setup from "PAT in the remote URL" to Git Credential Manager
(GCM) signing in to each host — GitHub, GitLab, Azure DevOps or any other HTTPS host — with credentials encrypted with
GPG + `pass`, and, for Azure DevOps, the Microsoft (MSAL) token cache in the Secret Service instead of a plain-text
file. SSH remotes carry no token and are left alone.

**Three rules hold for the whole skill:**

- **Never run `sudo`.** Anything that needs it is handed to the user as an exact command.
- **Never print or read a secret.** No token, password, PAT, client secret or credential-file contents in your output,
  your commands' output, or your notes. Redact before displaying (see step 2).
- **Confirm before every change you make yourself.** You may only change user-level Git configuration
  (`git config --global`, `git-credential-manager configure`, `git remote set-url`). If one fails — permissions,
  agent sandbox — report it and hand the command to the user; do not work around it.

`gcm-keyring-session.sh` lives next to this SKILL.md — call it by that path (`<skill-dir>` below).

## The parts

| # | Part | What it changes | Agent runs | User runs | Needs |
| - | ---- | --------------- | ---------- | --------- | ----- |
| 1 | Install GCM | `git-credential-manager` package, `credential.helper` | `git-credential-manager configure` | `apt` install of the `.deb` | — |
| 2 | Sign-in per host + clean remotes | per-host `credential.*` settings, remote URLs | `git config`, `git remote set-url` | OAuth app details (self-hosted GitLab), revoking PATs | 1 |
| 3 | Encrypted credential store | GPG key, `pass` store, `credential.credentialStore` | `git config` after the gate | `apt`, `gpg --full-generate-key`, `pass init` | 1 |
| 4 | Secure MSAL token cache — **Azure DevOps only** | D-Bus session + GNOME Keyring (Secret Service) | `--check` | `apt`, sourcing the script, `secret-tool` test | 1 |
| 5 | Auto-start in new shells — **with part 4** | a copy of the script + one rc line | — | copy + rc edit | 4 |

Part 3 is where GCM keeps every host's credential — GitHub and GitLab OAuth tokens, PATs, passwords. Part 4 is only
where Microsoft's sign-in library keeps Azure DevOps tokens. Fixing one does not fix the other.

## Steps

### 1. Ask whether this is WSL

Detect first, then ask — the user's answer wins:

```bash
grep -qi microsoft /proc/sys/kernel/osrelease && echo wsl                   # or WSL_DISTRO_NAME is set
[ -d /run/systemd/system ] && echo systemd                                 # systemd is PID 1
command -v apt-get >/dev/null && echo apt
```

Ask: "This looks like WSL[, without systemd]. Is that right?" On WSL without systemd expect part 4 to need the
bundled script, and expect no browser to open for OAuth unless WSLg or `wslu` provides one. On native Ubuntu with a
desktop, or WSL with `systemd=true`, Secret Service is often already there and part 4 reduces to a check. No
`apt-get` → say this skill covers Ubuntu/Debian only and stop.

### 2. Check what is already in place

Read-only. Run what applies and keep the results for steps 3–5:

```bash
git-credential-manager --version 2>/dev/null
git config --global --get-all credential.helper
git config --global --get-regexp '^credential\..+\.helper$'        # per-host helpers, e.g. gh / glab
git config --global --get-regexp '^credential\..*(credentialstore|authmodes|provider|azreposcredentialtype)$'
gpg --list-secret-keys --keyid-format LONG        # public key IDs only
test -s "${PASSWORD_STORE_DIR:-$HOME/.password-store}/.gpg-id" && echo pass-initialized
test -e ~/.git-credentials && echo plaintext-credentials-file
test -e ~/.local/.IdentityService/msal.cache && echo msal-cache-file
<skill-dir>/gcm-keyring-session.sh --check
```

`credential.helper` is a list, and an empty entry resets it: only the entries after the last empty one are in effect.

**Remotes — never run a bare `git remote -v`;** its output can contain the PAT. Use these two instead — one redacts,
one lists only the hosts:

```bash
git remote -v | sed -E -e 's#(https?://)[^/]*:[^/]*@#\1***:***@#' -e 's#(https?://)[^/:@]{20,}@#\1***@#'
git remote -v | sed -E -e 's#^[^\t]*\thttps?://([^/]*@)?([^/]+).*#https \2#' \
                       -e 's#^[^\t]*\t(ssh://)?[^@/]*@([^:/]+).*#ssh \2#' | sort -u
```

Classify each HTTPS remote by what the redacted output shows before the host:

- `***:***@` → **credential embedded** (user:PAT);
- `***@` → a 20+ character user name, **possibly a PAT** (GitHub's `ghp_…`, GitLab's `glpat-…`) — ask the user;
- a short name such as the Azure DevOps organization (`https://org@dev.azure.com/org/...`) → harmless.

Ask whether to scan other repositories too (for example everything under `~/projects`):
`find <dir> -maxdepth 3 -name .git -type d` and run both commands in each.

`--check` needs a Unix socket. If your sandbox blocks it ("Operation not permitted"), the result says nothing about
the machine — ask the user to run it (in Claude Code: `! <skill-dir>/gcm-keyring-session.sh --check`).

### 3. Ask which hosts, then which parts

**Hosts** — multi-select, pre-selected from the HTTPS hosts found in step 2:

- Azure DevOps (`dev.azure.com`, `*.visualstudio.com`)
- GitHub (`github.com`)
- GitLab.com
- Self-hosted GitLab — ask for the URL
- Other HTTPS host (Bitbucket, Gitea, …) — ask for the URL

**Parts** — multi-select. Offer parts 4 and 5 only if Azure DevOps is selected. Mark each part **done** when its
checks pass:

| Part | Done when |
| ---- | --------- |
| 1 | `git-credential-manager --version` prints a version and the effective `credential.helper` list ends with it |
| 2 | each selected host's settings (part 2 below) are present, no per-host helper overrides GCM unless the user keeps it, and no remote has an embedded credential |
| 3 | `.gpg-id` exists and `credentialStore` is `gpg` |
| 4 | `--check` exits 0 |
| 5 | the user's rc already sources the script |

Walk the selection in the order 1 → 5. If a selected part needs an unselected one that is not done (table above,
"Needs"), say so and ask whether to add it.

### 4. Walk the selected parts

After each hand-off, wait for the user to say it is done, then re-run that part's check before moving on.

#### Part 1 — Install GCM

Hand off (2.9.1 is the version this setup was proven on):

```bash
sudo apt update && sudo apt install -y curl git ca-certificates
curl -fL https://github.com/git-ecosystem/git-credential-manager/releases/download/v2.9.1/gcm-linux-x64-2.9.1.deb \
  -o /tmp/gcm.deb
sudo apt install /tmp/gcm.deb
```

If the user wants the latest release, look up its tag on the GitHub releases page or API and confirm an asset named
`gcm-linux-x64-<version>.deb` exists before handing off that URL. Then, after confirmation, run
`git-credential-manager configure` and `git-credential-manager --version`.

#### Part 2 — Sign-in per host and clean remotes

GCM recognizes Azure DevOps, GitHub and GitLab.com by host name; set only what differs from its default. Settings
scoped to a URL (`credential.https://host.<key>`) affect only that host. Each change after confirmation:

| Host | Set | Why |
| ---- | --- | --- |
| Azure DevOps | `git config --global credential.azreposCredentialType oauth` | OAuth tokens instead of GCM creating PATs |
| GitHub, browser available | nothing | GCM's default OAuth opens the browser |
| GitHub, no browser (plain WSL) | `git config --global credential.https://github.com.gitHubAuthModes device` | sign in with a code on any device |
| GitLab.com, browser available | nothing | GCM's default browser OAuth |
| GitLab.com, no browser | `git config --global credential.https://gitlab.com.gitLabAuthModes pat` | GitLab has no device flow; GCM prompts for a PAT once and stores it encrypted |
| Self-hosted GitLab | `git config --global credential.<url>.provider gitlab`, then see below | GCM cannot detect it by name |
| Other host | nothing | GCM prompts for the credential once and stores it |

**Self-hosted GitLab.** Ask whether an OAuth application for GCM is registered on that instance (an admin creates it
with redirect URI `http://127.0.0.1/` and scopes `read_repository write_repository`). If yes, set
`credential.<url>.gitLabDevClientId <application id>` yourself and hand off the secret so it never passes through you:

```bash
printf 'Client secret: '; stty -echo; read -r s; stty echo; echo
git config --global credential.<url>.gitLabDevClientSecret "$s"; unset s
```

If no OAuth app — or no browser — set `credential.<url>.gitLabAuthModes pat`; the user creates a PAT with
`read_repository`/`write_repository` scopes and pastes it at GCM's prompt on the first fetch.

**Helpers that bypass GCM.** If step 2 found `credential.https://github.com.helper` → `gh auth git-credential`, or a
`glab auth git-credential` helper for a GitLab host, those win over GCM for that host. Ask: keep the CLI's helper, or
use GCM? For GCM, after confirmation remove that host's entries:
`git config --global --unset-all credential.https://github.com.helper`.

**Clean remotes.** For each flagged remote, show the redacted URL and the clean one, and after confirmation rewrite
it without ever echoing the old URL:

```bash
git remote set-url <name> "$(git remote get-url <name> | sed -E 's#^(https?://)[^/]*@#\1#')"
git remote get-url <name>        # now clean — safe to show
```

Repeat with `--push` if `git config --get-all remote.<name>.pushurl` is set. Then tell the user: **revoke every PAT
that was in a URL or in `~/.git-credentials`** — it has been on disk in plain text; removing it from the URL does not
un-expose it:

- Azure DevOps → User settings → Personal access tokens
- GitHub → Settings → Developer settings → Personal access tokens
- GitLab → Preferences (User settings) → Access tokens

#### Part 3 — Encrypted credential store (GPG + `pass`)

Hand off `sudo apt install -y gnupg pass`. If step 2 found no secret key, hand off `gpg --full-generate-key`.

The user then needs their **primary** key ID for `pass init` — not the encryption subkey. Show how to recognize it
on this example listing (made-up IDs):

```text
$ gpg --list-secret-keys --keyid-format LONG
sec   rsa4096/1A2B3C4D5E6F7A8B 2026-01-15 [SC]
      0123456789ABCDEF0123456789ABCDEF01234567
uid                 [ultimate] Jane Doe <jane@example.com>
ssb   rsa4096/8B7A6F5E4D3C2B1A 2026-01-15 [E]
```

The ID after the `/` on the **`sec`** line (`1A2B3C4D5E6F7A8B` here) is the one to use. The `ssb` line is the
subkey — GPG picks it automatically. Hand off `pass init <PRIMARY_KEY_ID>` with the user's own ID from their
listing.

**Gate:** only when `.gpg-id` exists, and after confirmation:

```bash
git config --global credential.credentialStore gpg
git-credential-manager configure
```

Setting `credentialStore gpg` before `pass` is initialized breaks every Git sign-in, on every host.

#### Part 4 — Secure MSAL token cache (Azure DevOps)

Hand off:

```bash
sudo apt install -y dbus-x11 gnome-keyring libsecret-tools
. <skill-dir>/gcm-keyring-session.sh          # in the shell Git will run from
```

The script reuses a live session bus or the one saved by an earlier shell, starts `dbus-launch` only if neither is
reachable, and starts `gnome-keyring-daemon --components=secrets` only if no Secret Service owns the bus. It is
silent on success.

Then hand off the round-trip test, with a throwaway value, never a real password — `lookup` prints it back:

```bash
secret-tool store --label="GCM Test" app gcm-test     # type a dummy value
secret-tool lookup app gcm-test
secret-tool clear app gcm-test
```

GNOME Keyring may ask to create or unlock a keyring. On WSL that prompt needs WSLg; if no prompt can appear and the
store fails, stop part 4 here and tell the user — do not configure anything that depends on it.

#### Part 5 — Auto-start in new shells

Installed skill folders move between agents, so the rc line must not point into `<skill-dir>`. Find the shell with
`basename "$SHELL"` and hand off (shown for zsh; use `~/.bashrc` for bash):

```bash
mkdir -p ~/.local/share/setup-git-credentials
cp <skill-dir>/gcm-keyring-session.sh ~/.local/share/setup-git-credentials/
grep -qF 'setup-git-credentials/gcm-keyring-session.sh' ~/.zshrc ||
  echo '[ -f ~/.local/share/setup-git-credentials/gcm-keyring-session.sh ] && . ~/.local/share/setup-git-credentials/gcm-keyring-session.sh' >> ~/.zshrc
```

Every new terminal then joins the same session instead of starting new daemons. After `wsl --shutdown` the saved
session is gone; the next terminal starts a fresh one and the keyring may ask to be unlocked.

### 5. Verify

Report each line as passed or failed:

- `git config --global --get credential.credentialStore` → `gpg` (part 3)
- the effective `credential.helper` list ends with GCM (part 1; the exact value varies)
- each per-host setting from part 2 reads back as set
- **per selected host**, the user runs `git fetch` in a repo of that host. The first one signs in (browser, device
  code or PAT prompt); a **second** `git fetch` must complete with no prompt — the credential was stored.
- **Azure DevOps only:** the `secret-tool` round trip from part 4 returned the dummy value, and the Azure DevOps fetch
  (from a shell with the session — a new terminal if part 5 is done) completes without
  `cannot persist Microsoft authentication token cache securely` / `using plain-text fallback token cache`.

If the warning still appears: run `--check` from that same shell (user-side if your sandbox blocks sockets) and
repeat part 4. `credential.azreposUseMicrosoftSharedCache false` is **not** the fix — do not suggest it.

If a second fetch prompts again, the store is not saving: re-check part 3 (`.gpg-id`, `credentialStore`, and the
`GPG_TTY` pitfall below).

### 6. Remove plain-text leftovers

Only after step 5 passes. Hand off each that applies:

- `~/.git-credentials` exists → `rm ~/.git-credentials`. If `credential.helper` lists `store`, remove that entry
  after confirmation: `git config --global --unset credential.helper '^store$'`.
- `~/.local/.IdentityService/msal.cache` existed while the plain-text warning was showing → it may still hold tokens
  in plain text. `rm ~/.local/.IdentityService/msal.cache`; the next Azure DevOps fetch signs in once more and writes
  the cache to the keyring.
- Remind once more to revoke any PAT found in step 2, at the host's page listed in part 2.

## Known pitfalls

- **`gcm-linux_amd64.deb` returns 404** — that is not the asset name. Use `gcm-linux-x64-<version>.deb`.
- **`credentialStore gpg` does not silence the MSAL warning** — the Git credential store and the Microsoft token
  cache are separate (parts 3 and 4).
- **`credential.azreposUseMicrosoftSharedCache false` is not the fix** for the warning; a reachable Secret Service is.
- **Do not paste `eval "$(dbus-launch --sh-syntax)"` into `.zshrc`** — each terminal starts another bus and keyring.
  Source the bundled script instead (part 5).
- **GPG cannot prompt for the passphrase** (Git hangs, or gpg reports `Inappropriate ioctl for device`) → the user
  adds `export GPG_TTY=$(tty)` to their rc.
- **`gh auth setup-git` / `glab` silently take over** a host — their per-host helper beats the global GCM one (part 2).
- **Windows Credential Manager is not used.** Everything runs on the Linux side; this skill does not set up the
  Windows GCM bridge.
