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

## Red Flags
- More than 3 `useEffect` hooks with fetch calls — you're bypassing the cache
- `isLoading` showing on every route navigation — staleTime is too aggressive (probably zero)
- `queryClient.refetchQueries` called manually instead of `invalidateQueries` — you're refetching fresh data

**React Query manages a cache, not a connection. Configure staleness intentionally, invalidate by key hierarchy, and always roll back optimistic failures.**
