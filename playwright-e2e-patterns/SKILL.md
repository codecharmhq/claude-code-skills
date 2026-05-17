---
name: playwright-e2e-patterns
description: Use when writing Playwright E2E tests, structuring fixtures, mocking API responses, or debugging flaky tests in CI pipelines
---

# Playwright E2E Patterns

## Overview
Playwright is the tool; reliability is the challenge. Flaky tests erode trust until the suite is ignored. The patterns that prevent flakiness: web-first assertions (not `page.waitForTimeout`), route-based API mocking (not stub servers), and fixture composition (not inheritance).

## When to Use
- Writing E2E tests for a web app and need them to pass consistently in CI
- Replacing Cypress, Selenium, or Puppeteer with Playwright
- Mocking backend API calls so tests run without a live backend
- Debugging why a test passes locally but flakes in CI (viewport, timing, parallelism)

**Don't use when:** testing a single function's logic — that's a unit test. Don't use for API-only testing — Playwright tests the browser DOM. Don't E2E test what Jest/Vitest can test faster — reserve E2E for critical user flows only.

## Core Workflow

**Step 1: Replace all `waitForTimeout` with web-first assertions.** Every `await page.waitForTimeout(3000)` is a flaky test in disguise. Playwright's web-first assertions retry automatically: `await expect(page.getByText('Success')).toBeVisible({ timeout: 10000 })` — this polls the DOM for up to 10 seconds, passing immediately when the element appears. Never wait for arbitrary time; wait for a specific DOM condition. Network idle: `await page.waitForLoadState('networkidle')`. Navigation: `await page.waitForURL('**/dashboard')`. Element: `await page.getByRole('button', { name: 'Submit' }).waitFor()`.

**Step 2: Mock API responses at the network layer with `page.route`.** `await page.route('**/api/users/**', (route) => route.fulfill({ status: 200, body: JSON.stringify(mockUsers) }))`. This intercepts the browser's actual network request — the app code runs unchanged. Compare to stubbing: stubs replace module imports and bypass real network handling. `page.route` tests the full pipeline including fetch headers, error handling, and loading states. Use `route.continue()` to let a request through while modifying the response — useful for adding test headers.

**Step 3: Structure tests with fixtures, not Page Objects.** Page Objects (class-based) create inheritance chains that break at 3+ levels. Playwright fixtures are compositional: `const test = base.extend<{ loginPage: LoginPage }>({ loginPage: async ({ page }, use) => { await use(new LoginPage(page)); } })`. Fixtures auto-teardown, support dependencies, and compose without inheritance. For shared setup across tests, use `test.describe` with `beforeEach` that calls fixtures, not superclass constructors.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Test flakes in CI but passes locally | Check viewport size (`use: { viewport: { width: 1280, height: 720 } }`), `--trace on-first-retry`, and parallelism (CI often shares CPUs) |
| Button click targets wrong element | Use `getByRole('button', { name: 'Submit' })` — role-based selectors are more resilient than text or CSS class |
| File upload test needs to assert on uploaded content | `await page.setInputFiles('input[type="file"]', './fixtures/test-image.png')` — no dialog, direct DOM interaction |
| `page.evaluate` returns stale value | Playwright serializes JS values. Use `page.evaluate(() => document.title)` not `page.evaluate('document.title')`. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `page.click('.btn-primary')` and the button isn't visible yet | Never click before visibility. Prepend `await expect(page.locator('.btn-primary')).toBeVisible()`. |
| Mocking `fetch` with `page.evaluate` instead of `page.route` | `page.route` intercepts at the protocol level, works for all request types, and doesn't modify your app code. |
| `--workers=10` in CI on a 2-core runner | Each worker runs a full browser. Limit workers to `os.cpus().length - 1` or less. |

## Red Flags
- More than 5 `page.waitForTimeout()` calls in the test suite — at least 3 of them will flake under load
- Test file with 10+ `test()` blocks and no `test.describe` grouping — tests aren't sharing setup efficiently
- Console errors in browser logs that the test ignores — add `page.on('console', ...)` or `page.on('pageerror', ...)` listeners

**Reliable E2E tests don't wait for time — they wait for conditions. Use web-first assertions, route-based mocking, and composable fixtures. Every `waitForTimeout` is a future flake ticket.**
