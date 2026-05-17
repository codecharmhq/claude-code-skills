---
name: release-checklist
description: "Use when preparing to release software, cutting a release branch, or when coordinating a production deployment"
---

# Release Checklist

## Overview
A disciplined release follows a repeatable checklist: branch, test, version, tag, release, verify. Skipping any step invites rollbacks. The goal is a process so reliable it becomes boring.

## When to Use
- You are about to cut a release and need a proven checklist
- A deployment caused an incident and you want to prevent recurrence
- You are onboarding a new team member to the release process
- You are automating release gates in CI

**Don't use when:**
- Hotfixing a production outage — speed over ceremony; document the gap afterward

## Core Workflow

### Step 1: Pre-release verification
Confirm: all tests pass, changelog is written, version is bumped, database migrations are backward-compatible, documentation is current, dependency audit is clean, security scan passes. If any check fails, the release is blocked.

### Step 2: Branch and tag
Create a `release/vX.Y.Z` branch from `main` (or your dev branch). Only critical fixes land here. Tag with `git tag -a vX.Y.Z -m "vX.Y.Z"` and push. The tag triggers the deployment workflow.

### Step 3: Create GitHub Release
Draft a GitHub Release pointing at the tag. Use the CHANGELOG entry as the body. Mark as pre-release if not production-ready. Attach any build artifacts.

### Step 4: Post-release verification
Monitor dashboards for 30 minutes. Run smoke tests against production. Verify the rollback plan (can you revert to the previous tag?). Communicate the release to users via the appropriate channel.

## Quick Reference

| Phase | Gate |
|-------|------|
| Pre-release | All CI green + security scan clean + deps audited |
| Release | Tag pushed + GitHub Release published + artifacts uploaded |
| Post-release | Smoke tests pass + monitoring OK + rollback plan confirmed |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Releasing on a Friday afternoon | Release early in the week during core hours when the team is available |
| Forgetting to push the tag | Tag is local only until `git push origin vX.Y.Z` |
| Skipping smoke tests in production | Run a minimal test suite against the deployed endpoint |
| No rollback plan | Document `git revert <tag>` or the previous stable artifact |

## Red Flags
- "We'll fix that after release" — that fix becomes the next hotfix. Block and fix now.
- Manual deployment steps — every manual step is a future incident. Automate it.
- No one on call when deploying — ensure at least one team member can respond within 15 minutes.

**All of these mean:** do not release. Address each red flag before proceeding. A skipped gate today becomes a production incident tomorrow.
