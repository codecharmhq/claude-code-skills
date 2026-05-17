---
name: writing-conventional-commits
description: Use when writing git commit messages, preparing to commit code changes, or when commit messages need to follow a standard format
---

# Writing Conventional Commits

## Overview
Conventional Commits standardize commit messages into a machine-readable format that enables automated changelog generation and semantic versioning.

## When to Use
- Writing or preparing git commit messages
- Standardizing commit formats across a team
- Setting up automated release or changelog tooling

**Don't use when:**
- Working on a solo project with no automation needs — simpler formats suffice

## Core Workflow

### Step 1: Determine the Type
Choose the correct prefix: `feat:` (new feature), `fix:` (bug fix), `chore:` (maintenance), `docs:` (documentation), `refactor:` (code change with no behavior change), `test:` (adding/fixing tests), `ci:` (CI config), `perf:` (performance improvement).

### Step 2: Write a Concise Description
After the colon and space, write a lowercase imperative sentence: `feat: add user login endpoint`. Keep under 72 characters. Use the body for deeper context.

### Step 3: Handle Breaking Changes and Scope
Add `!` before the colon for breaking changes: `feat!: drop support for Node 14`. Optionally add scope in parentheses: `feat(auth): add OAuth2 login`. The body should explain the breaking change with `BREAKING CHANGE:` prefix.

## Quick Reference

| Scenario | Action |
|----------|--------|
| New feature | `feat: add ...` |
| Bug fix | `fix: correct ...` |
| Breaking change | `feat!: ` or `fix!: ` |
| Multiple changes | Separate commits per type |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Past tense description | Use present imperative: "add" not "added" |
| Ending with period | No trailing period in subject line |
| Capitalizing first word | Lowercase after type/scope |

## Red Flags
- Subject line over 72 characters — wrap in body instead
- Commit doing multiple unrelated things — split into separate commits
- `git commit -m` for complex changes — use an editor for the body

**All of these mean: rewrite the commit message before pushing.**
