---
name: redis-caching-strategies
description: Use when designing Redis caching layers, choosing cache strategies, setting TTL policies, or debugging cache stampede and thundering herd
---

# Redis Caching Strategies

## Overview
Caching is not "add Redis and TTL=300." Every caching decision is a trade between consistency, latency, and infrastructure cost. The strategy that matters is how the cache gets populated and invalidated — not which key prefix you use.

## When to Use
- API response times exceed SLA and the bottleneck is repeated database reads
- Designing a cache layer for 10K+ concurrent requests
- Choosing between cache-aside, write-through, write-behind, or read-through
- Debugging cache stampede (many simultaneous cache-miss→DB calls) or thundering herd

**Don't use when:** your database response is under 5ms — the network hop to Redis may be slower. Don't cache data that changes every request. Don't cache unless you've measured the bottleneck with APM — premature caching adds complexity without solving a measured problem.

## Core Workflow

**Step 1: Implement cache-aside (the default that works).** Application checks cache → cache hit: return. Cache miss: fetch from DB, write to cache, return. Set TTL based on data volatility: user profiles 15min, product catalog 1hr, reference data 24hr. Pattern: `const cached = await redis.get(key); if (cached) return JSON.parse(cached); const data = await db.query(...); await redis.set(key, JSON.stringify(data), 'EX', ttl); return data;`. Never cache null/missing values without a short TTL (30s) and a sentinel — otherwise missing keys cause cache misses on every request.

**Step 2: Prevent cache stampede with probabilistic early recomputation.** When a hot key expires, every concurrent request races to the database. Fix: instead of a fixed TTL, store `expires_at` in the value. When reading, if `expires_at - now() < rand(0.1, 0.3) * ttl`, return the cached value but asynchronously refresh it (one process). This spreads recomputation across a window and eliminates the simultaneous-miss problem. For very hot keys (10K+ req/s on a single key), use a single-flight pattern: only one goroutine/worker fetches from DB; others wait on the same promise.

**Step 3: Invalidate explicitly on mutation, never rely solely on TTL.** TTL is a safety net, not a consistency mechanism. On `UPDATE users SET name = $1 WHERE id = $2`, immediately `redis.del(`user:${id}`)`. For multi-key updates, use Redis pipelining or Lua scripts to batch the deletions atomically. For complex cache dependencies (a post update invalidates the post, the author's post list, and the homepage feed), use cache tags if your library supports them, or maintain a manual invalidation map. Never invalidate by key pattern scan (`KEYS user:*`) in production — it blocks Redis.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Hot key expires, DB crashes under 1000 simultaneous queries | Probabilistic early recomputation + single-flight fetch. Only 1 request hits DB. |
| Cache and DB out of sync after partial update failure | Invalidate cache BEFORE updating DB (write-through) or after (cache-aside). Pick one and be consistent. |
| Redis OOM under write load | Set `maxmemory-policy allkeys-lru` for cache, `noeviction` for session/rate-limit stores. Add TTL to EVERY key. |
| Cache warming on deploy causes DB spike | Warm incrementally: stagger key loading, use a secondary cache for popular keys during deploy. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `TTL: 86400` on every key | Different data changes at different rates. Set TTL per entity type or use a config table. |
| Serializing with `JSON.stringify` for every cache read/write | Use MessagePack or a binary protocol for large objects. JSON parse costs 2-5ms for 100KB payloads. |
| `redis.keys('prefix:*')` in a loop to invalidate | O(N) and blocking. Use `SCAN` with cursor, or maintain a set of related keys. |

## Red Flags
- Cache keys with no TTL — eventually Redis fills up and eviction becomes random
- Cache hit rate below 50% — you're paying Redis latency for mostly misses
- Keys with TTL=60 and 10 different services reading them — cache is acting as a real-time sync mechanism, which it isn't

**Cache-aside with explicit invalidation on mutation covers 90% of use cases. Add probabilistic early recomputation for hot keys. TTL is a safety net, not a consistency primitive.**
