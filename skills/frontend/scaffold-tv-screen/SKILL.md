---
name: scaffold-tv-screen
description:
  "Scaffold a new TV screen with proper focus management, D-pad navigation, Magic Remote awareness, and RSC/client
  split. Use when the user wants to create a new screen or page for the TV app."
type: skill
disable-model-invocation: false
user-invocable: true
tags: [smarttv, scaffold, react, focus]
agents: [claude, codex, cursor, gemini, copilot]
version: 0.1.0
author: Aliendreamer
---

# Scaffold a TV Screen

Scaffold a new TV screen with all boilerplate for focus management, D-pad navigation, and LG Magic Remote support.

**Input**: Screen name and type. If omitted, ask.

---

## Steps

1. **Gather requirements**

   If not provided, use **AskUserQuestion** to ask:

   > "What screen do you want to create? Tell me:
   >
   > 1. Screen name (e.g. 'HomeScreen', 'MovieDetail', 'SettingsMenu')
   > 2. Screen type: content-grid, content-detail, menu/settings, player, or other
   > 3. Does it need GraphQL data? If yes, what data roughly?
   > 4. Any specific navigation requirements? (e.g. modal, fullscreen overlay, sidebar)"

2. **Determine file structure**

   Based on screen name and Next.js App Router conventions:
   - Page: `src/app/<route>/page.tsx` (Server Component)
   - Screen component: `src/components/screens/<ScreenName>/index.tsx` (Client Component)
   - Sub-components: `src/components/screens/<ScreenName>/<Part>.tsx`
   - Types: `src/components/screens/<ScreenName>/types.ts` if needed

3. **Scaffold the files**

   ### Server Component Page (`page.tsx`)

   ```tsx
   // src/app/<route>/page.tsx
   import { <ScreenName> } from '@/components/screens/<ScreenName>'
   // GraphQL fetch if needed (server-side)

   export default async function <ScreenName>Page() {
     // const data = await fetchData() -- if GraphQL needed
     return <<ScreenName> /* data={data} */ />
   }
   ```

   ### Client Screen Component

   The main screen must be a Client Component and include:

   **Required hooks/utilities to include:**
   - `useTVNavigation` hook (or inline the pattern if hook doesn't exist yet)
   - Input mode detection for Magic Remote
   - Initial focus on mount (`useEffect` + `ref.focus()`)
   - Back button handler (`Backspace` key)

   **Template structure:**

   ```tsx
   'use client'

   import { useEffect, useRef, useCallback } from 'react'

   // Input mode detection - toggle body class for LG Magic Remote
   // body.input-mode-dpad   → D-pad active, show :focus styles
   // body.input-mode-pointer → Magic Remote active, show :hover styles
   function useInputMode() {
     useEffect(() => {
       const onKey = () => {
         document.body.classList.remove('input-mode-pointer')
         document.body.classList.add('input-mode-dpad')
       }
       const onPointer = () => {
         document.body.classList.remove('input-mode-dpad')
         document.body.classList.add('input-mode-pointer')
       }
       document.addEventListener('keydown', onKey)
       document.addEventListener('pointermove', onPointer)
       // Set initial mode
       document.body.classList.add('input-mode-dpad')
       return () => {
         document.removeEventListener('keydown', onKey)
         document.removeEventListener('pointermove', onPointer)
       }
     }, [])
   }

   interface Props {
     // Add props based on screen type
   }

   export function <ScreenName>({ ...props }: Props) {
     useInputMode()
     const firstFocusRef = useRef<HTMLElement>(null)

     // Set initial focus on mount
     useEffect(() => {
       firstFocusRef.current?.focus()
     }, [])

     // Handle back button
     const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
       if (e.key === 'Backspace') {
         e.preventDefault()
         // handle back navigation
       }
     }, [])

     return (
       <div
         className="relative w-full h-full bg-black"
         onKeyDown={handleKeyDown}
       >
         {/* Screen content here */}
       </div>
     )
   }
   ```

   **Content-grid screens** additionally include:
   - Row-based grid layout with horizontal D-pad within rows
   - Vertical D-pad between rows
   - Focus tracking for selected row/column indices

   **Content-detail screens** additionally include:
   - Hero section (non-interactive, large text)
   - Action buttons row (Play, Add to List, etc.) - horizontal nav
   - Metadata section below

   **Menu/settings screens** additionally include:
   - Vertical list navigation
   - Highlighted selected item
   - Optional sub-menu panel with trapped focus

   **Player screens** additionally include:
   - Controls overlay (auto-hide after timeout)
   - Progress bar (left/right to scrub)
   - Focus auto-returns to play/pause on idle

4. **Tailwind classes to use (TV-safe)**

   Always use:
   - Text: `text-2xl` minimum (24px), `text-3xl`+ for headings
   - Spacing: generous padding (TV safe area - `px-[5vw] py-[5vh]` for screen edges)
   - Focus: `focus:outline-none focus:ring-4 focus:ring-white` or custom ring color
   - Interactive items: min height `h-20` (80px) or larger
   - Avoid: `aspect-*` classes, `gap-*` on flex containers (use `space-x-*`/`space-y-*` instead)

5. **Create an index export**

   If a barrel `src/components/screens/index.ts` exists, add the export. If not, skip.

6. **Summary**

   After scaffolding, output:

   ```text
   ## Scaffolded: <ScreenName>

   Files created:
   - src/app/<route>/page.tsx        (Server Component)
   - src/components/screens/<Name>/index.tsx  (Client Component)

   Features included:
   - Input mode detection (D-pad + LG Magic Remote)
   - Initial focus on mount
   - Back button (Backspace) handler
   - [content-grid: row/column navigation]
   - [GraphQL: data fetch in page.tsx]

   Next steps:
   - Run /tv:focus-audit on the new screen
   - Add your content and GraphQL query
   - Test D-pad navigation flow
   ```

---

## Guardrails

- Always include `useInputMode` for Magic Remote awareness
- Always set initial focus explicitly - never rely on browser default
- Always have a back button handler
- Use Server Component for the page, Client Component for the interactive screen
- Follow Chromium 70 CSS constraints (no clamp, no aspect-ratio, etc.)
- Do not over-scaffold - only include boilerplate relevant to the screen type
- If a screen-type-specific pattern is unclear, ask before scaffolding
