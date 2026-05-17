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

## Red Flags
- "I think X is slow" with no numbers to back it up
- Optimizations submitted without before/after measurements
- The bottleneck is obvious (N+1 query, missing index) but no one fixed it

**All of these mean:** stop coding, start measuring. Get a baseline before touching any code.
