---
name: resolving-merge-conflicts
description: Use when encountering git merge conflicts, when git merge or rebase fails with conflicts, or when needing to resolve conflicting changes between branches
---

# Resolving Merge Conflicts

## Overview
Merge conflicts occur when two branches modify the same lines. Resolution requires understanding intent on both sides, choosing the correct outcome, and verifying the result works.

## When to Use
- `git merge` or `git rebase` reports conflicts that must be resolved
- Git status shows files listed as "both modified" or "both added"
- A PR is blocked by merge conflicts on GitHub

**Don't use when:**
- The conflict involves generated/lock files — regenerate them instead

## Core Workflow

### Step 1: Understand Both Sides
Open each conflicted file. Conflict markers show: `<<<<<<< HEAD` (your changes), `=======` (divider), `>>>>>>> branch` (incoming changes). Read both versions to understand what each side intended. Never pick one side blindly.

### Step 2: Choose the Correct Resolution
Three options: keep yours, keep theirs, or combine both. Delete the conflict markers including `<<<<<<<`, `=======`, `>>>>>>>`. For complex conflicts, pull both authors into a conversation — don't guess intent.

### Step 3: Test and Commit
Build the project and run tests. For merge conflicts: `git merge --continue`. For rebase: `git rebase --continue`. If resolution becomes too complex, abort with `git merge --abort` or `git rebase --abort` and plan a different strategy.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Keep your version | Delete markers and incoming code |
| Keep their version | Delete markers and your code |
| Combine both | Merge changes manually |
| Lost in conflicts | `git merge --abort` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Picking yours without reading theirs | Review both; you may lose important changes |
| Leaving conflict markers in file | Always search for `<<<<<<<` or `=======` after resolving |
| Not building/testing after resolve | Conflicts can produce code that compiles but is wrong |

## Red Flags
- Same file has conflicts in multiple unrelated sections — may need to regroup
- Binary file conflicts — pick the correct version, can't merge
- 20+ conflicted files — consider aborting and merging incrementally

**All of these mean: communicate with the other author before proceeding.**
