---
name: feature-flag-patterns
description: Use when implementing feature flags for gradual rollout, setting up kill switches, choosing a flag provider, or cleaning up stale flags after release
---

# Feature Flag Patterns

## Overview
Feature flags aren't boolean toggles — they're operational tools. A flag that ships a feature at 10% is a gradual rollout. The same flag flipped to 0% in 5 seconds is a kill switch. The pattern that matters: how you clean up stale flags. Without cleanup, every flag becomes a permanent branch in your codebase.

## When to Use
- Rolling out a risky feature to 5% → 25% → 100% of users
- Deploying code behind a flag that can be killed without a rollback
- Running A/B experiments on user-facing behavior
- Separating deploy from release — merge to main behind an off-flag, turn on later

**Don't use when:** the feature is a pure backend optimization with no user-visible change — use a gradual deploy instead. Don't flag every PR — flag things you'd be afraid to deploy on a Friday. Don't keep flags longer than 2 sprints after full rollout.

## Core Workflow

**Step 1: Structure flags by purpose, not by feature name.** Each flag has a type: `release` (decouple deploy from release, removed within 2 sprints), `experiment` (A/B test, measured by conversion, removed after experiment concludes), `operational` (kill switch, kept long-term for emergency shutdown), `permission` (entitlement gate, not a flag — use your authorization system). Never use a `release` flag as a long-term `permission` flag — the cleanup window closes and the flag fossilizes.

**Step 2: Default to off, target by context, not just percentage.** `if (flags.isEnabled('new-checkout', { userId, email, country, plan }))`. Flag providers (LaunchDarkly, OpenFeature, Flagsmith) evaluate rules: 5% of users in USA on paid plans. Never hardcode user IDs in flag rules — use attributes. Always test locally with a test flag that overrides to `true`. The flag evaluation must be O(1) — no network call for each evaluation. Cache flag rules in-memory; update them via WebSocket or polling (30s interval).

**Step 3: Clean up flags with a removal checklist, not a ticket.** When a flag reaches 100% and is stable for 1 sprint: remove the flag evaluation, remove the old code path (the one behind `else`), remove the flag from the provider dashboard, add a comment to the PR that the flag is retired. Create a recurring calendar reminder (monthly) to review all active flags. Any release flag older than 60 days is technical debt. The flag provider dashboard is your cleanup inventory — if it has 50+ flags, you're running 50+ undeployed branches in production.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Feature rolled to 100% 3 months ago, flag still in code | Schedule removal THIS sprint. Every stale flag is a dead code path that complicates debugging. |
| Flag evaluation slow, causing P99 latency regression | Provider SDKs cache rules locally. Check your client init — it should be a singleton with local caching. |
| Flag off but feature still visible to some users | Check flag targeting rules. A user might match multiple conditions. Use "target off" not "default off" to be sure. |
| Need flag but flag provider is down at launch time | Flags SDK must have a local fallback. Evaluate flags with a default value: `isEnabled('flag', false)` — safe default. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Flag name: `new_feature` — no one knows what this is after 6 weeks | Name flags by user impact: `checkout-redesign-2026-q3`. The name tells the story when the creator is gone. |
| Removing the `if (flag)` but keeping the dead code in `else` | Delete both the flag evaluation AND the old code path. Half-cleanup is worse — now two paths look active. |
| Adding a new flag for every PR without a cleanup plan | Flag count is a debt metric. If you can't name the removal criteria, don't create the flag. |

## Red Flags
- Flag dashboard showing 40+ active flags with 10+ created over 6 months ago — you're running a config-driven monolith
- Flag evaluation scattered across 50+ files with no import convention — extract to a central `flags.ts` with named exports
- "We'll clean it up after the release" and the release was 3 months ago — flags that outlive their release window are dead code with a dashboard

**Feature flags are temporary operational controls, not permanent configuration. Categorize by purpose, default to off, clean up within 60 days. A stale flag IS a branch deployed in production — treat it with the same cleanup urgency.**
