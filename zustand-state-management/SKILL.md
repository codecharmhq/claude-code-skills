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

**GOOD:**
```ts
// Atomic selectors with shallow comparator — minimum re-renders
const name = useAuthStore((s) => s.user.name);                    // primitive selector
const [name, email] = useAuthStore(                                // multi-value: shallow
  (s) => [s.user.name, s.user.email],
  shallow
);
// name changes: only this component re-renders.
// other user fields change: this component does NOT re-render.
```

**BAD:**
```ts
// Full store subscription — re-renders on every single change
const state = useAuthStore();   // no selector = subscribes to entire store
// A chat notification unread count changes → this component re-renders.
// The sidebar collapses → this component re-renders.
// Dark mode toggles → this component re-renders.
// Component only needs user.name but re-renders 50 times for unrelated updates.
```

**GOOD:**
```ts
// Immer middleware — mutate state directly, no spread chain
import { immer } from 'zustand/middleware/immer';

const useStore = create<State>()(
  immer((set) => ({
    user: { profile: { name: '', email: '' }, settings: { theme: 'light' } },
    updateName: (name: string) =>
      set((state) => { state.user.profile.name = name; }),  // direct mutation
  }))
);
```

**BAD:**
```ts
// Manual spread operator — deep copy boilerplate, easy to forget a level
const useStore = create<State>((set) => ({
  user: { profile: { name: '', email: '' }, settings: { theme: 'light' } },
  updateName: (name: string) =>
    set((state) => ({
      user: {
        ...state.user,
        profile: { ...state.user.profile, name },
      },
    })),
  // One missing spread: entire nested object is replaced.
  // Three levels deep: 6+ lines for a single field update.
}));
```

**GOOD:**
```ts
// Domain-split stores — each with clear responsibility
const useAuthStore = create<AuthState>()(...);  // user, session, permissions
const useFeedStore = create<FeedState>()(...);   // posts, comments, reactions
const useUIStore = create<UIState>()(...);       // sidebar, modals, theme
```

**BAD:**
```ts
// Monolithic single store — 30+ unrelated properties, every component subscribes
const useStore = create<State>((set) => ({
  user: null, posts: [], comments: [], theme: 'light',
  sidebarOpen: true, notifications: [], modalOpen: false,
  selectedPostId: null, draftContent: '', online: true,
  // 22 more unrelated properties...
}));
// Every component that calls useStore() re-renders when ANY property changes.
// Finding where a property is mutated requires searching 100s of lines.
```

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

### Anti-Patterns — Reject on Sight
- `createStore()` (lowercase) instead of `create()` (uppercase) — `createStore` is the vanilla Zustand store without React bindings. Components calling `useStore()` from a `createStore` store will never re-render on state changes. Use `create()` from `zustand` for React stores.
- Mutating `state` directly without `set()` — Zustand relies on `set()` to trigger subscription notifications. `store.user.name = 'new'` changes the object but no component re-renders. Always use `store.setState(...)` or the `set` function inside the store creator.
- `persist` middleware storing the entire auth store including access tokens — localStorage is accessible to any JavaScript on the same origin (XSS). `partialize: (state) => ({ theme: state.theme, sidebarOpen: state.sidebarOpen })` — persist only non-sensitive UI preferences.
- Store file with `any` types in selectors — `useStore((s: any) => s.user)` loses all TypeScript inference. Type the store interface with `create<StoreInterface>()` and selectors are auto-typed.
- Three-plus stores that all `subscribe` to each other's `getState()` — implicit circular coupling. Merge interdependent stores into one bounded context, or use a lightweight event emitter for cross-store communication.

## Red Flags
- More than 3 stores that call each other's `getState()` — you've created implicit coupling. Merge them or use a shared event bus.
- `useStore()` (no selector) appearing in the codebase — every store change triggers a re-render on that component
- `persist` middleware storing access tokens — localStorage is XSS-accessible; persist only non-sensitive UI state

**Zustand is a minimal API, but store architecture, selector precision, and middleware ordering are architectural decisions. Get them right early — retrofitting a split on a 30-property monolith store touches every component.**
