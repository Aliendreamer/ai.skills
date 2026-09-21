---
name: circular-check
description:
  "Detect circular imports in src/ and report any cycles with fix guidance. Use after a change session as a quality
  gate, when adding a module that imports several others, or when a dynamic import is used to break a cycle."
type: skill
disable-model-invocation: false
user-invocable: true
tags: [react-dev, quality, imports, architecture]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# Circular Dependency Check

Detect circular imports in `src/` and report any cycles with fix guidance.

## When to use

- After every `/opsx:apply` session (mandatory quality gate)
- When a new module is added that imports from multiple existing modules
- When a dynamic import is added as a cycle-breaking workaround — verify it was actually needed

---

## Steps

1. **Run the check**

   ```bash
   pnpm check:circular
   ```

   This runs:

   ```text
   madge --circular --extensions ts,tsx --ts-config tsconfig.json src/
   ```

   - TypeScript path aliases (`@/`) are resolved via `tsconfig.json`
   - Dynamic `import()` calls ARE tracked as edges — if a dynamic import forms a cycle, it is still reported
   - `src/gql/__generated__/` follows a one-way import pattern and will not produce cycles

2. **Interpret results**

   **No cycles:**

   ```text
   ✔ No circular dependency found!
   ```

   Report: "✓ No circular imports — N files checked."

   **Cycles found:**

   ```text
   ✖ Found N circular dependencies!
   1) lib/a.ts > lib/b.ts > lib/a.ts
   ```

   For each cycle, report it and suggest a fix (see below).

3. **Fix guidance — for each reported cycle**

   ### Option A — Extract the shared dependency (preferred)

   The cleanest fix: identify what `b.ts` needs from `a.ts` (or vice versa) and move it to a third file `c.ts` that
   neither imports. Then both `a.ts` and `b.ts` import from `c.ts`.

   Common pattern: types/interfaces that are needed by both sides → extract to a `*-types.ts` file.

   ```text
   Before: a.ts ↔ b.ts (cycle)
   After:  a.ts → c.ts ← b.ts (no cycle)
   ```

   ### Option B — Restructure module boundaries

   If the cycle reveals that two modules are too tightly coupled, consider merging them into one or reorganising the
   dependency direction so it flows one way.

   ### Option C — Dynamic import (last resort only)

   A dynamic `import()` breaks the static import graph but does NOT eliminate the runtime coupling. Use only when:
   - The import is genuinely lazy (not needed at module initialisation time)
   - Options A and B were considered and ruled out
   - **The dynamic import MUST carry an explanatory comment:**

   ```ts
   // Dynamic import: breaks the static cycle between device.ts and auth.ts.
   // _getStoredDeviceId is only called inside an async function, never at
   // module load time, so the deferred resolution is safe.
   const { _getStoredDeviceId } = await import("@/lib/db/auth");
   ```

   Without this comment, the next developer will not understand why dynamic import was used and may remove it,
   re-introducing the cycle.

4. **Report format**

   **Clean:**

   ```text
   ✓ circular-check — No circular imports (77 files checked)
   ```

   **Issues found:**

   ```text
   ✗ circular-check — N cycles detected

   Cycle 1: lib/api/config.ts → lib/api/config-parser.ts → lib/api/config.ts
   Fix: Extract AppConfig/MainMenuItem to lib/api/config-types.ts

   Cycle 2: ...
   ```

---

## Notes

- **madge tracks dynamic imports** — they are not an automatic exemption. If a dynamic import creates a cycle, it must
  still be resolved unless Option C is justified and documented.
- **Type-only imports (`import type`) also form cycles** in madge's graph. The fix is the same: extract the shared type
  to a neutral file.
- The `check:circular` script is defined in `package.json`. Do not inline the madge command — use the script so the
  flags stay in one place.
