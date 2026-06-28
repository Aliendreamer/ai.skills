## Context

The skill catalog (`ai.skills`) ships discipline and audit skills consumed by Claude Code
agents. Before this change, no skill enforced agent behavior around credential handling at
runtime, and the harness audit skill (`llm-setup-audit`) only covered secrets leaking into
committed settings files — not whether the secrets *source* itself was gitignored.

The sandbox filesystem restriction on `config.conf` provides structural protection but is
not a behavioral contract: agents could still author scripts that would read secrets if the
sandbox were absent or misconfigured.

## Goals / Non-Goals

**Goals:**
- Define a secrets-safety discipline skill that agents MUST follow when writing bash or tool calls
- Generalize "secrets file" to cover files, folders, and glob patterns (`.env.*`)
- Wire secrets-safety as a mandatory reference in dev-flow
- Extend llm-setup-audit with a gitignore check for secrets sources and a cross-reference to secrets-safety

**Non-Goals:**
- Automated scanning/enforcement (static analysis, CI gates) — out of scope for this change
- Covering application-level secrets management (env vars in deployed services) — that is web-security-audit's domain
- Defining which specific file is the secrets source per project — that stays a user configuration decision

## Decisions

**Separate skills over a merged skill**
`llm-setup-audit` is a one-time audit (when does the harness configuration look correct?);
`secrets-safety` is a runtime discipline (what must agents do on every bash invocation?).
Merging would blur trigger conditions and reduce discoverability for both. They cross-reference
instead.

**Agents propose; users execute credential-touching operations**
The hardest guarantee is behavioral, not mechanical. Rather than trying to detect and block
all secret reads, the rule is: if a credential is needed, the agent writes the command and
the user runs it. Simple, unambiguous, and resistant to rationalization.

**"Secrets source" as a concept, not a single filename**
`config.conf` is the default but projects vary. The skill defines three forms (file, folder,
glob pattern) and tells agents to ask when unsure, rather than hardcoding a filename.

## Risks / Trade-offs

[Skills are not enforced mechanically] → Agents can still violate the rules; the skill
provides behavioral guidance, not a technical block. Mitigation: rationalization table and
red flags in the skill body are designed to resist common escape routes.

[llm-setup-audit Check 10 requires knowing the secrets source] → The check instructs agents
to ask the user if unsure. No automated detection of "what is this project's secrets source."

## Open Questions

None — implementation is complete.
