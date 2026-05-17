---
name: zustand-state-management
description: Use when choosing React state management, migrating from Redux to Zustand, implementing middleware, or debugging stale selectors
---

# Zustand State Management

## Overview
Zustand won because it's API is a single function call. No providers, no reducers, no action types. But the simplicity hides sharp edges: selectors re-render when you get them wrong, middleware order matters, and splitting stores is an architectural decision, not a syntax choice.

## When to Use
- Choosing state management for a new React project
- Migrating from Redux or Context API that causes excessive re-renders
- Implementing persisted state (localStorage, AsyncStorage) with minimal boilerplate
- Building a shared store accessed outside React (WebSocket handlers, event listeners)

**Don't use when:** your state is purely server data — React Query/TanStack Query is designed for that. Don't use Zustand for form state — React Hook Form is purpose-built. Don't wrap every piece of state in Zustand — local `useState` for UI-only state is still correct.

## Core Workflow

**Step 1: Structure stores by domain, not by data type.** Don't create `useUserStore`, `usePostStore`, `useCommentStore` as separate flat stores — you'll end up with cross-store dependencies. Instead, group by bounded context: `useAuthStore` (user + session + permissions), `useFeedStore` (posts + comments + reactions). Within each store, prefer atomic selectors: `useAuthStore((s) => s.user.name)` not `useAuthStore((s) => s.user).name`. The latter re-renders when ANY user property changes. Use `shallow` comparator for object/array selectors: `useAuthStore((s) => [s.user.name, s.user.email], shallow)`.

**Step 2: Order middleware carefully — order IS the execution chain.** `create(devtools(persist(immer(store))))` — innermost runs first. The correct order: `immer` (wraps state mutations), `persist` (needs final state shape), `devtools` (outermost for inspecting actions). Never put `devtools` before `immer` — you'll see raw Immer proxies in DevTools instead of your state. When using `persist` with `partialize`, partialize BEFORE storage: `partialize: (state) => ({ token: state.token })` — only persist what needs to survive refresh.

**Step 3: Access stores outside React via `getState` and `setState`.** Zustand stores are vanilla JS stores. `useAppStore.getState()` reads without subscribing — perfect for WebSocket handlers, event callbacks, and inter-store communication. `useAppStore.setState({ online: false })` updates from outside React without a hook. Pattern for cross-store sync: `useAuthStore.subscribe((state) => useChatStore.getState().disconnect())` — keep stores decoupled but reactive.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Component re-renders on every store change | Replace `useStore((s) => s)` with atomic selectors. Add `shallow` for object/array returns. |
| State resets on page refresh | Add `persist` middleware with `partialize` to save only the critical keys to localStorage. |
| Nested state mutation is verbose without Immer | Add `immer` middleware: `set((state) => { state.user.name = newName })` — mutate directly. |
| Need Redux DevTools for debugging | Add `devtools` middleware. Wrap `set` calls: `set({ count: newCount }, false, 'increment')`. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Creating one giant store with 30+ properties | Split by domain. Every component subscribing to the giant store re-renders on any change. |
| `useStore()` without a selector | This subscribes to the ENTIRE store. Always pass a selector, even if it's just `(s) => s.oneThing`. |
| Async logic in `set` without handling loading/error states | Add `status` fields: `{ data: null, loading: true, error: null }`. Let components render all 3 states. |

## Red Flags
- More than 3 stores that call each other's `getState()` — you've created implicit coupling. Merge them or use a shared event bus.
- `useStore()` (no selector) appearing in the codebase — every store change triggers a re-render on that component
- `persist` middleware storing access tokens — localStorage is XSS-accessible; persist only non-sensitive UI state

**Zustand is a minimal API, but store architecture, selector precision, and middleware ordering are architectural decisions. Get them right early — retrofitting a split on a 30-property monolith store touches every component.**
