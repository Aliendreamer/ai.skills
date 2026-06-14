---
name: norigin-focus
description:
  "Audit Norigin useFocusable container calls for missing autoRestoreFocus, plus page-entry focus patterns,
  scroll-restoration timing, and StrictMode-safe guard refs in spatial-navigation TV apps."
type: skill
tags: [smarttv, focus, norigin, react]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# norigin-focus-restore

Audit `useFocusable` container calls and flag any that are missing `autoRestoreFocus: true`. Also audits page entry
focus patterns, scroll restoration timing, and StrictMode-safe guard refs.

## When to use

- After any file containing `useFocusable` is added or modified (mandatory quality gate)
- When creating a new screen, overlay, or component that wraps focusable children
- When reviewing a PR that touches components with `FocusContext.Provider`
- After any change to `usePageFocusEntry` callers or scroll restoration logic

---

## Rule 1 — autoRestoreFocus on containers

Any `useFocusable` call that is a **container** — meaning the same component also renders a `FocusContext.Provider` —
MUST include `autoRestoreFocus: true`.

**Persistent containers** (screens, nav bars, lists) MUST also include `saveLastFocusedChild: true`.

**If `autoRestoreFocus` is missing, focus is silently dropped when a focused child unmounts — leaving the user stuck
with no way to navigate on a TV remote.**

### Container vs leaf distinction

| Kind                     | Criteria                                                                 | Required options                                        |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| **Container**            | Renders `FocusContext.Provider value={focusKey}`                         | `autoRestoreFocus: true`                                |
| **Persistent container** | Container + stays mounted for lifetime of a screen                       | `autoRestoreFocus: true` + `saveLastFocusedChild: true` |
| **Leaf**                 | No `FocusContext.Provider` (ActionButton, ContentCard, CredentialInput…) | Neither required                                        |

### Known containers and required config

| Component                 | Type              | Required                                                    |
| ------------------------- | ----------------- | ----------------------------------------------------------- |
| `HomeScreen`              | Persistent        | `saveLastFocusedChild`, `trackChildren`, `autoRestoreFocus` |
| `TopNav` (main container) | Persistent        | `saveLastFocusedChild`, `autoRestoreFocus`                  |
| `VirtualList`             | Persistent        | `saveLastFocusedChild`, `autoRestoreFocus`                  |
| `ContentStripe`           | Persistent        | `saveLastFocusedChild`, `trackChildren`, `autoRestoreFocus` |
| `GraphqlErrorOverlay`     | Transient overlay | `autoRestoreFocus`                                          |
| `Toast`                   | Transient overlay | `autoRestoreFocus`                                          |
| `PlayerOverlay`           | Transient overlay | `autoRestoreFocus`                                          |
| `VirtualKeyboard`         | Transient overlay | `autoRestoreFocus`                                          |

---

## Rule 2 — TopNav entry-focus must match current route

**VIOLATION**: Calling `focusSelf()` on TopNav mount always focuses the first child (Home) by spatial coordinates.

**REQUIREMENT**: TopNav's mount-time focus effect MUST resolve the nav item whose route matches the current pathname and
call `setFocus(topNavItemFocusKey(matchingIdx))` directly.

```ts
// ✗ WRONG — always focuses Home (first child by spatial coords)
useEffect(() => {
  focusSelf();
}, [focusSelf]);

// ✓ CORRECT — highlights the active route item
useEffect(() => {
  const matchingIdx = navItemsRef.current.findIndex(
    ({ route }: { item: MainMenuItem; route: string | null }) => route !== null && route === pathnameRef.current,
  );
  if (matchingIdx !== -1) {
    setFocus(topNavItemFocusKey(matchingIdx));
    return;
  }
  focusSelf(); // fallback for routes without a nav item
}, [focusSelf]);
```

**Why this also matters for timing**: `setFocus()` (non-debounced) calls `setFocusDebounced.cancel()` internally.
TopNav's effect runs at T=0ms — before any `setTimeout` in the effects queue. This cancels Norigin's 300ms auto-restore
debounce from the previous screen's unmount cascade. Without this cancellation, any page-entry `setFocus` scheduled
before T+300ms would be overridden.

**Implementation notes**:

- Read `pathnameRef.current` and `navItemsRef.current` from refs (not from the closure deps) so the mount-only effect
  always sees the correct values for the current route mount.
- Sync refs inline in the render body (not via `useEffect`) to avoid `exhaustive-deps` violations:

  ```ts
  pathnameRef.current = pathname;
  navItemsRef.current = navItems;
  ```

---

## Rule 3 — `ready` gate must never permanently block

