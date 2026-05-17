---
name: generating-changelogs
description: "Use when preparing release notes, generating changelogs from git history, or when documenting what changed between versions"
---

# Generating Changelogs

## Overview
Follow the "Keep a Changelog" format: each release is a versioned section with categories (Added, Changed, Deprecated, Removed, Fixed, Security). Write for humans, not machines — group related changes and explain impact.

## When to Use
- You are cutting a release and need release notes
- A contributor asks "what changed in vX.Y.Z?"
- You need to communicate breaking changes to downstream users
- You are automating changelog generation in CI

**Don't use when:**
- The project has zero users and is in early prototyping — changelogs add overhead without audience

## Core Workflow

### Step 1: Gather commits since last tag
Run `git log --oneline --format="%s (%h)" <last-tag>..HEAD` or use `git-cliff` / `standard-version` for automated parsing of conventional commits.

### Step 2: Categorize into Keep a Changelog sections
Map conventional commit types: `feat!` -> Added, `feat` -> Added, `fix` -> Fixed, `deprecate` -> Deprecated, `remove` -> Removed, `perf` -> Changed, `security` -> Security. Group similar items under a single bullet.

### Step 3: Rewrite commit messages for humans
A commit message "fix: typo" becomes "Fixed incorrect variable name in user authentication flow." Add issue/PR links. If the commit fixed a reported issue, include the issue number.

## Quick Reference

| Task | Tool / Command |
|------|----------------|
| Auto-generate from conventional commits | `git-cliff -o CHANGELOG.md` |
| Generate from GitHub milestone | `gh pr list --milestone "v1.0" --state merged --json title,number` |
| Manual entry template | See [keepachangelog.com](https://keepachangelog.com) |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Listing every commit verbatim | Group related commits into one human-readable bullet |
| Forgetting the "Security" section | Always scan for CVE fixes; list them separately |
| Omitting "Deprecated" warnings | Users need advance notice before you remove features |
| Changelog only in English for non-English projects | At minimum, keep the "Unreleased" section in the project's primary language |

## Red Flags
- CHANGELOG.md has an "Unreleased" section but no new entries — add them before release
- Breaking changes buried in "Changed" instead of a callout — call them out prominently at the top of the section
- Dates in future or missing — use ISO 8601 (`YYYY-MM-DD`) verified against the tag date

**All of these mean:** review the changelog as if you are a downstream user upgrading. Is it clear what will break and what you gain?
