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

**GOOD:**
```python
class InsufficientFundsError(APIError):
    def __init__(self, balance: float, required: float):
        self.balance = balance
        self.required = required
        super().__init__(
            status_code=422,
            detail=f"Balance {balance:.2f} below required {required:.2f}",
            error_type="insufficient_funds",
        )

# Caller can branch on error type, not parse strings
try:
    process_payment(amount)
except InsufficientFundsError as e:
    return {"error": "insufficient_funds", "balance": e.balance}, 422
```

**BAD:**
```python
def process_payment(amount):
    if balance < amount:
        raise Exception("Not enough money")  # Generic Exception — caller can't distinguish this from a DB failure

try:
    process_payment(amount)
except Exception as e:
    # Must parse the string to know what happened — breaks when message is translated or reworded
    if "enough" in str(e):
        return {"error": "insufficient_funds"}, 422
    return {"error": "unknown"}, 500
```

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

### Anti-Patterns — Reject on Sight
- `except Exception: pass` — silently swallows every failure including `KeyboardInterrupt` and `SystemExit`; even a log line is infinitely better than silence
- `raise Exception("some message")` without a custom exception type — callers must parse string messages to distinguish error types; any refactor of the message text silently breaks error handling
- Retry loop without exponential backoff and jitter — sleeping a fixed 1 second between retries is a thundering herd attack on your own downstream services

## Red Flags
- Catch blocks with no body or a comment like "shouldn't happen"
- Error messages containing file paths, SQL, or stack traces shown to users
- Same retry logic copy-pasted across codebase

**All of these mean: error handling is an afterthought — design a strategy before adding more.**
