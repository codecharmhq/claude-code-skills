---
name: performance-profiling
description: Use when application performance is slow, when debugging latency issues, or when optimizing code for speed.
---

# Performance Profiling

## Overview
Never guess about performance. Measure first, form a hypothesis, then change one thing at a time. Premature optimization is the root of all evil.

## When to Use
- User-facing pages or API calls are noticeably slower than expected
- Server CPU or memory usage is abnormally high under normal load
- A specific operation (query, render, upload) is identified as "slow"
- Preparing for a scalability review or load test

**Don't use when:**
- The system is not yet working correctly — profile after correctness is verified

## Core Workflow

### Step 1: Establish a Baseline
Pick one metric (p95 latency, CPU time, memory footprint). Measure it in production or a realistic staging environment. Record the value before changing anything.

### Step 2: Profile to Find the Bottleneck
Use the right tool: Chrome DevTools Performance tab for frontend JS, `pprof` for Go, `cProfile` for Python, `JProfiler` or Async Profiler for Java. Read the flame graph — wide bars are expensive calls. Identify whether the bottleneck is CPU-bound, memory-bound, I/O-bound, or network-bound.

### Step 3: Optimize One Thing
Change a single variable: add caching, enable lazy loading, add connection pooling, optimize a query, reduce allocations. Re-measure the same metric. If it improved, keep the change. If not, revert. Repeat.

## Quick Reference

| Scenario | Action |
|----------|--------|
| High CPU | Profile CPU flame graph; look for hot loops, regex in hot paths, serialization |
| High memory | Heap dump; look for large retained objects, unbounded caches, memory leaks |
| Slow database | Log slow queries, add EXPLAIN, add indexes, batch N+1 queries |
| Slow page load | Chrome DevTools — check network waterfall, render blocking, large assets |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Optimizing without measuring first | Always record baseline before changing anything |
| Changing multiple things at once | One change per iteration, or you won't know what helped |
| Profiling in dev on empty data | Profile with production-scale data or realistic load |
| Premature micro-optimization | Profile first; only optimize code that is proven slow |

## GOOD/BAD Patterns

**GOOD:**
```python
# Profile first, then optimize — single change, single measurement
import cProfile

def handle_request(data):
    profiler = cProfile.Profile()
    profiler.enable()
    result = expensive_operation(data)
    profiler.disable()
    profiler.print_stats(sort="cumtime")
    return result
```

**BAD:**
```python
# Guess and optimize — no measurement, no baseline
def handle_request(data):
    # I heard local variables are faster...
    result = expensive(
        data,
        use_cache=True,     # guess 1
        enable_pooling=True, # guess 2
        batch_size=100       # guess 3
    )
    # Changed 3 things; no idea which one (if any) helped
    return result
```

---

**GOOD:**
```python
# Single variable change — isolate the effect
# Before: p95 latency = 320ms
sqlalchemy_pool_size = 20  # was 5
# After:  p95 latency = 180ms — keep the change
```

**BAD:**
```python
# Changed pool size, added Redis cache, upgraded DB instance, AND batched queries
# p95 went from 320ms to 140ms — which change did it?
# None of them? All of them? Rollback requires reverting all four
```

---

**GOOD:**
```python
# Profile with production-scale data — realistic results
# Load test: 10,000 concurrent users, 500MB dataset
p95 = benchmark(handle_request, users=10_000, data_size="500MB")
```

**BAD:**
```python
# Profile on dev with empty database — misleading results
# Load test: 1 user, 3 rows in DB
p95 = benchmark(handle_request, users=1, data_size="3 rows")
# Profile shows serialization as bottleneck; in prod the bottleneck is the DB
```

### Anti-Patterns — Reject on Sight

- "I think X is slow" with no profiling data to back it up — opinions are not evidence; measure first
- Optimization PR without before/after measurement — without a baseline, you cannot claim improvement
- `str` concatenation in a hot loop prematurely "optimized" to `''.join()` while the real bottleneck is an N+1 query — profile to find the actual hot spot
- Multiple changes in one optimization commit — one change per iteration, or you won't know what worked
- Micro-optimization (local variable bindings, `++i` vs `i++`) before addressing algorithmic complexity — an O(n^2) loop obsoletes all micro-tweaks
- Profiling in a dev environment with zero traffic and toy data — results do not generalize to production

## Red Flags
- "I think X is slow" with no numbers to back it up
- Optimizations submitted without before/after measurements
- The bottleneck is obvious (N+1 query, missing index) but no one fixed it

**All of these mean:** stop coding, start measuring. Get a baseline before touching any code.
