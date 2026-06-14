---
name: use-effect-guard
description:
  "Audit useEffect calls in src/ and flag any that are not synchronizing with an external system. Use after a change
  session as a quality gate, or when adding/reviewing components that use useEffect."
type: skill
tags: [react-dev, quality, hooks, react]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# useEffect Guard

Audit `useEffect` calls in `src/` and flag any that are not synchronizing with an external system.

## When to use

- After every `/opsx:apply` session (mandatory quality gate)
- When adding or modifying a component that uses `useEffect`
- When reviewing a PR that introduces new `useEffect` calls

---

## The rule

`useEffect` is **only** for synchronizing with an external system — something that lives outside the React rendering
model and cannot be expressed as derived state or an event handler.

**If you cannot name the external system, the `useEffect` does not belong.**

---

## Allowed categories

### 1. Third-party library control

Libraries that have their own internal state machine (e.g. Norigin spatial navigation).

```ts
// ✓ Syncing Norigin focus library on mount
useEffect(() => {
  focusSelf();
}, [focusSelf]);

// ✓ Restoring Norigin focus after a modal closes
useEffect(() => {
  if (wasOpenRef.current && !keyboardOpen) {
    focusSelf();
  }
  wasOpenRef.current = keyboardOpen;
}, [keyboardOpen, focusSelf]);
```

### 2. Browser event listeners

`window` / `document` listeners that must be registered imperatively and cleaned up on unmount.

```ts
// ✓ Global keydown handler for TV Back button
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      onBack();
    }
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [onBack]);
```

### 3. Browser DOM APIs

APIs that require a rendered DOM node: `scrollIntoView`, `focus()`, `IntersectionObserver`, `ResizeObserver`, canvas,
WebGL.

```ts
// ✓ Scroll focused item into view
useEffect(() => {
  if (focused && ref.current) {
    ref.current.scrollIntoView({ behavior: "auto", block: "nearest" });
  }
}, [focused, ref]);
```

### 4. Browser timers

`setInterval` / `setTimeout` where the timer IS the mechanism (not a workaround for missing state).

```ts
// ✓ Clock tick
useEffect(() => {
  const id = setInterval(() => setTime(format(new Date(), "HH:mm")), 60000);
  return () => clearInterval(id);
}, []);
```

### 5. External API / service requests on mount

Network requests that need `AbortController` cleanup.

```ts
// ✓ Start device-code auth flow on mount
useEffect(() => {
  const controller = new AbortController();
  const run = async () => {
    try {
      await startDeviceCode({ signal: controller.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      setError(true);
    }
  };
  void run();
  return () => controller.abort();
}, []);
```

### 6. DOM ref registration with an external singleton

Passing a DOM ref to a module-level singleton that cannot receive it another way.

```ts
// ✓ Register accessibility live region ref
useEffect(() => {
  setLiveRegionRef(ref.current);
  return () => setLiveRegionRef(null);
}, []);
```

---

## Banned patterns

### ✗ Derived state

State whose value is fully determined by existing props or state. Compute in render or `useMemo`.

```ts
// ✗ BANNED — derived state in useEffect
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✓ CORRECT — compute in render
const fullName = `${firstName} ${lastName}`;

// ✓ CORRECT — expensive computation
const fullName = useMemo(() => expensiveFormat(firstName, lastName), [firstName, lastName]);
```

### ✗ Responding to an event

State that should change in response to a user action belongs in the event handler, not in an effect.

```ts
// ✗ BANNED — reacting to prop-driven toggle via effect
useEffect(() => {
  if (submitted) {
    setCount((c) => c + 1);
  }
}, [submitted]);

// ✓ CORRECT — update in the handler that sets submitted
const handleSubmit = () => {
  setSubmitted(true);
  setCount((c) => c + 1);
};
```

### ✗ Zustand store mutation driven by prop/state change

If a store needs to update when a prop changes, drive the store from the event handler that triggers the prop change.
Never use `useEffect` as a reactive bridge between React state and a Zustand store.

```ts
// ✗ BANNED — reactive bridge to Zustand
useEffect(() => {
  useAuthStore.setState({ token });
}, [token]);

// ✓ CORRECT — set store in the event handler that produces token
const onLoginSuccess = (token: string) => {
  setToken(token); // local state if needed
  useAuthStore.setState({ token }); // store update in the same handler
};
```

