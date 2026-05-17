---
name: architecture-decision-records
description: Use when making architectural decisions, documenting technical trade-offs, or when asked to create an ADR for a significant design choice
---

# Architecture Decision Records

## Overview
ADRs capture the context, options, and rationale behind architectural decisions. They prevent "why did we do that?" two years later and give new team members the decision history.

## When to Use
- Choosing between frameworks, databases, or architectural patterns
- Making a decision that will be hard to reverse (API contract, data model, auth strategy)
- Team disagrees on approach and needs structured trade-off analysis
- Onboarding new engineers who need to understand past decisions

**Don't use when:** trivial decisions (linting rules, folder names) or decisions reversible in under an hour.

## Core Workflow

### Step 1: Define the Problem and Context
Write one paragraph: what specific problem are we solving? What constraints exist (budget, timeline, team skills, existing stack)? Who are the stakeholders?

### Step 2: Evaluate Options with Trade-offs
List 2-4 options. For each: describe the approach, list pros (at least 2) and cons (at least 2), estimate cost/complexity. Don't present a straw-man — give each real option fair treatment.

### Step 3: State the Decision and Consequences
Declare the chosen option and the primary driver (performance, simplicity, team familiarity, ecosystem). List positive consequences (what we gain) and negative consequences (what we accept). Set a review date — no decision is permanent.

## Quick Reference

| Scenario | ADR Status |
|----------|------------|
| Decision made and implemented | Accepted |
| New information changed the context | Superseded by ADR-XXX |
| We tried it and it didn't work | Deprecated with reason |
| Still evaluating | Proposed |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| ADR without trade-offs | If there were no other options, it's not an ADR — it's an announcement |
| Too long (5+ pages) | One page: context, options, decision, consequences |
| Never revisiting old ADRs | Schedule quarterly ADR review; stale ADRs are worse than no ADRs |

## Red Flags
- Decision made without listing alternatives — no real analysis was done
- "We'll decide later" on a blocking architectural question — record the deferral as an ADR with a deadline
- ADR references a tool that was replaced 18 months ago — stale, needs superseding
