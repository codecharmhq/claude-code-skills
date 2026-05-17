---
name: error-monitoring-setup
description: Use when setting up Sentry or error tracking, configuring source maps, structuring alerts by severity, or reducing alert fatigue in production
---

# Error Monitoring Setup

## Overview
Error monitoring isn't "install the SDK and check the dashboard." The real work is making errors actionable: grouping them correctly, attaching enough context to debug without reproducing, and alerting on impact (user-facing errors) not volume (404s from a bot scanner). An unactionable error is noise; an unmonitored error is a silent outage.

## When to Use
- Setting up error monitoring for a new production service
- Reducing alert fatigue — too many notifications, not enough signal
- Configuring source maps so minified production errors resolve to real stack traces
- Structuring error context so any team member can triage an alert without asking questions

**Don't use when:** you have no production traffic yet — set up the SDK but don't configure alerts. Don't use error monitoring as a logging replacement — use structured logging for that. Don't alert on every error; alert on errors that affect users.

## Core Workflow

**Step 1: Attach context at the error site, not in a catch-all handler.** Every `Sentry.captureException(err)` call must carry: `user: { id, email? }` (scrub PII in before-send), `tags: { feature: 'checkout', severity: 'high' }`, and `extra: { orderId, cartTotal }`. Tags are indexed and searchable; extra is for debugging detail. In Sentry's `beforeSend` callback: filter out errors from known bots (by user-agent), rate-limit identical errors to 1/minute, scrub passwords and tokens from request bodies. Never capture raw request bodies without scrubbing — credentials end up in error dashboards.

**Step 2: Upload source maps at build time, never serve them publicly.** In CI: `sentry-cli sourcemaps upload ./dist --org my-org --project my-app --release $VERSION`. Configure `vite.config.ts` or `next.config.js` to generate hidden source maps (`hidden-source-map` — includes the sourcemap reference comment in the bundle but the file is only uploaded to Sentry, not deployed). Add `./dist/**/*.map` to `.gitignore` and ensure your CDN doesn't serve `.map` files. Source maps contain readable source code — public access is a security leak.

**Step 3: Alert on error rate per feature, not raw count.** Configure: "Alert if error rate for feature `checkout` exceeds 1% of traffic for 5 minutes." Not: "Alert if more than 50 errors in 5 minutes." The former detects a checkout outage; the latter fires on a traffic spike. Set up three tiers: P1 (user cannot complete a core action, page on-call), P2 (user sees error but can work around, alert during business hours), P3 (cosmetic or rare edge case, dashboard-only). Every alert must link to a runbook — if the alert fires with no documented response, it's worse than no alert.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Minified stack trace shows `at a.b.c.d` in production | Source maps not uploaded. Run `sentry-cli sourcemaps upload` in CI for each release. Tag with release version. |
| 5000 identical errors in 1 minute | Add rate limiting in `beforeSend`. Group by fingerprint: `Sentry.setFingerprint(['checkout-timeout'])`. |
| Error says "Cannot read property 'name' of undefined" with no context | Add `Sentry.setContext('order', { orderId, status, userId })` at the capture site. |
| Alerts firing but no one responds | Every alert needs a runbook link. If no one can write the runbook, the alert shouldn't fire. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `Sentry.init({ dsn: process.env.SENTRY_DSN })` — DSN undefined at build time | The DSN must be available at build time for source map upload AND at runtime. Use `NEXT_PUBLIC_` prefix for Next.js. |
| Capturing `error.message` but not the stack trace | Call `Sentry.captureException(err)`, not `Sentry.captureMessage(err.message)`. Message loses the trace. |
| Alerts configured by a different team than the on-call rotation | The person who gets paged must be the person who configures the alert threshold. |

## Red Flags
- PagerDuty/Opsgenie integration firing 20+ times/day — 90% are false positives or noise; re-tune thresholds
- Error rate dashboard showing 0 errors — the SDK is broken, not the application
- "We'll add error context when we need it later" — you need it when the error happens; retroactive context is impossible

**Error monitoring that pages you is worse than no monitoring if the alerts aren't actionable. Attach context at the error site, upload source maps in CI, and alert on impact (error rate per feature), not volume.**
