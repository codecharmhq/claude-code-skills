---
name: monorepo-dependency-analysis
description: Use when analyzing monorepo dependency graphs, fixing circular dependencies, or when setting up affected-project detection for CI skip logic in Nx, Turborepo, or Bazel
---

# Monorepo Dependency Analysis

## Overview
A monorepo without dependency discipline becomes a monolith — every change rebuilds everything, every circular dependency blocks refactoring, and deploy confidence decays because nobody knows what's actually affected by a change.

## When to Use
- CI runs all tests for a one-line change in a single package
- Two packages depend on each other (circular dependency at the package level)
- Setting up `nx affected` or `turbo run --filter=[...]` for the first time
- A shared library's version bump breaks 15 downstream packages unexpectedly

**Don't use when:** the repo has fewer than 3 packages. A polyrepo with independent versioning may be simpler — don't add monorepo tooling to a 2-package project.

## Core Workflow

### Step 1: Map the Dependency Graph
Run `nx graph` or `turbo run build --graph` to visualize. Categorize every package: `type: "app"` (deployable, no dependents from apps), `type: "lib"` (reusable, can have dependents), `type: "tool"` (dev-only, like ESLint config). Apps depend on libs. Libs depend on other libs at the same or lower layer. Never allow app-to-app or lib-to-app dependencies.

### Step 2: Enforce Dependency Rules
Use Nx `@nx/enforce-module-boundaries` or Turborepo `eslint-plugin-turbo` with explicit `depConstraints`. Tag packages by scope: `scope:shared`, `scope:checkout`, `scope:fulfillment`. Rule: a `scope:checkout` package cannot import from `scope:fulfillment`. Run enforcement in CI — violations are build failures, not warnings.

### Step 3: Implement Affected-Only CI
`nx affected:test --base=origin/main` runs only tests for packages impacted by the diff. Same for lint, build, e2e. Turborepo: `turbo run build test --filter=[origin/main...HEAD]`. The dependency graph determines "affected" — changing a leaf lib triggers all transitive dependents. Without this, CI time grows linearly with repo size.

## Quick Reference

| Scenario | Tool/Command |
|----------|-------------|
| Visualize dependencies | `nx graph` or `turbo run build --graph` |
| Run tests only for changed packages | `nx affected:test --base=main` |
| Detect circular dependency | `nx lint` with `@nx/enforce-module-boundaries` (circularDepCheck) |
| See all consumers of a lib | `nx graph --focus=my-lib` |
| Publish changed packages only | `nx release` or `changesets` with `nx affected` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| One `package.json` at root for everything | Each package gets its own; root for shared scripts only |
| `"*"` version in internal dependencies | Use `workspace:*` (pnpm) or `"0.0.0"` (Nx manages internally) |
| No `depConstraints` | Add tag-based rules; enforce in CI |
| Circular dep "fixed" with dynamic `import()` | Remove the cycle by extracting a shared interface lib |

## Red Flags
- CI always runs the full pipeline regardless of changes — no affected detection
- Circular dependency that "just works" — TypeScript and bundlers may tolerate it, but runtime resolution is fragile
- One package imports from another package's `src/` instead of its public API — encapsulation leak

**A monorepo without dependency rules is polyrepo complexity with monolith coupling. Enforce boundaries or split repos.**
