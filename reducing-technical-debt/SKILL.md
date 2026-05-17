---
name: reducing-technical-debt
description: Use when codebase has accumulated technical debt, when planning debt reduction work, or when choosing between quick fix and proper solution
---

# Reducing Technical Debt

## Overview
Technical debt is the future cost of taking shortcuts now. Systematic reduction requires identifying, prioritizing, and steadily paying down debt while preventing new accumulation.

## When to Use
- Adding a simple feature takes longer than expected
- Bug fixes frequently regress other areas
- Teams fear touching certain modules
- Onboarding new developers is painfully slow

**Don't use when:**
- The codebase is scheduled for replacement within weeks
- Business is in crisis mode requiring all hands on deliveries

## Core Workflow

### Step 1: Identify and Classify
Catalog debt into types: code debt (complexity, duplication), design debt (poor architecture), test debt (low coverage), documentation debt (stale docs), dependency debt (outdated libraries). Tag each with estimated impact.

### Step 2: Prioritize with Impact vs Effort
Plot debt items on a 2x2 matrix. Attack high-impact, low-effort items first. These deliver immediate velocity improvement.

### Step 3: Schedule and Execute
Dedicate 10-20% of each sprint to debt reduction, or run focused cleanup sprints. Use the boy scout rule: always leave code slightly better than you found it.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Frequently touched messy code | Refactor incrementally each visit |
| Outdated dependencies | Schedule upgrade sprint quarterly |
| Untested critical path | Add tests alongside feature work |
| Business asks "why slow down?" | Calculate time lost to debt in dev-hours |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Trying to fix all debt at once | Prioritize by impact, not visibility |
| No tracking system | Maintain a tech debt register in your project tracker |
| Taking on debt without recording it | Document intentional debt with a repayment plan and date |

## Red Flags
- Teams avoid touching certain files or modules
- Estimates are wildly inconsistent for similar work
- "Quick fix" is a permanent state, not an exception
- No one remembers why a workaround exists

**All of these mean: a debt problem has moved from "annoying" to "blocking" — treat reduction as a feature.**
