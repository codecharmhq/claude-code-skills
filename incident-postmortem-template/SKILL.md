---
name: incident-postmortem-template
description: Use when writing a postmortem after a production incident, running a blameless retrospective, or when building an incident response process from scratch
---

# Incident Postmortem

## Overview
A postmortem is not a report — it's a learning artifact. Blameless doesn't mean responsibility-free; it means focusing on systemic causes, not individual mistakes. The goal: one incident, N action items, zero repeats.

## When to Use
- After any production incident that affected users (even briefly)
- A near-miss that could have caused an outage
- Building or updating an incident response runbook
- Leadership asks "what happened and how do we prevent it?"

**Don't use when:** the issue was caught in staging with no user impact — a bug report suffices. Don't postmortem every build failure; only user-visible incidents.

## Core Workflow

### Step 1: Write the Timeline (Just the Facts)
Start from detection time, work backward to the triggering event, then forward to resolution. Each entry: `[HH:MM UTC] What was observed, by whom, and what action was taken`. No blame, no interpretation — just events. Include: when the alert fired, when the first responder acknowledged, when the fix was deployed, when impact ended. Flag gaps: "14:32 Alert fired — 14:41 First human saw it (9 min gap, pager not configured for this alert)."

### Step 2: Analyze Systems, Not People
Root cause is a chain, not a person. For every action someone took that seemed wrong at the time, ask: what information did they have? What was the time pressure? What guardrails were missing? The 5 Whys: "DB migration failed → why? → script timed out → why? → no timeout config → why? → default is 30s, we needed 120s → why wasn't it caught? → no staging run with production-sized data."

### Step 3: Write Action Items That Prevent Recurrence
Every action item must be: specific (not "improve monitoring"), assigned to one person, with a due date. Classify: detection (alerts, dashboards), prevention (validation, guardrails), mitigation (auto-rollback, circuit breakers), process (runbooks, training). Prioritize by impact reduction, not ease. Top item must address the earliest point in the timeline where intervention could have stopped the incident.

## Quick Reference

| Section | Content |
|---------|---------|
| Summary | 2-3 sentences: what, duration, user impact |
| Timeline | UTC timestamps, events only, no interpretation |
| Root Cause Analysis | 5 Whys chain, contributing factors |
| Impact | Users affected, duration, data loss, revenue impact |
| Action Items | Specific, assigned, dated; linked to incident tickets |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| "Human error" as root cause | Ask why the error was possible; systems should tolerate human mistakes |
| 20 vague action items | 3-5 concrete items; reject anything unmeasurable |
| Skipping near-misses | Near-misses are free lessons — postmortem them |
| Postmortem written by one person | Involve the responder, the reviewer, and the service owner |

## Red Flags
- Action items that all start with "Remind the team to..." — training doesn't prevent; automation does
- Timeline with gaps > 10 minutes — detection is broken; that's your first action item
- No metrics in the impact section — "users were affected" is not enough; count them

**If your action items don't include at least one automated guardrail (test, validation, alert), you're planning to repeat this incident.**
