---
name: semantic-versioning
description: "Use when determining version numbers for releases, deciding between major/minor/patch bumps, or when preparing a new software release"
---

# Semantic Versioning

## Overview
Version format MAJOR.MINOR.PATCH. Increment MAJOR on breaking changes, MINOR on new features, PATCH on bug fixes. Pre-release suffixes (`-alpha.1`, `-beta.2`, `-rc.1`) signal instability.

## When to Use
- You need to decide the next version number for a release
- A PR introduces a breaking change and you need to communicate impact
- You are publishing a package to npm, PyPI, or similar
- You need to create a pre-release for testing (alpha, beta, release candidate)

**Don't use when:**
- The project uses date-based or arbitrary versioning — semver adds friction without benefit

## Core Workflow

### Step 1: Analyze commits since last release
Run `git log --oneline <last-tag>..HEAD` and categorize each commit: breaking changes (`!` or `BREAKING CHANGE`), features (`feat`), fixes (`fix`), chores. The highest category determines the bump.

### Step 2: Apply the bump
Breaking change = MAJOR+1 (and MINOR=0, PATCH=0). New feature = MINOR+1 (and PATCH=0). Bug fix only = PATCH+1. For pre-releases, append `-alpha.N`, `-beta.N`, or `-rc.N` incrementing N.

### Step 3: Tag and commit
Commit the version bump (usually in a `package.json`, `Cargo.toml`, or similar), then `git tag v<new-version>` and push both.

## Quick Reference

| Scenario | Bump | Example |
|----------|------|---------|
| Breaking API change | MAJOR | 2.0.0 -> 3.0.0 |
| New feature (backward compat) | MINOR | 2.0.0 -> 2.1.0 |
| Bug fix only | PATCH | 2.0.0 -> 2.0.1 |
| Pre-release for testing | suffix | 2.0.0-rc.1 |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Bumping MAJOR for cosmetic breaking changes | Renaming a parameter is not semver-breaking unless removing the old one |
| Forgetting pre-release precedence | `-alpha.10` > `-alpha.9` (lexicographic fails); use zero-padded or numeric comparison |
| Bumping after release instead of before | Version bump is part of the release commit, not done after tagging |

## Red Flags
- A deprecation warning in current major — plan removal for the next MAJOR
- Internal-only package with semver — consider 0.x or omit versioning entirely
- Multiple MAJOR bumps without clear communication — users will ignore upgrades

**All of these mean:** validate the bump by running `git diff <last-tag>..HEAD --stat` to see the real scope of changes. When in doubt, bump MINOR instead of guessing MAJOR.