`usePageFocusEntry` accepts a `ready` prop that defers focus until data is available. If `ready` is gated on a value
that can be permanently null/falsy for some users, focus restoration is silently broken for those users.

```ts
// ✗ WRONG — permanently false when user has no library hero item
usePageFocusEntry({
  firstHeaderFocusKey: FocusKey.MyLibraryPlayButton,
  ready: !!headerItem,
});

// ✓ CORRECT — fires as soon as ANY content is available
usePageFocusEntry({
  firstHeaderFocusKey: FocusKey.MyLibraryPlayButton,
  firstStripeFocusKey: FocusKey.MyLibrary,
  ready: !!headerItem || folders.length > 0,
  pageScrollId: "my-library-rows",
});
```

**Why**: Home always has a featured hero item so `!!headerItem` was always true there. My Library may not — some users
have no featured library content. Always provide a fallback condition that becomes true once any content is loaded.

**Check**: For every `usePageFocusEntry` call with a `ready` prop, ask: "Is there any realistic user state where this
condition is permanently false?" If yes — add an OR fallback.

---

## Rule 4 — StrictMode-safe effect guard refs

Any `useRef` boolean guard set to `true` inside an effect MUST be reset to `false` in that effect's cleanup return
function in **ALL code paths** (not just one branch).

React StrictMode invokes effects twice on mount: run → cleanup → run. If the cleanup does not reset the guard, the
second run sees `ref.current === true` and bails out — restoration never executes in development, and bugs are hidden.

```ts
// ✗ WRONG — cleanup only in the scroll-restore path; fresh-visit path leaks the guard
useEffect(() => {
  if (!ready || hasPlacedFocusRef.current) return;
  hasPlacedFocusRef.current = true;

  if (savedPosition !== null && pageScrollId !== undefined) {
    const id1 = window.setTimeout(...);
    return () => {
      window.clearTimeout(id1);
      hasPlacedFocusRef.current = false; // ← present here
    };
  }

  const id = window.setTimeout(...);
  return () => {
    window.clearTimeout(id);
    // ← MISSING: hasPlacedFocusRef.current = false
  };
}, [ready]);

// ✓ CORRECT — every return path resets the guard
useEffect(() => {
  if (!ready || hasPlacedFocusRef.current) return;
  hasPlacedFocusRef.current = true;

  if (savedPosition !== null && pageScrollId !== undefined) {
    const id1 = window.setTimeout(...);
    return () => {
      window.clearTimeout(id1);
      hasPlacedFocusRef.current = false;
    };
  }

  const id = window.setTimeout(...);
  return () => {
    window.clearTimeout(id);
    hasPlacedFocusRef.current = false;
  };
}, [ready]);
```

**Check**: For every `useRef` boolean guard in an effect, grep for all `return () =>` branches in that effect and
confirm `ref.current = false` is present in each.

---

## Rule 5 — Three-phase scroll restoration timing

When restoring a saved scroll position in a virtualised list, focus cannot be set until the target card's DOM node is
registered with Norigin. Virtualised lists only render the visible window — the card may not be in the DOM yet when the
effect fires.

### The three phases

**Phase 1** (synchronous, in the effect body):

- Call `scrollVirtualizerTo(pageScrollId, savedPosition.rowIndex, "start")`
- Scrolls the outer VirtualList to bring the target stripe into view
- The stripe's VirtualList is not yet registered at this point

