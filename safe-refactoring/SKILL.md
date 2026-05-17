---
name: safe-refactoring
description: Use when improving code structure without changing behavior, when code is hard to understand or modify, or when preparing to refactor legacy code
---

# Safe Refactoring

## Overview
Refactoring restructures code to improve readability and maintainability without altering external behavior. The safety chain is: tests first, one change at a time, commit after each step.

## When to Use
- Code works but is hard to understand or modify
- Duplicated logic or long functions need cleaning up
- Preparing to add a feature to messy code
- Naming is misleading or inconsistent

**Don't use when:**
- There are no tests and code is untested — refactor only after covering critical paths
- Under a deadline with no time to verify behavior preservation
- Mixed with feature work in the same change set

## Core Workflow

### Step 1: Lock Down Behavior
Write characterization tests that capture current behavior. Without tests, you cannot know if you changed behavior. Use snapshot tests for legacy code.

### Step 2: Make One Atomic Change
Extract one method, rename one variable, simplify one conditional. Each change must preserve tests green. If tests break, the change was not a pure refactor.

### Step 3: Commit and Repeat
Commit after each passing change. Small commits make bisecting bugs trivial and enable selective revert.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Long function | Extract method/function |
| Repeated code | Remove duplication |
| Complex conditional | Extract to named variable or guard clause |
| Bad naming | Rename across scope |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Refactoring and adding features together | Separate into two commits |
| Refactoring without tests | Write characterization tests first |
| Making many changes before testing | Commit after each green test run |

## Red Flags
- Refactoring diff is larger than the feature diff
- "I'll fix the tests after" — the safety net must exist before you start
- Reviewers cannot tell if behavior changed

**All of these mean: stop, shrink scope, or write tests first.**