### ✗ Syncing two pieces of React state

Two state slices that must stay in sync indicate a single-source-of-truth problem. Merge them or derive one from the
other.

```ts
// ✗ BANNED
useEffect(() => {
  setIsEmpty(value.length === 0);
}, [value]);

// ✓ CORRECT
const isEmpty = value.length === 0;
```

---

## Steps

1. **Find all useEffect calls in the changed files**

   ```bash
   grep -n "useEffect" <file-path>
   ```

   Or for the full changed scope:

   ```bash
   git diff --name-only HEAD | xargs grep -ln "useEffect"
   ```

2. **For each `useEffect`, ask: what is the external system?**

   - Can it be named? (Norigin, window, IndexedDB, fetch, DOM ref) → ALLOWED
   - Is it responding to a state/prop change to update another state? → BANNED (derived state or event handler)
   - Is it bridging React state to a Zustand store? → BANNED (put in event handler)

3. **Report findings**

   **Clean:**

   ```text
   ✓ use-effect-guard — N useEffect calls checked, all syncing external systems
   ```

   **Issues found:**

   ```text
   ✗ use-effect-guard — N violations

   [src/components/Foo.tsx:42] Derived state — setFull computed from firstName + lastName
   Fix: const full = `${firstName} ${lastName}` in render body

   [src/store/use-bar-store.ts:17] Zustand bridge — useEffect updates store when prop changes
   Fix: move store update into the event handler that changes the triggering prop
   ```

4. **Fix guidance for each violation**

   | Pattern                 | Fix                                                               |
   | ----------------------- | ----------------------------------------------------------------- |
   | Derived state           | Compute inline in render; `useMemo` only for expensive transforms |
   | Event-driven state      | Move update into the event handler                                |
   | Zustand reactive bridge | Move `setState` call into the event handler                       |
   | Sibling state sync      | Single source of truth; derive the second value                   |

---

## Step 0 — Scan for eslint-disable (check this FIRST)

Before auditing `useEffect` logic, search for any eslint-disable comments in the files:

```bash
grep -n "eslint-disable" <file-path>
```

**`eslint-disable` comments are BANNED in all hand-written source files.** They silence the linter without fixing the
underlying problem.

| Kind                                                                                  | Verdict                           | Action                                                                                 |
| ------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `/* eslint-disable */` in `src/gql/__generated__/`                                    | Exempt                            | Auto-generated by codegen — leave as-is                                                |
| `// eslint-disable-next-line react-hooks/exhaustive-deps`                             | **BANNED**                        | Fix the deps with `useCallback`/`useMemo`/`useRef`                                     |
| `// eslint-disable-next-line @next/next/no-img-element`                               | **BANNED**                        | Disable the rule project-wide in `eslint.config.mjs` with a reason if genuinely needed |
| Fake rule names (e.g. `react-hooks/incompatible-library`, `react-hooks/immutability`) | **BANNED** — no-op AND misleading | Remove the disable; convert reasoning to a plain `//` comment if still useful          |
| Any other `eslint-disable` in `src/`                                                  | **BANNED**                        | Read the rule docs and fix the code                                                    |

Report any `eslint-disable` violations before proceeding to `useEffect` logic review.

---

## Notes

- `useEffect(fn, [])` (empty deps) is NOT automatically suspicious — many legitimate mount-time external syncs use it.
  Check what `fn` does.
- If ESLint warns about missing deps (`react-hooks/exhaustive-deps`), the fix is **always** one of:
  - Wrap the function in `useCallback` with correct deps and add to effect deps
  - Capture a mount-time-only value in `useRef` so it never needs to be in deps
  - Restructure to put the logic in an event handler instead
  - Never silence with `eslint-disable`
- Animation sequencing with `setTimeout` is allowed when the timer itself IS the mechanism (e.g. a fade-out delay before
  unmount). It is NOT allowed as a workaround for flaky state timing.
- The Norigin `focusSelf()` pattern on mount (`useEffect(() => { focusSelf() }, [focusSelf])`) is the established
  project convention — do not flag it.
