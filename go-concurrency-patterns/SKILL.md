---
name: go-concurrency-patterns
description: Use when writing Go concurrent code, debugging goroutine leaks, or when choosing between channels and sync primitives
---

# Go Concurrency Patterns

## Overview
Go's concurrency is simple in syntax but subtle in practice. The key insight: channels coordinate, mutexes protect. The #1 Go bug is goroutine leaks from unbounded producers with blocked consumers.

## When to Use
- Writing code that spawns goroutines
- Debugging a goroutine leak (memory growing, program never exits)
- Choosing between channels, sync.Mutex, sync.WaitGroup, or errgroup
- Reviewing Go code that uses concurrency

**Don't use when:** single-goroutine sequential code with no shared state — don't add concurrency prematurely.

## Core Workflow

### Step 1: Define Ownership
Every goroutine must have a clear owner responsible for its lifecycle. Before `go func()`, answer: who starts it, who stops it, how does it signal completion? Use `context.Context` for cancellation propagation across goroutine trees.

### Step 2: Choose the Right Primitive
Shared mutable state with read/write contention → sync.Mutex or sync.RWMutex. One-shot signal between goroutines → chan struct{} (close to broadcast). Producer-consumer pipeline → buffered channel with clear close semantics. Multiple parallel operations with error collection → errgroup.Group. Counting goroutines for graceful shutdown → sync.WaitGroup.

### Step 3: Prevent Leaks
Every goroutine must have a path to exit. Blocking on a channel send with no reader → leak. Blocking on a channel receive with no writer → leak. Use `select` with `ctx.Done()` on every blocking channel operation. Run tests with `-race` and `GODEBUG=gctrace=1`.

**GOOD:**
```go
// errgroup with context — all goroutines cancelled on first error
g, ctx := errgroup.WithContext(ctx)
for _, url := range urls {
    url := url
    g.Go(func() error {
        req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
        resp, err := http.DefaultClient.Do(req)
        if err != nil {
            return fmt.Errorf("fetch %s: %w", url, err)
        }
        return resp.Body.Close()
    })
}
if err := g.Wait(); err != nil {
    return err
}
```

**BAD:**
```go
// Goroutine with no cancellation — blocks forever if channel write never consumed
func fetchAll(urls []string) error {
    ch := make(chan error)
    for _, url := range urls {
        go func() {
            resp, err := http.Get(url) // bug: uses loop variable, may be wrong url
            ch <- err
            resp.Body.Close()
        }()
    }
    for range urls {
        if err := <-ch; err != nil {
            return err // leaks other goroutines — they keep running
        }
    }
    return nil
}
```

## Quick Reference

| Scenario | Primitive |
|----------|-----------|
| Protect a shared counter | sync.Mutex |
| Fan-out, fan-in pipeline | channels + WaitGroup |
| Multiple HTTP calls, fail on first error | errgroup with context |
| Graceful shutdown | context.WithCancel + select on ctx.Done() |
| Rate limiting | time.Ticker or golang.org/x/time/rate |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Goroutine using loop variable `i` | Pass as argument or copy: `i := i` before go func |
| Channel never closed, range loops forever | Close from the sender, not the receiver |
| WaitGroup.Add inside goroutine | Call Add before go func; otherwise counter may hit zero early |

### Anti-Patterns — Reject on Sight
- `go func()` with no `context.Context` parameter — the goroutine cannot be cancelled or timed out; it must run to completion or leak
- Sending on an unbuffered channel outside a `select` with `ctx.Done()` — if no receiver is ready, the send blocks forever and the goroutine leaks
- `sync.WaitGroup` with `Add()` called inside a goroutine that may not execute — if the goroutine is skipped, `Wait()` returns before all work is done; `Add` must be called before launching

## Red Flags
- `go func()` with no context parameter — goroutine can't be cancelled
- Unbuffered channel send without a select on ctx.Done() — potential deadlock
- defer wg.Done() at the top of a goroutine that may return early — count mismatch
