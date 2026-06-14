---
name: design-review
description:
  "Review implemented UI changes against the reference app (../<reference-app>) as a TV designer — visual consistency, focus
  styles, colors, fonts, spacing, and TV-specific UI conventions. Use after a bug fix or UI change."
type: skill
tags: [smarttv, design, ui, review, react]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# TV Design Review

Act as a TV UI designer reviewing the implementation against the reference app at `../<reference-app>`.

**Input**: File paths of changed components. If omitted, infer from recent git changes.

---

## Steps

1. **Identify changed files**

   If no paths provided, run:

   ```bash
   git diff --name-only HEAD
   ```

   Filter to UI files in `src/components/` and `src/app/`. If nothing, run:

   ```bash
   git diff --name-only
   ```

2. **Find reference equivalents**

   For each changed file:
   - Search `../<reference-app>/src/` for components with matching or similar names
   - Use Glob patterns like `../<reference-app>/src/**/*Login*`, `../<reference-app>/src/**/*Button*`, etc.
   - Read both the implementation file and the best-matching reference file
   - If no match found, check `../<reference-app>/src/` for overall layout and palette conventions

3. **Visual comparison checklist**

   ### A. Colors & Theme

   - [ ] Focus style uses `var(--hot-red)` — NEVER white or default blue
   - [ ] Background colors use correct CSS custom properties (`--bg-primary`, `--bg-surface`, etc.)
   - [ ] Text colors match reference palette (light on dark)
   - [ ] Error states use appropriate contrast colors

   ### B. Typography

   - [ ] All visible text is ≥ 24px (TV minimum — no exceptions)
   - [ ] Font weights and families consistent with reference
   - [ ] Line-height and letter-spacing appropriate for 10-foot reading distance

   ### C. Spacing & Layout

   - [ ] Padding and margin values are proportional to 1920×1080 scale
   - [ ] Layout structure (flex/grid direction, alignment) matches reference intent
   - [ ] Element sizing meets minimum focus target: 80px height for interactive elements
   - [ ] Critical content respects 5% safe-area inset from screen edges

   ### D. Focus Styles (TV-critical)

   - [ ] Flow buttons: red background (`var(--hot-red)`) when focused — no outline on buttons
   - [ ] Credential inputs: `outline: 3px solid var(--hot-red)` when focused
   - [ ] VKB keys: `outline: 3px solid var(--hot-red)` when focused
   - [ ] Toggle pills: `outline: 3px solid var(--hot-red)` on the pill only (not the whole row)
   - [ ] No `outline: none` without a replacement focus indicator
   - [ ] No `:focus-visible` (unsupported in Chromium 70 — use `:focus`)

   ### E. Component Structure

   - [ ] Component sections and hierarchy match reference (header, body, footer zones)
   - [ ] Animations are present where reference has them (transitions, fades)
   - [ ] No layout shifts during state transitions (loading → loaded)
   - [ ] Overlay/modal positioning matches reference (centered, bottom-anchored, etc.)

   ### F. TV UI Conventions

   - [ ] High contrast between foreground and background elements
   - [ ] Focused element is unmistakably highlighted — no subtle focus indicators
   - [ ] VirtualKeyboard always anchors to bottom (position: fixed; bottom: 0) — never full-screen
   - [ ] `input-mode-pointer` / `input-mode-dpad` body classes respected in CSS
   - [ ] `data-pointer-interactive` attribute present on interactive containers (for Magic Remote)

4. **Report findings**

   Format output as:

   ```text
   ## Designer Review: <component/screen name>

   ### Visual Match: <PASS | NEEDS WORK>

   ### Critical Visual Issues (must fix)
   - [file:line] Description — what it looks like vs what it should look like

   ### Style Suggestions (nice to have)
   - Description

   ### Reference Comparison
   - A. Colors: ✓/✗ <notes>
   - B. Typography: ✓/✗ <notes>
   - C. Spacing & Layout: ✓/✗ <notes>
   - D. Focus Styles: ✓/✗ <notes>
   - E. Component Structure: ✓/✗ <notes>
   - F. TV UI Conventions: ✓/✗ <notes>

   ### Reference file used: <path or "no match found">
   ```

5. **Offer to fix**

   After the report, if there are critical issues:

   > "Want me to fix the styling issues?"

   If yes: apply only the reported fixes — no surrounding refactors, no logic changes.

---

## Guardrails

- Compare visual/styling only — never change logic, data fetching, or navigation behavior
- Reference app (`../<reference-app>`) is a SPA — do NOT adopt its routing, state, or data patterns
- Focus styles MUST follow project convention: red (`var(--hot-red)`), never white or browser default
- VKB is always a bottom panel — flag any implementation that makes it full-screen
- If reference has no matching component, apply general TV UI conventions and flag it
- Only fix what was reported — no extra cleanup
