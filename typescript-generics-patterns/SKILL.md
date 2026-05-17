---
name: typescript-generics-patterns
description: Use when designing generic TypeScript APIs, debugging type inference failures, or when choosing between generics, overloads, and discriminated unions
---

# TypeScript Generics Patterns

## Overview
Generics in TypeScript are a constraint-solving engine, not templates. The compiler infers constraints, then solves them. When inference fails, TypeScript falls back to `unknown` — silently degrading your type safety.

## When to Use
- Designing a reusable utility type, hook, or component API
- A generic function returns `unknown` or `any` unexpectedly
- Choosing between generic constraints, function overloads, and discriminated unions
- Building a library that must preserve input types through transformations

**Don't use when:** a simple union type or `extends` on a concrete type suffices. Don't genericize prematurely.

## Core Workflow

### Step 1: Define the Minimum Constraint
Start with the narrowest bound the implementation needs. Prefer `extends` on the type parameter over inline conditional types. Use `T extends { id: string }` not `T extends Record<string, unknown> & { id: string }`. Only widen when callers demand it.

### Step 2: Solve Inference with Helper Patterns
When inference fails: use `NoInfer<T>` (TS 5.4+) to block inference on a parameter while keeping it on another. Use branded types for nominal typing: `type UserId = string & { __brand: 'UserId' }`. Use `satisfies` for type-checking without widening: `const config = { ... } satisfies AppConfig`.

### Step 3: Choose Between Overloads and Conditional Types
Function overloads: when return type varies by literal input (`"GET"` → `GetResult`, `"POST"` → `PostResult`). Conditional types: when the mapping is mechanical and all callers know the input type. Generic + conditional: last resort; prefer overloads for public APIs.

## Quick Reference

| Scenario | Pattern |
|----------|---------|
| Return type depends on argument | Function overloads (not conditional return) |
| Prevent inference on a param | `NoInfer<T>` (TS 5.4+) |
| Narrow without widening | `satisfies` operator |
| Generic component props | `interface Props<T> { items: T[]; render: (item: T) => ReactNode }` |
| Infer from array element | `T extends Array<infer U>` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `T extends any` constraint | No-op; remove it or use a real constraint |
| Conditional return type on generic | Overloads give better errors and autocomplete |
| Forgetting `NoInfer` on a parameter | TypeScript infers `never` or widens to `unknown` |
| `as` cast to satisfy generic | Fix the inference; the cast hides real errors |

## Red Flags
- `as any` inside a generic function — the type parameter constraint is wrong
- Generic parameter that appears only once — eliminate it or prove it constrains something
- `<T, U, V>` — too many; group related types into an object parameter

**Every `as` in generic code is a bug in the constraint, not the body. Fix the constraint.**
