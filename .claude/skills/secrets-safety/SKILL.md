---
name: secrets-safety
description: Use when writing any bash command, script, or tool call that could touch credentials, API keys, passwords, or a designated secrets file (e.g. config.conf). Also use before proposing any operation that reads environment variables, config files, or external secrets stores.
---

# Secrets Safety

## Overview

Agents must never read, echo, or expose secrets. The sandbox filesystem restriction on the
designated secrets file is a structural safety net — it is not a substitute for correct
behavior. The rule is unconditional: if an operation requires a credential, the **user runs
it**, not the agent.

**Core principle:** Agents propose; users execute anything that touches secrets.

## Hard Rules (no exceptions)

1. **Never read the secrets file.** Do not write scripts that read `config.conf` (or the
   user's designated secrets file/folder). Not even to "just check a value." Not even with
   `-s` or suppressed output.

2. **Never echo secrets.** Do not print, log, or interpolate secrets into visible output.
   ```bash
   # FORBIDDEN
   PASSWORD=$(grep DECO_PASSWORD config.conf | cut -d= -f2)
   echo "Using password: $PASSWORD"

   # FORBIDDEN — value visible in process list / output
   curl -u "admin:$PASSWORD" http://...
   ```

3. **Suppress output of commands that may touch secrets.** If a script must pass a credential
   (because the user provided it inline), silence the output:
   ```bash
   # OK — secret never echoed, output suppressed
   curl -s -o /dev/null -d "password=..." http://...
   ```

4. **Credential-touching operations belong to the user.** Propose the exact command; let the
   user run it. Do not execute it on their behalf.

## What Counts as a "Secrets Source"

The user's secrets may live in any of these forms:

- **Single file** — e.g., `config.conf`
- **Folder** — e.g., `secrets/` (treat every file inside as secret)
- **File pattern** — e.g., `.env.*` (covers `.env.local`, `.env.production`, etc.)

The default is `config.conf`. The user may designate a different file, folder, or pattern.
Treat any file the user describes as containing credentials, tokens, or passwords with the
same rules — even if the sandbox does not explicitly block it. When in doubt, ask the user
which secrets source applies rather than guessing.

## Red Flags — STOP, you are about to violate this rule

- You are about to write `grep ... config.conf` in any script.
- You are about to assign a secret to a shell variable and then use it in a command.
- You are about to `echo`, `cat`, `printf`, or `log` a value that came from a config file.
- You are about to run a command that requires a credential on behalf of the user.
- You are thinking "the sandbox blocks it anyway, so it's fine."

**All of these mean: stop. Propose the operation. Let the user run it.**

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "The sandbox blocks config.conf reads anyway." | Structural protection is a fallback, not a license. Behavior must be correct regardless. |
| "I'm using `-s` so the output is suppressed." | Suppressing output doesn't make reading the file safe — the value is still in the agent's context. |
| "I need to verify the credential to help the user." | You do not. Propose the command; the user verifies. |
| "I'll assign to a variable but won't print it." | Variables in scripts can leak via `set -x`, error messages, or process lists. |
| "It's just a quick check." | No credential read is quick or safe. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reading secrets file to construct a curl command | Write the curl with a placeholder; tell the user to substitute the value themselves. |
| Echoing a secret "to confirm it loaded" | Never confirm by echoing. Trust that the user's credential file is correct. |
| Running `env` or `printenv` to debug auth issues | Ask the user to run it and share only the relevant non-secret variable names. |
| Passing secrets via command-line flags | Secrets in flags appear in process listings. Prefer environment variables the user exports, or stdin with `read -s`. |

## Integration

This skill is **REQUIRED** in all dev flows. Before any bash command or script is written,
verify it complies with the rules above.

**REQUIRED:** Reference this skill from `dev-flow` and any project setup skill.
