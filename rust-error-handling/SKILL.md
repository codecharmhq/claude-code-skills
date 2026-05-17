---
name: rust-error-handling
description: Use when writing Rust error types, choosing between Result and panic, or when building library error APIs with thiserror/anyhow
---

# Rust Error Handling

## Overview
Rust forces you to handle errors, but it doesn't tell you *how*. The key insight: libraries return `Result` with typed errors; applications use `anyhow` for ergonomics. Panic only when continuing would be unsafe.

## When to Use
- Designing a library's public error type
- Propagating errors across multiple layers
- Choosing between `unwrap()`, `expect()`, `?`, and bubble-up
- Converting between error types in a middleware chain

**Don't use when:** prototyping a one-off script — `anyhow::Result<T>` and `?` everywhere is fine.

## Core Workflow

### Step 1: Classify the Code
Libraries expose typed, composable errors via an enum with `#[derive(Error)]`. Applications propagate anything with `anyhow::Result<T>`. Binary crates: `anyhow` in `main()`, `thiserror` in library subcrates. No exceptions.

### Step 2: Design the Error Type
Library errors use `thiserror`: one enum variant per failure mode, `#[error("...")]` for Display, `#[from]` for `?` auto-conversion. Never expose upstream error types directly — wrap them. Add context with `.context("while parsing config")` / `.with_context(|| format!("id={id}"))`.

### Step 3: Decide Panic vs Error
Panic only on unrecoverable invariant violations: index out of bounds after length check, poisoned lock in single-threaded context, division by zero after guard clause. Everything else: `Result`. Never panic on user input, network, or filesystem errors.

## Quick Reference

| Scenario | Tool |
|----------|------|
| Library error type | `#[derive(Error, Debug)]` enum + `thiserror` |
| Application error propagation | `anyhow::Result<T>` + `?` + `.context()` |
| Adding context to an error | `.context("message")` or `.with_context(\|\| ...)` |
| Converting Option to Result | `.ok_or_else(\|\| MyError::NotFound)` |
| Bail early with a message | `bail!("invalid config: {k}={v}")` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `Box<dyn Error>` everywhere | Use `anyhow::Error` — same thing, more ergonomic |
| `.unwrap()` in library code | Return `Result`; let the caller decide |
| Giant catch-all error enum | One variant per *distinct failure that callers match on* |
| Losing context with `?` | Always `.context()` at layer boundaries |

## Red Flags
- `unwrap()` or `expect()` in non-test code — every panic site must be provably unreachable
- Error type with a single variant — use a newtype, not an enum
- `.map_err(\|e\| e.to_string())` — information destruction; use `.context()` instead

**Any unwrap() outside test code: prove it cannot panic, or replace with proper error handling.**
