---
name: reducing-technical-debt
description: Use when codebase velocity is dropping, every feature requires untangling legacy code first, or when making the business case for dedicated cleanup work
---

# Reducing Technical Debt

## Overview
Technical debt isn't "bad code" — it's code that made sense at the time but now costs more than it delivers. The difference between a rewrite and a cleanup is whether you can ship while fixing. Reduce debt in place, in production, one capability at a time.

## When to Use
- A feature that should take 2 days consistently takes 2 weeks
- The same 3 files are touched in every pull request
- New hires take 3+ months to become productive
- Bug fixes in one area regularly break another

**Don't use when:** the codebase is being replaced within 6 months. Don't refactor just because the style bothers you — measure the actual cost first.

## Core Workflow

### Step 1: Measure Debt, Don't Feel It
Extract data, not opinions. Run `scc` or `cloc` to find files with extreme complexity-to-line ratios. Run `git log --since="6 months" --format="%H" -- <file>` to find churn hotspots — files changed in 80% of PRs are debt clusters. Calculate: time spent per file / total development time. Present to stakeholders in dollars, not abstractions: "This 2000-line file costs us $X/month in slowdown."

### Step 2: Apply the Strangler Fig, Not the Rewrite
Never stop-the-world rewrite. Extract one capability at a time from the debt cluster into a clean module. Route existing callers to the new module. Delete the old code only after all callers migrate. Ship each extraction independently. If the extraction breaks something, roll it back without affecting other extractions.

### Step 3: Automate Prevention
Add lint rules that fail CI on the specific anti-patterns you just cleaned up. Set complexity thresholds: any function with cyclomatic complexity > 15 fails the build. Use `eslint-plugin-complexity`, `radon` (Python), or `gocognit` (Go). Without automation, the debt returns within 3 sprints. The cleanup isn't done until the linter enforces it.

## Quick Reference

| Symptom | Action |
|---------|--------|
| File changed in 80% of PRs | Extract one responsibility; strangler-fig the callers |
| "Don't touch X, nobody understands it" | Characterization tests first, then extract |
| Same bug fixed 3 times in 6 months | The root abstraction is wrong — redesign the interface |
| CI takes 40+ minutes | Parallelize by extracting independently-testable modules |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Big-bang rewrite while the old system still runs | Strangler fig: extract and switch one capability at a time |
| "Cleanup" branch that lives for 3 weeks | Max 2 days per extraction; merge to main behind a flag |
| No metric before starting | Measure cost in time/$ before; measure again after; report the delta |
| Cleaning code that nobody touches | Fix code that costs you now, not code that looks ugly |

## GOOD/BAD Patterns

**GOOD:**
```python
# Strangler fig: extract one capability behind the same interface, migrate callers one by one
class NewPaymentGateway:
    def charge(self, amount: Decimal) -> Result:
        # new, clean implementation
        pass

# Old code still works; callers migrate incrementally
class OldPaymentGateway:
    def charge(self, amount: Decimal) -> Result:
        # old, tangled implementation
        pass
```

**BAD:**
```python
# Big bang rewrite — everything stops until "the new system is ready"
class PaymentSystemV2:
    # 6 months of development, no shipping, no feedback loop
    def charge(self, amount: Decimal) -> Result:
        pass
    def refund(self, ...) -> ...
    # 20+ methods all rewritten at once
```

---

**GOOD:**
```python
# Lint enforcement prevents regression
# .eslintrc: { "complexity": ["error", { "max": 15 }] }
# CI fails if any function exceeds cyclomatic complexity 15
```

**BAD:**
```python
# Manual gate only — debt returns within 3 sprints
# "Please keep functions under 15 branches" in CONTRIBUTING.md (nobody reads it)
```

---

**GOOD:**
```python
# Measure before and after: report the delta
# Before: avg 5 days per feature in module X
# After:  avg 2 days per feature in module X
# Report to stakeholders: "Saved $Y/month in engineering time"
```

**BAD:**
```python
# Cleanup based on feelings — no numbers, no business case
# "This code is ugly" → refactor → "is it better?" → "I think so"
```

### Anti-Patterns — Reject on Sight

- Big-bang rewrite while the old system still runs in production — strangler fig exists for exactly this reason
- "Cleanup" branch that lives 3+ weeks without merging — branches that diverge never merge; ship behind a feature flag in 2 days max
- Cleaning code that nobody has touched in 2 years — measure the actual cost first; fix what slows you down, not what looks ugly
- "We'll clean it up after the release" in 3 consecutive quarterly planning sessions — debt is accumulating, not being paid
- More than 30% of sprint capacity going to unplanned bug fixes — the bugs ARE the debt manifesting; surface it to stakeholders
- No metric before starting the cleanup — without a baseline, you cannot prove the cleanup had any effect

## Red Flags
- "We'll clean it up after the release" said 3 releases in a row — debt is accumulating, not being paid
- Feature velocity declining quarter over quarter — debt is now a business problem, not an engineering preference
- More than 30% of sprint capacity goes to unplanned "bug fixes" — the bugs ARE the debt manifesting

**Technical debt that doesn't show up in velocity metrics is cosmetic. Fix what actually slows you down, not what offends you aesthetically.**
