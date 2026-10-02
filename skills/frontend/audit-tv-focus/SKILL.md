---
name: audit-tv-focus
description:
  "Audit a component or screen for TV D-pad focus completeness, Magic Remote compatibility, and navigation correctness.
  Use when the user wants to verify a component is TV-ready."
type: skill
disable-model-invocation: false
user-invocable: true
tags: [smarttv, focus, audit, react, accessibility]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# TV Focus Audit

Audit a component or screen for TV focus and navigation correctness.

**Input**: Path to a component file, directory, or screen name. If omitted, ask.

---

## Steps

1. **Resolve the target**

   If no path provided, use **AskUserQuestion** to ask:

   > "Which component or screen do you want to audit? Provide a file path or screen name."

   Read all relevant files: the component, its CSS/Tailwind classes, and any hooks it uses for navigation.

2. **Run static analysis checks**

   Read the target files and check for each item below. Track findings per category.

   ### A. Focusability

   - [ ] All interactive elements have `tabIndex` or are natively focusable (`<button>`, `<a>`)
   - [ ] No interactive element uses `tabIndex={-1}` without a programmatic focus strategy
   - [ ] Non-interactive elements (divs, spans) used as buttons have `tabIndex={0}` + `role`
   - [ ] `role="button"` / `role="link"` present where semantic HTML is not used

   ### B. D-pad Navigation

   - [ ] `onKeyDown` (or equivalent) handles `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
   - [ ] `Enter` key triggers the same action as click/tap
   - [ ] `Backspace` / back button is handled where navigation back is expected
   - [ ] Focus never gets trapped in a dead end (modal/overlay has explicit close)
   - [ ] Focus restores to correct element after modal/overlay closes

   ### C. Focus Visibility

   - [ ] `:focus` CSS styles are defined (not removed with `outline: none` without replacement)
   - [ ] Focus indicator meets contrast requirements (visible on all backgrounds)
   - [ ] No `:focus-visible` used (not supported in Chromium 70 - use `:focus` instead)

   ### D. Hover-only Interactions

   - [ ] No functionality is gated behind `:hover` only
   - [ ] All hover effects have a `:focus` equivalent

   ### E. LG Magic Remote Compatibility

   - [ ] If pointer events (`pointermove`, `pointerdown`, `click`) are used: D-pad fallback exists
   - [ ] Input mode detection present if both hover and focus styles are used
   - [ ] `cursor: pointer` not assumed to always be visible
   - [ ] `:hover` styles used only as enhancement, not sole interaction method

   ### F. Focus Management Patterns

   - [ ] Initial focus is set explicitly on screen/modal mount
   - [ ] Focus order follows visual layout (logical reading order)
   - [ ] Large lists use focus virtualization or windowing to avoid DOM overload

3. **Check for known anti-patterns**

   Flag any of these directly:
   - `onClick` without `onKeyDown` Enter handler on a non-button element
   - `outline: none` or `outline: 0` without a replacement focus style
   - `:focus-visible` (unsupported in Chromium 70)
   - Hover-gated functionality with no focus equivalent
   - `document.activeElement` checks without null guards
   - `setTimeout` used for focus management without clear reason (fragile)

4. **Report findings**

   Format:

   ```text
   ## TV Focus Audit: <component name>

   ### Summary
   - Total issues: N (X critical, Y warnings, Z suggestions)

   ### Critical Issues (must fix)
   - [file:line] Description of issue + how to fix

   ### Warnings (should fix)
   - [file:line] Description

   ### Suggestions (nice to have)
   - Description

   ### Passed Checks
   - A. Focusability: all OK
   - C. Focus Visibility: all OK
   ...
   ```

5. **Offer to fix**

   After the report, ask:

   > "Want me to fix the critical issues?"

   If yes: fix only the reported issues, do not refactor surrounding code.

---

## Guardrails

- Only read files, never modify unless user confirms fixes
- Flag but do not auto-fix warnings - always ask
- Do not add features beyond what's needed to pass the checks
- LG Magic Remote section: only flag if pointer events are already in use - don't force Magic Remote support where it
  wasn't planned
