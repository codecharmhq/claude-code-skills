---
name: code-review-workflow
description: Use when reviewing pull requests, performing code review, or when asked to review someone else's code changes
---

# Code Review Workflow

## Overview
Code review catches bugs early, improves code quality, and spreads knowledge across the team. Review the logic, not the person.

## When to Use
- Assigned as a reviewer on a pull request
- Asked by a teammate to look at their changes
- Conducting a pre-merge review as part of CI process

**Don't use when:**
- Changes are trivial and already covered by automated checks (typos, formatting)

## Core Workflow

### Step 1: Understand the Context
Read the PR description and linked issues first. What problem does this solve? Review tests before implementation — they define expected behavior. If tests are missing, ask for them.

### Step 2: Review Systematically
Check in order: security (injection, auth, data exposure), correctness (edge cases, null states, off-by-one), performance (N+1 queries, unnecessary allocations), readability (clear naming, appropriate abstractions). Run the code locally if needed.

### Step 3: Give Constructive Feedback
Be specific: "This loop runs O(n^2) — suggest using a Set" not "This is slow." Ask questions instead of demands: "What happens when the list is empty?" Praise good solutions: "Nice use of early return here." Approve only when all concerns are addressed.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Minor style issue | Suggest but don't block |
| Logic error or bug | Request changes with explanation |
| Great solution | Approve with positive comment |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Nitpicking style that passes linter | Trust automated tools, focus on substance |
| Approving without understanding | Ask questions until the logic is clear |
| Reviewing too fast | Go file by file, don't skim |

## Red Flags
- PR has no tests but adds business logic — request tests before approving
- Large PR with no explanation — ask for a summary or split
- Reviewer rubber-stamping all PRs — slow down and actually read the diff

**All of these mean: request changes or ask clarifying questions before approving.**
