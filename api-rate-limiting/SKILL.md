---
name: api-rate-limiting
description: Use when implementing rate limiting, choosing between rate limit algorithms, protecting APIs from abuse, or debugging rate limit false-positives in production
---

# API Rate Limiting

## Overview
Rate limiting looks simple — "10 requests per second" — until you run it in production across 50 servers. Then you hit clock skew, race conditions, Redis timeouts, and the dreaded "legitimate users getting 429'd while abusers breeze through." This skill covers algorithm selection, implementation patterns, and production failure modes.

## When to Use
- Adding rate limiting to a new or existing API
- Current rate limiter blocks legitimate users or lets abusers through
- Migrating from in-memory to distributed rate limiting
- Choosing between token bucket, sliding window, and fixed window algorithms

**Don't use when:** you need throttling (slow down, don't block) — rate limiting says no, throttling says wait. Don't use for offline rate analysis — that's analytics, not limiting.

## Core Workflow

**Step 1: Pick the right algorithm for your traffic pattern.** Fixed window (counter reset every N seconds) is simplest but bursts at window boundaries. Sliding window log stores every request timestamp — accurate but memory-heavy. Token bucket allows bursts up to bucket size then enforces steady rate — best for most APIs. Sliding window counter (approximate sliding window) balances accuracy and memory — good default for distributed systems. **Rule of thumb:** under 1000 req/s and single server → token bucket. Distributed or high throughput → sliding window counter with Redis.

**Step 2: Implement with atomicity from day one.** Every rate limit check must be atomic. In Redis: `MULTI/EXEC` or Lua scripts. In-memory: mutex on the counter. The race condition is real: two requests read count=9, both think they're allowed, both increment to 10, one should have been blocked. **GOOD:** Redis Lua script that checks-and-increments in one atomic operation. **BAD:** `if (get(key) < limit) { increment(key); allow(); }` — race condition between get and increment.

**Step 3: Design failure modes before you need them.** What happens when Redis is down? Two choices: open circuit (block all requests — safe but disruptive) or closed circuit (allow all requests — dangerous but available). Pick closed circuit with a strict cap (e.g., "if Redis fails, allow max 100 req/s in-memory fallback"). Log every fail-open event. Return headers on every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` on 429. These headers are your debugging surface when users report issues.

## Quick Reference

| Algorithm | Best For | Weakness |
|-----------|----------|----------|
| Token Bucket | Most APIs, allows bursts | Slightly more complex to implement |
| Fixed Window | Simple use cases, low traffic | Bursts at window boundaries (2x limit) |
| Sliding Window Log | Accurate accounting | Memory: stores every request timestamp |
| Sliding Window Counter | Distributed systems, high traffic | Approximation, not exact |
| Leaky Bucket | Constant-rate processing | Doesn't allow bursts at all |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Per-server counters in a load-balanced deployment | Use Redis or consistent-hashing to shard counters |
| Blocking IPs permanently after threshold | Always use sliding windows; permanent blocks = support tickets |
| No differentiation between auth'd and unauth'd | Auth'd users get higher limits; unauth'd get strict defaults |
| Rate limit counter includes successful AND failed requests | Only count the requests you want to limit; failed auth should count separately |

## GOOD/BAD Patterns

**GOOD:**
```python
# Redis Lua script — atomic check-and-increment, no race condition
RATE_LIMIT_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, window)
end
if current > limit then
    return {0, current}  -- denied
end
return {1, current}  -- allowed
"""

def check_rate_limit(user_id: str) -> bool:
    key = f"ratelimit:{user_id}"
    allowed, count = redis.eval(RATE_LIMIT_SCRIPT, 1, key, 100, 60)
    return bool(allowed)
```

**BAD:**
```python
# Race condition — two requests can both pass when count is at 9/10
def check_rate_limit(user_id: str) -> bool:
    key = f"ratelimit:{user_id}"
    current = redis.get(key) or 0
    if current < 10:
        redis.incr(key)
        redis.expire(key, 60)
        return True
    return False
```

---

**GOOD:**
```python
# Fail-open with fallback — Redis down doesn't take API down
def check_rate_limit(user_id: str) -> bool:
    try:
        return redis_rate_check(user_id)
    except RedisError:
        logger.error("Rate limit Redis unavailable — using in-memory fallback")
        return in_memory_rate_check(user_id, fallback_limit=50)
```

**BAD:**
```python
# Fail-closed — Redis timeout takes your API down with it
def check_rate_limit(user_id: str) -> bool:
    return redis_rate_check(user_id)  # Redis down → exception → 500 errors
```

---

**GOOD:**
```python
# Response headers let users debug their own rate limit issues
response.headers["X-RateLimit-Limit"] = "100"
response.headers["X-RateLimit-Remaining"] = str(remaining)
response.headers["X-RateLimit-Reset"] = str(window_end_unix)
response.headers["Retry-After"] = str(window_end_unix - now())
```

**BAD:**
```python
# Silent 429 with no headers — user has no idea why they're blocked or when to retry
if not check_rate_limit(user_id):
    raise HTTPException(status_code=429)
```

### Anti-Patterns — Rate Limiting Failures
- IP-based limiting behind a corporate NAT or proxy — 1000 users share one IP; use API keys or session tokens
- `sleep(1)` as a "rate limiter" — blocks the request thread, doesn't limit concurrent requests, doesn't work across servers
- Resetting all counters at midnight UTC — creates a stampede of requests at exactly 00:00; use sliding windows
- Infinite block on threshold breach — legitimate users get caught in burst and permanently banned; always auto-expire blocks
- Rate limit data in the same database as user data — rate limit writes are 10-100x your API traffic; use Redis or dedicated store

## Red Flags
- 429 errors spiking while server CPU is at 10% — rate limiter is the bottleneck, not your API; tune limits or algorithm
- Users reporting rate limits but your dashboard shows low traffic — IP-based limiting behind NAT; switch to token-based
- Rate limit counters growing unbounded in Redis — missing EXPIRE on keys; add TTL to every counter
- "We'll add rate limiting after launch" — every unprotected API gets scraped, brute-forced, or DDoSed within 48 hours of public exposure

**Rate limiting isn't a feature — it's a prerequisite for any public API. The time to implement it is before the first abuse, not after.**


---
