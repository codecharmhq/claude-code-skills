---
name: nextjs-api-route-design
description: Use when designing Next.js API routes, choosing between Route Handlers and Server Actions, or debugging caching and stale data in App Router APIs
---

# Next.js API Route Design

## Overview
App Router split the API surface into Route Handlers (`route.ts`), Server Actions, and middleware — each with different caching, runtime, and auth behavior. The wrong choice produces stale data, double-renders, or broken CORS.

## When to Use
- Deciding between `route.ts` handler and Server Action for a new endpoint
- API response is cached when it shouldn't be, or vice versa
- Auth check is duplicated across 5+ route files
- Choosing between Edge and Node.js runtime for an endpoint

**Don't use when:** the project is on Pages Router — use `pages/api/` with `getServerSideProps` patterns instead.

## Core Workflow

### Step 1: Choose the Right API Surface
Route Handlers (`route.ts`) for: external webhooks, public REST APIs, streaming responses, cross-origin requests. Server Actions for: form submissions, mutations triggered by client components, revalidating cache after write. Middleware (`middleware.ts`) for: URL rewriting, redirects, bot protection, geo-based routing — not for heavy auth or database calls.

### Step 2: Control Caching Explicitly
Route Handlers are NOT cached by default in production — unlike `fetch` in Server Components which IS cached. Use `export const dynamic = 'force-dynamic'` to opt out of static generation. Revalidate with `revalidatePath()` or `revalidateTag()` after mutations. Never rely on the default; always explicit `cache` or `next: { revalidate }` on fetch calls.

### Step 3: Centralize Auth in Middleware
Check session/token in `middleware.ts` for broad route protection. Use a shared `auth()` helper imported into individual route handlers for fine-grained checks. Never inline `cookies().get('token')` in individual routes — it's the #1 source of auth drift across endpoints.

## Quick Reference

| Scenario | Pattern |
|----------|---------|
| Public API endpoint | `route.ts` with `export const runtime = 'edge'` |
| Form mutation + redirect | Server Action with `revalidatePath('/list')` |
| Webhook from Stripe/GitHub | `route.ts` POST with raw body parsing |
| Rate limiting | `middleware.ts` + `@upstash/ratelimit` |
| Revalidate after DB write | `revalidateTag('posts')` — tag-based, not path-based |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Server Action for GET-equivalent data | Route Handler with `cache-control` headers |
| Auth check copy-pasted across routes | Extract `auth()` helper; import everywhere |
| `export const dynamic = 'auto'` and expecting fresh data | Set `'force-dynamic'` explicitly |
| Edge runtime with Node.js-only packages | Move that logic to an external service or use Node.js runtime |

## Red Flags
- `cookies()` or `headers()` called inside a try/catch without being awaited — they're dynamic functions that opt the route out of static
- Server Action returning JSX — actions return serializable data, not components
- Route handler that reads the request body twice — body is a one-shot stream; clone it first

**Dynamic functions must be called at the top of the file, not inside conditionals or try/catch blocks.**