**Phase 2** (`setTimeout(0)` — after React flushes effects from Phase 1's scroll):

- Call `scrollVirtualizerTo("stripe-" + savedPosition.stripeId, savedPosition.scrollIndex, "start")`
- The target stripe is now rendered; scroll its inner rail to the target card
- The card's `useFocusable` hook has not yet run its registration effect

**Phase 3** (`setTimeout(AFTER_PHASE2_EFFECTS_MS)` — after Phase 2's effects settle):

- Call `setFocus(cardFocusKey(savedPosition.stripeId, savedPosition.itemId))`
- The card is now rendered and registered with Norigin

### Phase 3 delay — AFTER_PHASE2_EFFECTS_MS = 50ms

The delay is defined in `src/hooks/use-page-focus-entry.ts` as `AFTER_PHASE2_EFFECTS_MS = 50`.

**Why 50ms and not 350ms**: The original 350ms constant (`AFTER_NORIGIN_DEBOUNCE_MS`) was needed to beat Norigin's
internal `AUTO_RESTORE_FOCUS_DELAY = 300ms` debounce. But TopNav's entry-focus effect (Rule 2) fires at T=0ms and calls
`setFocus()` which **cancels** the pending debounce. Phase 3 therefore only needs to outlast React's
MessageChannel-based effect flush from Phase 2's scroll — typically 5–20ms on fast hardware, ~30ms on slow TV CPUs. 50ms
is a comfortable margin.

**When 350ms IS needed**: If a screen does NOT have a TopNav (or any component that calls `setFocus()` at T=0ms to
cancel the debounce), Phase 3 must still fire after T+300ms. In that case, use a constant named appropriately (e.g.
`AFTER_NORIGIN_DEBOUNCE_MS = 350`).

```ts
// Current value — safe because TopNav cancels debounce at T=0ms
const AFTER_PHASE2_EFFECTS_MS = 50;

// If TopNav is absent (no T=0 debounce cancellation), use this instead:
const AFTER_NORIGIN_DEBOUNCE_MS = 350; // must beat Norigin's 300ms debounce
```

### Implementation skeleton

```ts
let id2: number | null = null;
scrollVirtualizerTo(pageScrollId, savedPosition.rowIndex, "start"); // Phase 1
const id1 = window.setTimeout(() => {
  scrollVirtualizerTo("stripe-" + savedPosition.stripeId, savedPosition.scrollIndex, "start"); // Phase 2
  id2 = window.setTimeout(() => {
    setFocus(cardFocusKey(savedPosition.stripeId, savedPosition.itemId)); // Phase 3
  }, AFTER_PHASE2_EFFECTS_MS);
}, 0);
return () => {
  window.clearTimeout(id1);
  if (id2 !== null) window.clearTimeout(id2);
  hasPlacedFocusRef.current = false; // Rule 4
};
```

---

## Steps

### Step 1 — Find changed files with useFocusable

```bash
git diff --name-only HEAD | grep "src/"
```

Or for a full audit:

```bash
grep -rln "useFocusable" src/
```

### Step 2 — For each file, check if it is a container

```bash
grep -n "FocusContext.Provider" <file>
```

If `FocusContext.Provider` appears → it is a container → proceed to step 3. If not → leaf component → skip.

### Step 3 — Verify autoRestoreFocus is present (Rule 1)

```bash
grep -n "autoRestoreFocus" <file>
```

If absent → violation.

### Step 4 — For persistent containers, verify saveLastFocusedChild too (Rule 1)

```bash
grep -n "saveLastFocusedChild" <file>
```

Persistent containers are those that stay mounted for the lifetime of a screen (screens, nav bars, virtual lists,
content stripes). If absent → violation.

### Step 5 — Audit TopNav-style layout components (Rule 2)

For any component that:

- Remounts on every navigation (layout components wrapping `<Outlet />`)
- Contains a mount-only `focusSelf()` call

Check that the mount effect calls `setFocus(routeMatchingFocusKey)` instead of bare `focusSelf()`.

```bash
grep -n "focusSelf" <file>
```

If `focusSelf()` is called in a `useEffect` without a preceding route-match lookup → violation.

### Step 6 — Audit usePageFocusEntry `ready` gates (Rule 3)

```bash
grep -rn "usePageFocusEntry" src/
```

For each call site with `ready:`, ask: can the gating value be permanently null/falsy for any user? If yes — missing OR
fallback → violation.

### Step 7 — Audit effect guard refs for StrictMode safety (Rule 4)

```bash
grep -rn "hasPlacedFocusRef\|PlacedFocus\|focusFiredRef" src/
```

For each ref set to `true` inside an effect, count the `return () =>` branches. If any branch does not reset the ref →
violation.

### Step 8 — Audit setTimeout + setFocus timing (Rule 5)

```bash
grep -rn "setTimeout" src/ --include="*.ts" --include="*.tsx" -A3 | grep -B2 "setFocus"
```

For each hit, ask:

- Does the containing screen have a TopNav (or other T=0 debounce-cancelling component)? →
  `AFTER_PHASE2_EFFECTS_MS = 50` is safe
- No TopNav present? → Must use `AFTER_NORIGIN_DEBOUNCE_MS = 350` to beat Norigin's 300ms debounce
- Is the delay a raw number? → Replace with the appropriate named constant

### Step 9 — Report findings

**Clean:**

```text
✓ norigin-focus-restore — N containers checked, all rules pass
```

**Issues found:**

```text
✗ norigin-focus-restore — N violations

[Rule 1] src/components/ui/MyNewOverlay.tsx — Container missing autoRestoreFocus: true
Fix: add autoRestoreFocus: true to the useFocusable({ ... }) call

[Rule 1] src/components/home/NewScreen.tsx — Persistent container missing saveLastFocusedChild: true
Fix: add saveLastFocusedChild: true to the useFocusable({ ... }) call

[Rule 2] src/components/ui/SomeLayout.tsx — Mount effect calls focusSelf() without route-match lookup
Fix: resolve matching nav item by pathname and call setFocus(matchingFocusKey) before falling back to focusSelf()

[Rule 3] src/components/home/SomeScreen.tsx — ready gate uses !!headerItem only; permanently false when header is null
Fix: add OR fallback: ready: !!headerItem || rows.length > 0

[Rule 4] src/hooks/use-some-entry.ts — hasPlacedFocusRef not reset in all cleanup branches
Fix: add hasPlacedFocusRef.current = false to every return () => {} in the effect

[Rule 5] src/hooks/use-page-focus-entry.ts — raw number 300 in setTimeout before setFocus
Fix: use AFTER_PHASE2_EFFECTS_MS (50) or AFTER_NORIGIN_DEBOUNCE_MS (350) depending on whether TopNav is present
```

---

## Fix guidance

```ts
// ✗ VIOLATION — container missing autoRestoreFocus
const { ref, focusKey } = useFocusable({
  isFocusBoundary: true,
});

// ✓ CORRECT — transient overlay
const { ref, focusKey } = useFocusable({
  isFocusBoundary: true,
  autoRestoreFocus: true,
});

// ✓ CORRECT — persistent screen container
const { ref, focusKey } = useFocusable({
  focusKey: FocusKey.Home,
  saveLastFocusedChild: true,
  trackChildren: true,
  autoRestoreFocus: true,
});

// ✗ VIOLATION — TopNav mount effect using focusSelf (always focuses Home)
useEffect(() => {
  focusSelf();
}, [focusSelf]);

// ✓ CORRECT — TopNav mount effect using route-matched setFocus
useEffect(() => {
  const matchingIdx = navItemsRef.current.findIndex(
    ({ route }: { item: MainMenuItem; route: string | null }) =>
      route !== null && route === pathnameRef.current,
  );
  if (matchingIdx !== -1) {
    setFocus(topNavItemFocusKey(matchingIdx));
    return;
  }
  focusSelf();
}, [focusSelf]);

// ✗ VIOLATION — ready gate permanently false for users without hero content
usePageFocusEntry({ firstHeaderFocusKey: FocusKey.PlayButton, ready: !!headerItem });

// ✓ CORRECT — fires as soon as any content is available
usePageFocusEntry({
  firstHeaderFocusKey: FocusKey.PlayButton,
  firstStripeFocusKey: FocusKey.ScreenContainer,
  ready: !!headerItem || rows.length > 0,
  pageScrollId: "screen-rows",
});

// ✗ VIOLATION — guard ref not reset in all cleanup paths (StrictMode breaks)
useEffect(() => {
  if (!ready || hasPlacedFocusRef.current) return;
  hasPlacedFocusRef.current = true;
  const id = window.setTimeout(() => { ... }, 0);
  return () => { window.clearTimeout(id); /* missing reset */ };
}, [ready]);

// ✓ CORRECT — guard reset in every cleanup path
useEffect(() => {
  if (!ready || hasPlacedFocusRef.current) return;
  hasPlacedFocusRef.current = true;
  const id = window.setTimeout(() => { ... }, 0);
  return () => {
    window.clearTimeout(id);
    hasPlacedFocusRef.current = false;
  };
}, [ready]);
```

---

## Notes

- `autoRestoreFocus` uses Norigin's internal `setFocusDebounced` — it batches cascading unmounts in one render cycle so
  there is no double-restore risk.
- `AUTO_RESTORE_FOCUS_DELAY = 300` is hardcoded in `@noriginmedia/norigin-spatial-navigation-core/dist/index.cjs`
  line 227. It is not exposed in `init()`. Do not assume this value without re-checking when upgrading Norigin.
- Explicit `setFocus(key)` calls in event handlers are NOT replaced by this — they are intentional overrides and must
  stay.
- `isFocusBoundary: true` and `autoRestoreFocus: true` are independent — a boundary stops spatial nav from crossing its
  edges; auto-restore handles the unmount case.
- `setFocus()` (non-debounced) cancels `setFocusDebounced` internally — calling it at T=0ms (e.g. from a layout mount
  effect) eliminates the need to wait 350ms in Phase 3.
- `useScrollendEvent` from `@tanstack/react-virtual` is NOT viable: the `scrollend` DOM event requires Chrome 114+; our
  hard floor is Chromium 70. TanStack Virtual falls back to a ~150ms debounce on unsupported browsers, adding delay
  rather than removing it.
- React StrictMode double-invokes effects in development — all effect guard refs MUST be reset in cleanup so the second
  invocation behaves identically to the first.
