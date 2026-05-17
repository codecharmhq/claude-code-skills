---
name: issue-triage
description: Use when triaging GitHub issues, managing issue backlog, or when issues need prioritization and categorization.
---

# Issue Triage

## Overview
Triage turns a chaotic backlog into an ordered queue. Every issue gets acknowledged, categorized, prioritized, and either acted on or closed.

## When to Use
- Issue backlog has grown beyond what the team can process in a week
- New issues arriving daily with no consistent labeling or priority
- Contributors or users report that their issues are ignored for weeks
- Before a sprint planning or release cycle to surface what matters

**Don't use when:**
- The project is a personal todo list with fewer than 10 open issues

## Core Workflow

### Step 1: Acknowledge and Categorize
Reply within SLA (24h for bugs, 72h for feature requests). Apply labels: `bug`, `enhancement`, `documentation`, `question`, `good first issue`, `help wanted`, `blocked`. Close duplicates with a link to the original.

### Step 2: Prioritize by Severity
Critical (data loss, security, all users broken) -> fix within hours. High (major feature broken, no workaround) -> this sprint. Medium (minor feature broken, workaround exists) -> next sprint. Low (cosmetic, nice-to-have) -> backlog.

### Step 3: Validate or Close
Bugs must have reproduction steps, expected vs actual behavior, and environment. Without these, ask once, then close after 14 days of no reply. Feature requests need a clear use case — close vague asks with an explanation.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Duplicate issue | Close, link to original, thank reporter |
| Bug without reproduction | Request steps+env, label `needs-repro`, close after 14d stale |
| Security report | Mark private, tag `security`, escalate immediately |
| Obvious feature request | Label `enhancement`, add to project board for voting |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Keeping every issue open forever | Set a stale-bot to auto-close after 60d of inactivity |
| Labeling everything `bug` | Distinguish bug (broken existing behavior) from enhancement (new) |
| No response to first-time contributors | Prioritize first-issue replies — they are the highest-leverage interaction |

## Red Flags
- More than 100 open issues with no labels
- The same bug reported 5 times in different words
- Issues with zero comments from maintainers

**All of these mean:** batch-triage using GitHub Actions automation first, then manual review.
