---
name: java-stream-optional-patterns
description: Use when writing Java Stream pipelines, debugging Optional chains, or when code review flags nested Optional or side-effectful Stream operations
---

# Java Stream & Optional Patterns

## Overview
Stream and Optional replaced explicit loops and null checks, but they introduced silent traps: consumed Streams, nested Optionals, and side-effectful lambdas. The key rule: Optional is a return type, never a field or parameter.

## When to Use
- Refactoring a for-loop into a Stream pipeline
- Chaining Optional maps that start returning `Optional<Optional<T>>`
- Stream operation throws `IllegalStateException: stream has already been operated upon`
- Code review flags `.get()` without `.isPresent()` or `.orElseThrow()`

**Don't use when:** the logic has 3+ side effects — explicit loops are clearer. Don't use Optional for optional constructor parameters; use builder or overloads.

## Core Workflow

### Step 1: Choose Collection vs Stream Boundary
Start collection operations with `.stream()`, end with a terminal operation. Never store a Stream in a variable — it's single-use by design. Parallel streams only when: dataset > 10k elements, each operation is CPU-bound, and there's no shared mutable state. Always measure; `parallelStream()` often hurts.

### Step 2: Chain Optionals Without Nesting
Use `.flatMap(Optional::stream)` (Java 9+) or `.or(() -> ...)` for fallback chains. Never return `Optional<Optional<T>>` — that's the #1 sign the chain is wrong. Use `Optional.empty()` as the zero value, not `null`. For collections: return empty List, not `Optional<List<T>>`.

### Step 3: Audit Side Effects
Stream operations must be stateless and non-interfering. `peek()` is for debugging only — production side effects in `peek()` break under parallel streams. `forEach()` as terminal: OK for simple output, not for mutation. Prefer `collect(Collectors.toList())` over `forEach(x -> list.add(x))`.

## Quick Reference

| Scenario | Pattern |
|----------|---------|
| Default on empty | `.orElse(default)` for constants, `.orElseGet(() -> compute())` for lazy |
| Throw on empty | `.orElseThrow(() -> new MyException(id))` |
| Chain two Optional-returning methods | `.flatMap(this::method)` |
| Convert Optional to Stream | `.stream()` (Java 9+) |
| Collect to immutable list | `.collect(Collectors.toUnmodifiableList())` (Java 10+) |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `Optional` as a field or method parameter | Return Optional; never store or pass it |
| `.get()` without `.isPresent()` | `.orElseThrow()` with a descriptive exception |
| `filter` + `findFirst` → `.get()` | Use `.findFirst().orElseThrow()` as one chain |
| Mutable reduction in `collect` | Use `Collectors` static methods; they're thread-safe |

## Red Flags
- `Optional<Optional<T>>` — flatMap immediately; you missed a transformation step
- `.collect()` inside a `forEach()` — reverse it: `.stream().collect()` does both
- `parallelStream()` on a small dataset or with I/O — sequential is faster and correct

**Stream pipelines with side effects are bugs waiting for parallel execution. Keep lambdas pure.**
