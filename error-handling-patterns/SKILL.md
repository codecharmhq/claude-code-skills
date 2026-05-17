---
name: error-handling-patterns
description: Use when adding error handling to code, when errors are swallowed or poorly handled, or when designing error handling strategy
---

# Error Handling Patterns

## Overview
Good error handling makes failures predictable, diagnosable, and recoverable. The goal is to fail deliberately, not accidentally — every error path should be designed, not an afterthought.

## When to Use
- Errors are swallowed with empty catch blocks
- Stack traces appear in user-facing messages
- A failure in one component brings down the whole system
- Retry logic is ad-hoc or missing entirely

**Don't use when:**
- Prototyping throwaway code where speed matters over robustness

## Core Workflow

### Step 1: Classify Error Zones
Identify boundaries: external calls (APIs, databases), user input, file I/O, and business rule violations. Each zone needs a strategy — not all errors deserve the same treatment.

### Step 2: Choose the Right Pattern
- **Fail Fast**: Terminate immediately when state is corrupt — don't process further
- **Graceful Degradation**: Return degraded result instead of crashing (e.g., stale cache when DB is down)
- **Retry with Backoff**: For transient failures — exponential backoff with jitter
- **Circuit Breaker**: Stop calling a failing service, retry after a cooldown
- **Bulkhead**: Isolate failure to one thread pool or instance

### Step 3: Add Context at Every Layer
Wrap errors with stack trace, request ID, user context (not PII), and what was being attempted. Structured error types enable callers to handle specific cases without string parsing.

## Quick Reference

| Scenario | Pattern |
|----------|---------|
| Network call fails | Retry with exponential backoff |
| Downstream service is degraded | Circuit breaker |
| Invalid state detected | Fail fast |
| External dependency unavailable | Graceful degradation with cached data |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Empty catch | Log the error or rethrow |
| Catching Exception/Pokemon | Catch specific exception types only |
| Logging then rethrowing | Let the top-level handler log once |
| Exposing internals to users | Map to user-friendly messages, log the details |

## Red Flags
- Catch blocks with no body or a comment like "shouldn't happen"
- Error messages containing file paths, SQL, or stack traces shown to users
- Same retry logic copy-pasted across codebase

**All of these mean: error handling is an afterthought — design a strategy before adding more.**
