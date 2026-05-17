---
name: react-state-management
description: Use when choosing React state management, refactoring state architecture, or when asked to recommend a state solution for a React app
---

# React State Management Decision Tree

## Overview
Map your state to the right tool: server state → React Query, client UI state → Zustand, global config → Context. The wrong choice causes over-rendering and complexity debt.

## When to Use
- Starting a new React project and choosing state tools
- Refactoring an app with performance issues from context misuse
- Team can't agree on state management approach
- Adding a new feature and unsure where state should live

**Don't use when:** app has 3 components and no async data — useState is enough.

## Core Workflow

### Step 1: Classify Every Piece of State
Categorize before picking tools. Server state: data fetched from an API, owned by the server, cached locally. Client UI state: form inputs, modal open/closed, tab selection. Global config: theme, locale, auth user object. URL state: filters, pagination, search terms.

### Step 2: Apply the Decision Tree
Server state → React Query (TanStack Query). It handles cache invalidation, background refetch, optimistic updates. Client UI state local to one tree → useState or useReducer. Client UI state shared across unrelated trees → Zustand (minimal boilerplate, no providers). Global config rarely changes → React Context. URL-derived state → useSearchParams. Form state during editing → React Hook Form.

### Step 3: Avoid the Context Trap
Context triggers re-render of every consumer when any value changes. Never put high-frequency state (input values, cursor position) in context. Split read-only auth context from mutable UI context. If you have 5+ context providers, you have a state management problem.

## Quick Reference

| Scenario | Tool |
|----------|------|
| Data from REST/GraphQL API | TanStack Query |
| Form with validation | React Hook Form + Zod |
| UI state shared across pages | Zustand |
| Theme or locale | React Context |
| URL filters and pagination | useSearchParams |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Putting server data in Redux | Use React Query; server state is not client state |
| One giant context for everything | Split into focused contexts or switch to Zustand |
| useEffect to sync derived state | Compute it during render: `const total = items.reduce(...)` |

## Red Flags
- More than 3 useState variables tracking the same entity — extract a reducer
- Context value rebuilt every render — wrap in useMemo
- API data duplicated in local state — remove the copy, use the query cache directly
