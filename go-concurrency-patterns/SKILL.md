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

## Red Flags
- `go func()` with no context parameter — goroutine can't be cancelled
- Unbuffered channel send without a select on ctx.Done() — potential deadlock
- defer wg.Done() at the top of a goroutine that may return early — count mismatch
