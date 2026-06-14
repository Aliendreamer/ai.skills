---
name: compact-tv-check
description: "Check code for Chromium 70 and TV platform compatibility issues (CSS, JS, APIs). Use when the user wants to verify code will work on target TV platforms."
type: skill
tags: [smarttv, compatibility, chromium, tizen, webos]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

Check code for compatibility issues with Chromium 70, Tizen, LG webOS, and Hisense TV platforms.

**Input**: File path, directory, or glob pattern. If omitted, ask.

---

## Steps

1. **Resolve the target**

   If no path provided, use **AskUserQuestion** to ask:
   > "Which file or directory do you want to check? You can provide a path or glob (e.g. src/components/)."

   Read all matching files. For directories, scan for `.tsx`, `.ts`, `.css` files.

2. **CSS Compatibility Checks** (scan `.css`, `.module.css`, Tailwind classes in JSX)

   Flag any use of:

   | Feature | Issue | Fix |
   |---------|-------|-----|
   | `clamp()` | Not in Chrome 70 (added 79) | Use calc() with min/max JS fallback |
   | `min()` / `max()` | Not in Chrome 70 (added 79) | Use calc() or JS |
   | `aspect-ratio` | Not in Chrome 70 (added 88) | Use padding-top % hack |
   | `gap` on flexbox | Not in Chrome 70 (added 84) | Use margins or `column-gap`/`row-gap` on grid |
   | `:focus-visible` | Not in Chrome 70 (added 86) | Use `:focus` |
   | `scroll-snap-*` | Unreliable in Chrome 70 | Use JS scroll management |
   | `subgrid` | Not supported | Use nested grids |
   | `backdrop-filter` | Not in Chrome 70 (flag-only in Chrome 70, stable later) | Avoid — not in Chrome 70 |
   | `content-visibility` | Not in Chrome 70 (added 85) | Remove or polyfill |
   | `@container` queries | Not in Chrome 70 (added 105) | Use media queries |
   | `color-mix()` | Not in Chrome 70 | Use static colors |
   | `overflow: clip` | Not in Chrome 70 | Use `overflow: hidden` |

   Also check Tailwind utility classes that map to unsupported CSS - e.g. `aspect-*`, `gap-*` on flex, `focus-visible:*`.

3. **JavaScript / TypeScript Compatibility Checks**

   Flag any use of:

   | Feature | Issue | Fix |
   |---------|-------|-----|
   | `?.` optional chaining | ES2020 - needs Babel transpile | Verify tsconfig target / Next.js transpiles this OK |
   | `??` nullish coalescing | ES2020 - needs transpile | Same - verify transpilation |
   | `??=` / `&&=` / `\|\|=` logical assignment | ES2021 | Needs transpile |
   | `Array.at()` | Not in Chrome 70 | Use bracket notation |
   | `Object.hasOwn()` | Not in Chrome 70 (added 93) | Use `Object.prototype.hasOwnProperty.call()` |
   | `structuredClone()` | Not in Chrome 70 (added 98) | Use JSON parse/stringify or lodash cloneDeep |
   | `crypto.randomUUID()` | Not in Chrome 70 (added 92) | Use a uuid library |
   | `queueMicrotask()` | Not in Chrome 70 (added Chrome 71) | Needs polyfill |
   | `Promise.allSettled()` | Not in Chrome 70 (added Chrome 70) | Needs polyfill |
   | `globalThis` | Not in Chrome 70 (added Chrome 71) | Needs polyfill |
   | Dynamic `import()` | OK in Chrome 70 | Fine |
   | `AbortController` | OK in Chrome 70 | Fine |
   | `ResizeObserver` | OK in Chrome 70 | Fine |
   | `IntersectionObserver` | OK in Chrome 70 | Fine |

4. **Browser API Checks**

   Flag use of APIs unavailable or unreliable on TV browsers:

   | API | Issue |
   |----|-------|
   | `localStorage` / `sessionStorage` | May be restricted or quota-limited on some TVs - handle errors |
   | `IndexedDB` | Available but may be slow - verify with try/catch |
   | `navigator.userAgent` for TV detection | Unreliable - use feature detection instead |
   | `window.screen.width/height` | May not reflect TV resolution accurately |
   | `navigator.connection` | Not available in Chrome 70 |
   | `Web Animations API` | Partially available - verify |
   | Pointer Lock API | Not relevant/available on TVs |
   | `devicePixelRatio` > 1 | TV is always 1:1 - safe to assume |

5. **Next.js / RSC Checks**

   - `'use client'` directives: verify they are placed correctly (top of file, before imports)
   - Browser APIs (`window`, `document`, `localStorage`) used in Server Components - flag these
   - `useEffect`/`useState` used without `'use client'` - flag
   - `next/image` usage: verify TV-appropriate `sizes` and no layout shift

6. **Report findings**

   Format:
   ```
   ## TV Compatibility Report: <path>

   ### Summary
   Files checked: N
   Issues found: N (X critical, Y warnings)

   ### Critical Issues (will break on Chromium 70)
   - [file:line] `clamp(...)` - not supported in Chrome 70. Fix: use calc() instead.

   ### Warnings (may cause issues)
   - [file:line] `localStorage` without error handling - may fail on Tizen.

   ### Info (verify these)
   - [file:line] Optional chaining `?.` - confirm Next.js transpiles to ES5 target.

   ### Clean
   - No CSS compatibility issues found in: ...
   ```

7. **Offer to fix**

   After the report, ask:
   > "Want me to fix the critical issues?"

   Fix only what's reported. Do not refactor unrelated code.

---

## Guardrails
- Flag, don't auto-fix without confirmation
- Note when Next.js/Babel transpilation likely handles an issue (mark as Info not Critical)
- For Tailwind: check the generated CSS meaning, not just class names
- Do not flag things that are genuinely supported in Chrome 70
