---
name: tanstack-query-patterns
description: Use when optimizing React data fetching, fixing stale UI after mutations, implementing optimistic updates, or choosing caching strategies
---

# TanStack Query Patterns

## Overview
TanStack Query doesn't fetch data — it manages server state. The key insight: your server owns the data; your UI is a cache. Every bug in React Query traces back to treating it as a data fetcher instead of a cache manager.

## When to Use
- A React app with 3+ API endpoints that need caching coordination
- Building interfaces that mutate server state and must reflect it immediately
- Replacing `useEffect` + `useState` + manual fetch with a proper cache layer
- Implementing optimistic updates for instant-feel interactions

**Don't use when:** you have a single read-only GET endpoint — `fetch` in a `useEffect` is fine. Don't use for client-only state (that's Zustand or Context). Don't use React Query for WebSocket-first real-time data — use its `queryClient.setQueryData` as a sync sink, not a primary transport.

## Core Workflow

**Step 1: Categorize every query by staleness profile.** Never use the default `staleTime: 0` globally. Assign tiers: static resources (staleTime: Infinity, `gcTime: 24 * 60 * 60 * 1000`), user-owned data (`staleTime: 30 * 1000`), real-time feeds (`staleTime: 0`, `refetchInterval: 5000`). Set these in `QueryClient` defaults, then override per-query — not the reverse. The #1 perf bug is refetching data that hasn't changed because staleTime was left at zero.

**Step 2: Invalidate by key hierarchy, not by clearing everything.** Structure keys as `['resource', 'type', id]` — e.g., `['posts', 'list']`, `['posts', 'detail', postId]`. When mutating a post, invalidate `['posts']` with `{ exact: false }` to cascade. Never use `queryClient.clear()` — it blows away the entire cache and triggers a loading waterfall. Prefer `queryClient.invalidateQueries({ queryKey: ['posts'], exact: false })`.

**Step 3: Implement optimistic updates with `onMutate` + `onError` rollback.** Call `queryClient.cancelQueries()` in `onMutate` to freeze in-flight reads. Snapshot previous data with `queryClient.getQueryData()`. In `onSettled`, always invalidate to reconcile with server truth. The `onError` handler MUST restore the snapshot — skip this and the UI shows a success state forever after a failed mutation.

**GOOD:**
```tsx
// Tiered staleTime — prevents unnecessary refetches
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,           // default: most data is fresh for 30s
      gcTime: 5 * 60 * 1000,          // keep in cache 5 min after unmount
      refetchOnWindowFocus: false,     // only refetch on focus if stale
    },
  },
});

// Static reference data — almost never stale
function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
    staleTime: Infinity,               // refetched only on manual invalidation
    gcTime: 24 * 60 * 60 * 1000,
  });
}
```

**BAD:**
```tsx
// staleTime: 0 everywhere — refetches on every mount, focus, and reconnect
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0 } },  // the "refetch everything" default
});
// Every route change: loading spinner. Every tab switch: loading spinner.
// Your app looks broken to users with slow networks.
```

**GOOD:**
```tsx
// Optimistic update with proper rollback
const mutation = useMutation({
  mutationFn: updatePost,
  onMutate: async (newPost) => {
    await queryClient.cancelQueries({ queryKey: ['posts', newPost.id] });
    const previous = queryClient.getQueryData(['posts', newPost.id]);
    queryClient.setQueryData(['posts', newPost.id], newPost);
    return { previous };  // pass snapshot to onError
  },
  onError: (err, newPost, context) => {
    queryClient.setQueryData(['posts', newPost.id], context?.previous); // MUST restore
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] }); // reconcile with server
  },
});
```

**BAD:**
```tsx
// Optimistic update WITHOUT error rollback — UI lies to user forever
const mutation = useMutation({
  mutationFn: updatePost,
  onMutate: async (newPost) => {
    queryClient.setQueryData(['posts', newPost.id], newPost);
    // Snapshot NEVER saved — if the server rejects, UI stays in "success" state
  },
  onSettled: () => {
    // Reconcile on settled, but onError fires before onSettled
    // and there's no snapshot to restore. User sees ghost data.
  },
});
```

**GOOD:**
```tsx
// Key hierarchy invalidation — cascading but controlled
queryClient.invalidateQueries({ queryKey: ['posts'], exact: false });
// Invalidates: ['posts'], ['posts', 'list'], ['posts', 'detail', '123']
// Does NOT invalidate: ['users'], ['comments']
```

**BAD:**
```tsx
// Nuclear option — destroys ALL cached queries
queryClient.clear();
// Every active query re-mounts with loading state.
// User sees spinners on every part of the page, even unrelated sections.
// Equivalent to force-refreshing the browser.
```

## Quick Reference

| Scenario | Action |
|----------|--------|
| List doesn't update after detail mutation | Invalidate the shared key prefix: `queryClient.invalidateQueries({ queryKey: ['posts'] })` |
| Infinite scroll loses position on refetch | Set `refetchOnWindowFocus: false` on infinite queries; use `keepPreviousData: true` |
| Mutation shows stale data for 2+ seconds | Skip `staleTime` delay — call `queryClient.invalidateQueries()` in mutation's `onSuccess` |
| Two components fetch the same data twice | Verify query keys match exactly. Different keys = different cache entries. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `useQuery` inside a component that unmounts/remounts rapidly | Move queries to parent with `staleTime > 0` or use `keepPreviousData` to prevent loading states on remount |
| `staleTime: 0` everywhere | This IS the factory default but means every focus change refetches everything. Set intentional staleness tiers. |
| Fetching data in `useEffect` then calling `setQueryData` | Use `useQuery` directly. `queryClient.setQueryData` is for seeding, not fetching. |

### Anti-Patterns — Reject on Sight
- `enabled: false` to pause a query — boolean `enabled` is for conditional fetching based on dependencies, not a manual pause button. Using it to gate fetching creates race conditions: toggle `enabled` back to `true` and the query fires in an unpredictable component lifecycle. Use `skipToken` or split into separate queries.
- `onSuccess` / `onError` on `useQuery` (v4 API ported to v5) — TanStack Query v5 deprecated callbacks on `useQuery`. Side effects after data load belong in `useEffect` with the query result as a dependency, or in the component body with early return.
- `queryClient.setQueryData` to inject server responses already fetched by `useQuery` — double-caching data. If `useQuery` already fetched user data, don't `setQueryData` the same data from another source. The query function is the single source of truth.
- `refetch()` in an effect to poll — instead of `useEffect(() => { const interval = setInterval(() => refetch(), 5000); }, [])`, use the built-in `refetchInterval` option. The query's internal timer is smarter: it respects window focus and backoff.

## Red Flags
- More than 3 `useEffect` hooks with fetch calls — you're bypassing the cache
- `isLoading` showing on every route navigation — staleTime is too aggressive (probably zero)
- `queryClient.refetchQueries` called manually instead of `invalidateQueries` — you're refetching fresh data

**React Query manages a cache, not a connection. Configure staleness intentionally, invalidate by key hierarchy, and always roll back optimistic failures.**
