---
name: react-server-components
description: Use when splitting Server and Client Components, debugging RSC serialization errors, or deciding which component type to use for a given boundary
---

# React Server Components

## Overview
React Server Components (RSC) aren't a rendering mode — they're a component model. Server Components run once on the server, never hydrate, and can access databases directly. Client Components run on both server (SSR) and client (hydration). The boundary between them is the most consequential architectural decision in a Next.js App Router codebase.

## When to Use
- Migrating from Pages Router to App Router and need an RSC mental model
- Deciding whether a component should be Server (default) or Client (`"use client"`)
- Debugging "Cannot import server-only module into Client Component" errors
- Composing Server Components inside Client Components via the `children` pattern

**Don't use when:** you're on Pages Router — RSC only works with App Router. Don't force every component to be a Server Component — interactivity requires Client Components.

## Core Workflow

**Step 1: Default to Server, opt in to Client.** Every component in App Router is a Server Component by default. Add `"use client"` only when you need: event handlers (`onClick`, `onChange`), hooks (`useState`, `useEffect`, custom hooks that use these), browser APIs (`window`, `document`, `localStorage`), or React Context (Context only works in Client Components). The directive creates a client boundary — all imports in that file and its transitive imports become Client Components too. Push `"use client"` as far down the tree as possible.

**Step 2: Pass Server data to Client Components through props.** Server Components can `await` database queries and pass the result as serializable props to Client Components. RSC props must be serializable: strings, numbers, booleans, objects (plain), arrays, JSX. Functions cannot cross the boundary — no callbacks from Server to Client. Pattern: Server Component fetches data, passes it to Client Component as props, Client Component handles interactivity.

**Step 3: Compose Server Components inside Client Components with the `children` slot.** Client Components cannot directly import Server Components — but they CAN render them via `children` (React Node) or render props. Pattern: `function ClientWrapper({ children }) { return <div onClick={...}>{children}</div> }`. The parent renders `<ClientWrapper><ServerWidget /></ClientWrapper>`. The Server Component renders on the server and the result is passed to the Client Component as a pre-rendered slot — no serialization needed.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Server Component importing a Client Component that uses `useState` | It works — Server Components CAN import Client Components. Client CANNOT import Server. |
| "Cannot import server-only module" error in Client Component | Move the server-only import (DB, fs) to a Server Component. Pass the data as props to the Client Component. |
| Client Component needs Context to wrap children | Create a Client boundary at the layout level. Children below it can still be Server Components. |
| Page is fully static but needs a counter button | Push `"use client"` to just the Counter component. The rest of the page stays server-rendered. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Adding `"use client"` at every page level out of caution | This opts the entire tree into client rendering. Add it only to the leaf interactive components. |
| Passing a Date object as a prop to a Client Component | Date isn't serializable. Pass ISO strings: `post.createdAt.toISOString()`. Re-hydrate in the client. |
| Creating a Context Provider at the root layout and expecting Server Components to consume it | Context does not work in Server Components. Pass data as props or use a Client wrapper with `children`. |

## Red Flags
- `"use client"` at the top of `layout.tsx` — the entire route tree from that point down is client-rendered
- Complex function props being passed from Server to Client (like `onSubmit(data)`) — move the mutation to a Server Action, pass only the action reference
- 50+ `"use client"` directives in a codebase — likely many should be Server Components refactored to pass data as props

**Server Components are the default. `"use client"` is an escape hatch, not the starting point. Every Client boundary you add shrinks the amount of code that never ships to the browser.**
