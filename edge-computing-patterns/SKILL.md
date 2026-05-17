---
name: edge-computing-patterns
description: Use when deploying to Cloudflare Workers, Vercel Edge Functions, Deno Deploy, or Lambda@Edge; choosing between edge and regional compute; or debugging cold-start, memory-limit, and runtime-restriction issues at the edge
---

# Edge Computing Patterns

## Overview
Edge functions run closer to users — lower latency, no cold-start for cached responses, and no long-lived connections to manage. But they also have no filesystem, limited CPU time (10-50ms for Cloudflare, 30s for Vercel), restricted Node.js APIs, and a global state problem: your "in-memory cache" on one edge node is invisible to 200 others. Patterns that work on a server fail silently at the edge.

## When to Use
- Adding middleware (auth, geo-redirect, A/B testing) that must run before every request
- Building a globally distributed API with < 100ms P99 latency
- Offloading compute from origin servers to handle traffic spikes
- Choosing between full edge (Workers), regional (Lambda), and traditional server deployment

**Don't use when:** you need file I/O, long-running connections (> 30s), or access to the entire Node.js standard library. Don't edge-deploy a database connection pool — edge functions are too short-lived and too numerous.

## Core Workflow

**Step 1: Profile the runtime before committing to the edge.** Every edge platform restricts the runtime. Cloudflare Workers: no `fs`, no `net` (except `fetch`), Web APIs only, 128MB memory max, 10-50ms CPU per request (free tier). Vercel Edge Functions: subset of Node.js APIs, 30s execution, streaming support. Deno Deploy: Deno APIs, Web APIs, KV store. Lambda@Edge: full Node.js but 5s for viewer events, 30s for origin events. Deploy a test function that probes available APIs before writing real code.

**Step 2: Move state to distributed stores, not in-memory.** Edge functions are stateless by nature — 200 edge nodes × 0 shared memory = 200 different "caches". Use Cloudflare KV (eventually consistent, read-optimized), Durable Objects (strongly consistent, single-instance), or R2 (object storage). For regional compute, use Valkey/Redis in the same region. **Rule:** if two requests need to share data, that data lives outside the edge function.

**Step 3: Handle cold starts as the default, not the exception.** Edge function instances spin down after inactivity. Cold starts at the edge are faster than Lambda (5-50ms vs 100-500ms) but still exist. Bundle minimal dependencies — every KB of import adds startup time. Use `lazy-load` for infrequently used code paths. Pre-warm critical routes with synthetic traffic if cold start impacts P99.

## Quick Reference

| Platform | Runtime | Execution Limit | State Storage | Best For |
|----------|---------|-----------------|---------------|----------|
| Cloudflare Workers | V8 isolates (Web APIs) | 10-50ms CPU | KV, Durable Objects, R2 | Global low-latency, simple logic |
| Vercel Edge | Subset Node.js | 30s | Edge Config, KV | Next.js middleware, short API routes |
| Deno Deploy | Deno + Web APIs | 10s (free) | Deno KV | TypeScript-native edge compute |
| Lambda@Edge | Full Node.js | 5s (viewer) / 30s (origin) | DynamoDB (regional) | Complex logic at CloudFront edge |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `import { PrismaClient }` at the edge | Prisma requires TCP to database; edge functions can't hold connection pools; use HTTP-based DB proxy or Cloudflare D1 |
| In-memory `Map` as a "cache" | Invisible to other edge nodes; use platform KV or a distributed cache |
| Large bundled dependencies (> 1MB) | Trim imports, lazy-load, or split logic between edge (fast path) and origin (heavy path) |
| Assuming `process.env` works at the edge | Use platform-specific env: `env` binding on Workers, `process.env` on Vercel/Deno |

## GOOD/BAD Patterns

**GOOD:**
```typescript
// Cloudflare Worker: auth middleware — fast, stateless, global
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const token = request.headers.get("Authorization")?.slice(7);
    if (!token) return new Response("Unauthorized", { status: 401 });

    const cached = await env.AUTH_CACHE.get(token);  // KV for shared state
    if (cached) return route(request, url);

    const user = await verifyToken(token);  // external HTTP call
    await env.AUTH_CACHE.put(token, JSON.stringify(user), { expirationTtl: 300 });
    return route(request, url);
  },
};
```

**BAD:**
```typescript
// In-memory cache — works on your machine, invisible on 199 other edge nodes
const authCache = new Map<string, User>();  // per-isolate memory, not shared

export default {
  async fetch(request: Request): Promise<Response> {
    const token = request.headers.get("Authorization")?.slice(7);
    if (authCache.has(token)) return route(request);
    // Every edge node verifies every token independently — no cache benefit
    const user = await verifyToken(token);
    authCache.set(token, user);  // useless for all other isolates
    return route(request);
  },
};
```

---

**GOOD:**
```typescript
// Edge + origin split: fast auth at edge, heavy work at origin
// edge/route.ts — runs on every edge node globally
export default async function edgeRouter(request: Request) {
  const session = await validateSession(request);  // KV lookup, < 5ms
  if (!session) return Response.redirect("/login");
  if (isStaticAsset(request)) return fetch(request);  // pass-through
  return fetch(request);  // forward to origin for heavy lifting
}
```

**BAD:**
```typescript
// Everything at the edge — bundles 5MB of dependencies, times out on cold start
export default async function edgeEverything(request: Request) {
  const db = await createDatabaseConnection();  // can't TCP to Postgres from edge
  const pdf = await generatePDF(request.body);  // 15s CPU — exceeds edge limit
  return new Response(pdf);
}
```

### Anti-Patterns — Edge Computing Failures
- Database connection pool at the edge — each edge isolate creates its own pool; 1000 isolates × 20 connections = 20,000 connections to your database; use HTTP-based DB access
- `require('fs')` or `import fs from 'fs'` in an edge function — no filesystem; use object storage (R2, S3) or KV
- Large WebAssembly module loaded in the hot path — WASM instantiation on every cold start; move to lazy-loading or use platform-native features
- Mixing edge and regional state without understanding consistency — KV writes take up to 60s to propagate globally; use Durable Objects for strong consistency
- Not setting `Cache-Control` headers from edge responses — you already paid the edge compute cost; cache the response and serve it for free next time

## Red Flags
- Edge function bundle > 500KB — cold start will be proportionally slower; trim or split
- "Works on local, fails on deploy" — local Node.js ≠ edge runtime; differences in Web Crypto, Fetch API, and missing `Buffer`
- KV `get()` immediately after `put()` returns stale data — eventually consistent; use Durable Objects for read-your-writes
- Edge function CPU time consistently at 80%+ of limit — you're one traffic spike away from timeout; move heavy work to origin

**Edge functions trade runtime completeness for global latency. Use them for the fast path — auth, routing, caching, A/B tests. Leave heavy lifting to the origin.**


---
