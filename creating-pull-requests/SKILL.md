---
name: creating-pull-requests
description: Use when creating a pull request, preparing code for review, or when a feature branch is ready to merge
---

# Creating Pull Requests

## Overview
A well-crafted PR minimizes review friction, provides clear context, and reduces the chance of bugs slipping through.

## When to Use
- A feature or fix branch is ready for review and merge
- Preparing to request code review from teammates
- Opening a draft PR for early feedback on work in progress

**Don't use when:**
- Changes are incomplete and not ready for any feedback — keep working locally

## Core Workflow

### Step 1: Self-Review Before Opening
Check your own diff first. Remove debugging code, leftover comments, and unused imports. Run tests. Verify the changes compile and work. Read your diff as if you were the reviewer.

### Step 2: Write the PR Description
Title format: `type(scope): concise summary` (reuse the conventional commit). Body must include: **Summary** (what and why), **Test Plan** (how to verify), **Screenshots** (for UI changes). Link related issues with "Closes #123".

### Step 3: Choose Reviewers and Labels
Select 1-2 reviewers with context on the area. Add labels (bug, enhancement, WIP). For incomplete work, open a **Draft PR** — it cannot be merged until marked ready. Keep PRs under 400 lines; split large changes into sequential PRs.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Small fix | Single commit, brief description |
| Large feature | Multiple atomic commits, detailed body |
| Still working | Open as Draft PR |
| Closes an issue | `Closes #123` in body |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Vague title like "fix stuff" | Use conventional commit format |
| No test plan | Add steps a reviewer can follow |
| PR over 1000 lines | Break into smaller PRs |

## Red Flags
- No tests included for new logic — reviewer cannot verify correctness
- PR mixes refactoring with feature changes — split into separate PRs
- Title differs from the branch purpose — rename branch or update title

**All of these mean: fix before requesting review.**
