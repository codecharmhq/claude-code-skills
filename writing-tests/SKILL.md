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

**GOOD:**
```python
def test_should_return_404_when_product_not_found():
    # Arrange
    client = TestClient(app)
    product_id = "non-existent-id"

    # Act
    response = client.get(f"/products/{product_id}")

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"
```

**BAD:**
```python
def test_product():
    # Multiple behaviors crammed into one test — when this fails you don't know why
    client = TestClient(app)
    r1 = client.get("/products/valid-id")
    assert r1.status_code == 200
    r2 = client.get("/products/non-existent-id")
    assert r2.status_code == 404
    r3 = client.post("/products", json={"name": "Test"})
    assert r3.status_code == 201  # First failure hides all subsequent assertions
```

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

### Anti-Patterns — Reject on Sight
- `time.sleep()` in tests — makes tests slow and flaky; use `await asyncio.wait_for()` with a short timeout or inject a virtual clock instead
- Mocking the system under test's own internals — mocking `Database.save()` inside the `Database` class test means you're testing the mock, not the code
- Test files that import from `tests/helpers` with `sys.path` manipulation — indicates broken project layout; use `pip install -e .[dev]` and import normally

## Red Flags
- Running tests in a specific order is required for them to pass
- Tests fail intermittently ("works on my machine")
- A single test covers multiple behaviors
- Tests take minutes to run for a small change

**All of these mean: test quality is degrading — fix the testing infrastructure before adding more tests.**
