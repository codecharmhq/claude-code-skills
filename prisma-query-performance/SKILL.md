---
name: prisma-query-performance
description: Use when debugging slow Prisma queries, fixing N+1 queries with nested includes, optimizing connection pooling, or choosing between raw SQL and Prisma Client
---

# Prisma Query Performance

## Overview
Prisma's convenience has a cost: nested `include` generates N+1 queries by default, `$transaction` wraps everything in serializable isolation, and the connection pool is shared with every query in your app. Prisma performance is about undoing these defaults where they hurt, not about using Prisma differently.

## When to Use
- API response times increased 3x after adding nested `include` relations
- Prisma generates 50+ queries for what should be a single SQL statement
- Connection pool exhaustion under moderate load (50+ concurrent requests)
- Choosing between `findMany` + `include`, `$queryRaw`, or `interactiveTransactions`

**Don't use when:** your app makes < 10 database queries per request — Prisma's defaults won't bottleneck you. Don't prematurely optimize with raw SQL — Prisma's type safety saves more time than the 2ms you might save.

## Core Workflow

**Step 1: Detect N+1 queries with Prisma's log output.** Enable query logging: `prisma: { log: ['query', { level: 'warn', emit: 'event' }] }`. Watch for repeated `SELECT` patterns — 1 query then 20 more with the same shape. The fix depends on the relation: for one-to-many, use `include` (it already batches with `findMany` in Prisma 4+). For nested one-to-many (users → posts → comments → likes), Prisma does NOT batch across nesting levels — each level adds a query. Prisma 5+ added `relationLoadStrategy: 'query' | 'join'`. Use `join` for `findUnique` to get parent + relations in one query via LEFT JOINs. Use `query` (default) for `findMany` — joining across multiple one-to-many relations creates Cartesian product rows.

**Step 2: Move reporting and aggregate queries to `$queryRaw`.** `prisma.posts.groupBy({ by: ['status'], _count: true })` generates inefficient SQL with multiple subqueries. Replace with: `prisma.$queryRaw\`SELECT status, COUNT(*) FROM posts GROUP BY status\``. Use `$queryRaw` for: reporting queries, bulk operations (`UPDATE ... WHERE` affecting 10K+ rows), and complex joins across 4+ tables. Keep CRUD operations in Prisma Client — the type safety is worth the overhead.

**Step 3: Tune the connection pool for serverless vs long-running servers.** Serverless (Lambda, Vercel): set `connection_limit: 1` — cold starts don't need pools. Long-running servers: `connection_limit = (num_connections * 2) / num_instances`, with a hard cap at `pg_max_connections - 10`. Set `pool_timeout: 10` (seconds) — fail fast when the pool is exhausted. Never use `connection_limit: 100` in serverless; each Lambda invocation creates its own pool.

## Quick Reference

| Scenario | Action |
|----------|--------|
| `findMany` with 3 nested `include` makes 50+ queries | Use `findMany` without include, then batch-fetch relations with separate `findMany` calls + `Promise.all` |
| Transactions timeout under concurrent writes | Use `interactiveTransactions` only when you need conditional logic. Use batch `$transaction([...])` for independent writes — it's 3x faster. |
| `findUnique` with `include` on 5 relations is slow | Add `relationLoadStrategy: 'join'` (Prisma 5+) to use one LEFT JOIN query instead of 6 separate queries. |
| Serverless function exceeds DB connection limit | Set `connection_limit: 1` and use an external connection pooler (PgBouncer, Prisma Data Proxy, or Supabase PgBouncer). |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Wrapping every mutation in `$transaction` because "it's safer" | `$transaction` uses serializable isolation. For independent writes, use batch transactions or drop the wrapper. |
| `include` on `findMany({ where: { ... }, include: { posts: { include: { comments: true } } } })` expecting one query | Prisma's default `relationLoadStrategy: 'query'` sends one query per include level. Use `join` for simple cases. |
| `DATABASE_URL` with `?connection_limit=100` in serverless | Each invocation opens up to 100 connections to a pool that dies in 10s. Use `connection_limit: 1`. |

## Red Flags
- Log output showing identical SELECT patterns repeating 20+ times in a single request — classic N+1 from nested includes
- Database connection count approaching `max_connections` with Prisma as the only client — pool configuration is wrong
- `$queryRaw` appearing in 50% of queries — you're fighting Prisma so much you should consider a lighter-weight query builder (Knex, Drizzle)

**Prisma trades query efficiency for type safety. Measure with query logging, fix N+1 with relationLoadStrategy, and move heavy aggregates to $queryRaw.**
