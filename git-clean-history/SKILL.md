---
name: git-clean-history
description: Use when git history is messy, before merging feature branches, or when preparing commits for code review
---

# Git Clean History

## Overview
Interactive rebase rewrites commit history to produce a logical, reviewable sequence. Each commit should be an atomic, self-contained change with a meaningful message.

## When to Use
- Branch has "WIP", "fix typo", or "temp" commits that need squashing
- Before merging a feature branch into main
- Preparing commits for a pull request review

**Don't use when:**
- Branch is shared with other developers (rewriting published history is dangerous)
- You are unsure which commits belong together — keep them separate

## Core Workflow

### Step 1: Squash Fixup Commits
`git rebase -i HEAD~N` to edit the last N commits. In the editor, mark fixup commits as `f` (fixup, discards message) or `s` (squash, combines messages). Group related changes into single commits.

### Step 2: Reword and Reorder
Change `pick` to `r` to reword a commit message into a conventional commit format. Reorder lines in the rebase list to group logical changes together. Use `d` to drop commits that should not exist.

### Step 3: Verify After Rebase
Review the resulting history with `git log --oneline`. Build and test. If something broke, use `git reflog` to find the state before rebase and `git reset --hard <ref>` to recover.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Fix last commit message | `git commit --amend` |
| Combine "fix typo" into previous | `git rebase -i` then `f` |
| Remove a commit entirely | `git rebase -i` then `d` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Rebasing a shared branch | Only rebase local, unpublished commits |
| Squashing unrelated changes | Keep separate concerns in separate commits |
| Force pushing after rebase without checking | Always verify log and tests first |

## Red Flags
- Commit messages say "asdf", "wip", "temp" — these must be squashed
- A single commit changes 30 files across 3 concerns — split it
- The branch has been pushed and others have pulled it — do NOT rebase

**All of these mean: clean up before requesting review, but never rewrite shared history.**
