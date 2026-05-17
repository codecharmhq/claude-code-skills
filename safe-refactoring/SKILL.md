---
name: safe-refactoring
description: Use when restructuring working code without changing behavior, when legacy code has no tests, or when preparing tangled code for a new feature
---

# Safe Refactoring

## Overview
Refactoring is restructuring, not rewriting. The difference: every intermediate step leaves the system working. The safety comes from mechanical transformations — rename symbol, extract function, invert conditional — executed one at a time, each verified by tests that were passing before and after.

## When to Use
- A function is 200+ lines and you need to add a feature to part of it
- The same logic appears in 3+ places with slight variations
- A conditional has 7 branches and nobody can explain what the 5th one does
- Preparing legacy code for changes when it has zero tests

**Don't use when:** the behavior needs to change — that's a feature, not a refactor. Don't refactor and add features in the same commit.

## Core Workflow

### Step 1: Build the Safety Net
If tests exist: run them. If not: write characterization tests — tests that assert current behavior, not correct behavior. Use golden-master testing for untestable legacy code: `expect(renderFullPage()).toMatchSnapshot()`. Get coverage on the code you're about to touch. If you can't test it, you can't refactor it safely.

### Step 2: Apply Mechanical Transformations
Use IDE-automated refactors, not hand edits. Rename variable: IDE rename (F2), not find-and-replace. Extract function: select lines → Extract Method → verify signature. Inline variable, then extract again if the name is wrong. Invert conditional: `if (!valid) return;` as guard clause to reduce nesting. Replace magic number with named constant. Each transformation is one commit.

### Step 3: Verify and Commit After Every Step
Run tests after every single refactoring step. If tests fail, the step was not a pure refactor — undo and re-examine. Commit message: `refactor: extract validateEmail from registration handler`. Never `refactor: cleanup` — that's a rewrite, not a refactor. The git history should read like a series of mechanical, reversible steps.

## Quick Reference

| Technique | When to Use |
|-----------|------------|
| Extract Function | Block of code with a comment explaining what it does |
| Inline Variable | Variable used once, name adds no clarity |
| Replace Conditional with Polymorphism | Switch/if-chain on type field across multiple methods |
| Introduce Parameter Object | 3+ parameters always passed together |
| Slide Statements | Move related lines together before extracting |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| "I'll add tests after" | Tests exist before refactoring or the refactoring doesn't happen |
| 3 refactorings in one commit | One mechanical change per commit; `git bisect` must pinpoint breakage |
| Manually retyping instead of IDE refactor | IDEs have refactoring engines that preserve semantics; trust them |
| Refactoring the whole codebase at once | Scope to the code needed for the next feature; leave the rest |

## GOOD/BAD Patterns

**GOOD:**
```typescript
// Extract function: one clear name, one responsibility
function calculateDiscountedPrice(basePrice: number, coupon: Coupon): number {
  if (!coupon.isValid()) return basePrice
  return applyDiscount(basePrice, coupon.discountRate)
}
```

**BAD:**
```typescript
// 80-line function with inline logic and comments explaining blocks — the comment IS the function name
function processOrder(order: Order): number {
  // calculate discount
  let price = order.total
  if (order.coupon && order.coupon.expiresAt > Date.now()) {
    price = price * (1 - order.coupon.discountRate)
    // apply tax ... and so on for 60 more lines
  }
  // ...
}
```

---

**GOOD:**
```python
# Guard clause — early return reduces nesting
def process_payment(invoice):
    if not invoice.is_payable:
        return None
    if invoice.amount <= 0:
        return None
    # main logic at column 0
    return charge(invoice)
```

**BAD:**
```python
# Deeply nested conditional — every branch is a bug farm
def process_payment(invoice):
    if invoice.is_payable:
        if invoice.amount > 0:
            # main logic at column 8
            return charge(invoice)
    return None
```

---

**GOOD:**
```typescript
// Characterization test — locks current behavior before refactoring
describe("legacyRenderer", () => {
  it("matches current output", () => {
    expect(renderFullPage({ user: "test" })).toMatchSnapshot()
  })
})
```

**BAD:**
```typescript
// No test coverage — "I'll add tests after refactoring" always means "I'll never add tests"
describe("legacyRenderer", () => {
  // TODO: add tests after refactoring
})
```

### Anti-Patterns — Reject on Sight

- Manual find-and-replace to rename a symbol — breaks references the IDE would have updated; use IDE rename (F2) or a codemod
- "Refactoring + feature" in a single commit message or PR title — split immediately; behavior changes must be isolated from structural changes
- `// TODO: add tests after` in a refactoring PR — tests must exist before refactoring or the refactoring doesn't happen
- Commit titled `cleanup` or `refactor stuff` — if you can't name the exact mechanical transformation, you weren't refactoring
- Any refactoring that touches 50+ files in one commit — too large to review; break into one transformation per commit
- "I just changed it a little bit" without running tests — "a little bit" is where regressions hide

## Red Flags
- PR title: "Refactoring + feature" — split immediately; these must be separate PRs
- Refactoring commit that changes behavior "just a little" — it's not a refactor, it's a feature with extra risk
- "I refactored X but now Y is broken" — the refactoring wasn't mechanical; it had hidden side effects

**If you can't name the exact mechanical transformation you applied, you weren't refactoring — you were rewriting with hope.**
