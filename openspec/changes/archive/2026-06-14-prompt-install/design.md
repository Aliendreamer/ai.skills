## Context

Skills install as file/folder copies. Prompts can't: each agent expects its own
prompt/command format (verified 2026-06). The canonical store item is `prompts/<id>/PROMPT.md`
(frontmatter + body). The catalog entry already carries `description`, so rendering needs only the
body plus that description — no YAML parser required at install time.

## Goals / Non-Goals

**Goals:**
- Pure, tested prompt destination resolution + rendering in both runtimes.
- `installPrompt` that reads `PROMPT.md`, strips frontmatter to the body, renders per agent, and
  writes to the resolved path.
- Both CLIs' `add` install prompts; mixed skill/prompt + agent batches don't abort on one failure.

**Non-Goals:**
- Parsing arbitrary frontmatter (only strip it; description comes from the catalog entry).
- `update`/`remove`; publishing.

## Decisions

- **Description from the catalog entry, body by stripping frontmatter.** Avoids adding a YAML
  parser to `libs/install` / a C# YAML dep. `stripFrontmatter`: if the file starts with `---`,
  drop through the next `---` line; the remainder is the body.
- **Three render formats**: `md` (body only), `copilot` (`---\ndescription: …\n---\n\n` + body),
  `toml` (`description = "<escaped>"` + `prompt = """<body>"""`). TOML escapes `\` and `"` in the
  description; the body uses a multiline basic string (assumes no literal `"""`, true for our
  content).
- **Adapter table** mirrors the skills adapter: agent → { scopes, dest(scope,id,bases), format }.
  Asymmetries: **codex = global only** (rejects project); all five agents support prompts.
- **`add` dispatches by type**: skill → `installSkill`, prompt → `installPrompt`. Each item runs
  in a try/catch; result status is `installed` or `failed` (with message). The "deferred" status
  is removed.
- **Parity**: identical destinations/rendering in TS and C#; xUnit scenarios mirror the vitest
  ones so the two implementations stay aligned.

## Risks / Trade-offs

- [Body containing `"""`] → would break gemini TOML; not present in our content; documented. Could
  switch to escaped single-line if it ever matters.
- [Two implementations drift] → mirrored tests pin both to the spec scenarios.
- [Repo not published] → live fetch still untested; rendering/destination/strip are pure and
  fully unit-tested; install uses temp dirs.

## Open Questions

- Whether to later let `add` pick per-item agents (e.g. a skill to claude and a prompt to gemini
  in one run). For now one `--agent` applies to the batch; unsupported combos fail per item.
