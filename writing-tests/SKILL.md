---
name: writing-tests
description: Use when writing tests for code, when test coverage is insufficient, or when deciding what and how to test
---

# Writing Tests

## Overview
Good tests are reliable, fast, and independent. They give confidence that code works correctly and that changes do not break existing behavior.

## When to Use
- Code has low or no test coverage
- Bugs are frequently found in the same areas
- Team is afraid to change code due to unknown side effects
- Deciding what to test in a new feature

**Don't use when:**
- Writing throwaway experiments or prototypes
- Testing framework boilerplate or generated code

## Core Workflow

### Step 1: Follow the Test Pyramid
Write many fast unit tests, fewer integration tests, and a few end-to-end tests. Unit tests validate business logic. Integration tests validate boundaries (DB, API). E2E tests validate critical user journeys.

### Step 2: Apply AAA Pattern
**Arrange**: set up inputs and state. **Act**: invoke the behavior. **Assert**: verify the outcome. Keep each section visually separated. One logical assertion per test.

### Step 3: Name Tests as Specifications
Use the pattern: `should_expectedBehavior_when_condition`. Example: `should_return_404_when_product_not_found`. Tests are living documentation — the name must tell the story.

## Quick Reference

| Decision Rule | Guidance |
|----------|--------|
| What to test first | Business logic, then edge cases, then error paths |
| What not to test | Framework internals, generated code, trivial getters/setters |
| Mock vs real | Mock external I/O; use real implementations for in-process logic |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Tests depend on each other | Each test must be runnable in isolation |
| Testing implementation details | Test behavior, not internal methods |
| Flaky tests | Remove shared state, fix time dependencies, avoid network in unit tests |

## Red Flags
- Running tests in a specific order is required for them to pass
- Tests fail intermittently ("works on my machine")
- A single test covers multiple behaviors
- Tests take minutes to run for a small change

**All of these mean: test quality is degrading — fix the testing infrastructure before adding more tests.**
