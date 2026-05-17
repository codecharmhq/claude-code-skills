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

**GOOD:**
```ts
// Web-first assertion — polls DOM, passes immediately when condition met
await expect(page.getByText('Payment successful')).toBeVisible({ timeout: 10000 });
// No arbitrary waits. Passes in 200ms if element is already there.
```

**BAD:**
```ts
// Arbitrary timeout — flaky by design
await page.waitForTimeout(3000);
await expect(page.getByText('Payment successful')).toBeVisible();
// On a fast network: wasted 3 seconds. On a slow CI machine: 3 seconds might not be enough.
// Every waitForTimeout is a scheduled flake.
```

**GOOD:**
```ts
// Route-based API mocking — tests the full fetch pipeline
await page.route('**/api/users/**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockUsers),
  });
});
await page.goto('/users');
await expect(page.getByText(mockUsers[0].name)).toBeVisible();
// App code runs unchanged. Loading states, error boundaries, network retries all execute normally.
```

**BAD:**
```ts
// Stubbing fetch via page.evaluate — bypasses real network handling
await page.evaluate(() => {
  globalThis.fetch = (url: string) => {
    if (url.includes('/api/users')) {
      return Promise.resolve(new Response(JSON.stringify(mockUsers)));
    }
    return Promise.reject(new Error('Unknown URL'));
  };
});
// Does NOT test: fetch headers, network errors, timeout handling, retry logic.
// Modifies global state — leaks between tests if not cleaned up.
```

**GOOD:**
```ts
// Fixture composition — auto-teardown, dependency resolution, no inheritance
import { test as base, expect } from '@playwright/test';

type MyFixtures = {
  authPage: AuthPage;
  dashboardPage: DashboardPage;
};

const test = base.extend<MyFixtures>({
  authPage: async ({ page }, use) => {
    const auth = new AuthPage(page);
    await auth.login();
    await use(auth);
    await auth.logout();  // auto-teardown
  },
  dashboardPage: async ({ authPage, page }, use) => {
    await use(new DashboardPage(page));
  },
});

test('dashboard shows widgets', async ({ dashboardPage }) => {
  await expect(dashboardPage.widgetGrid()).toBeVisible();
});
```

**BAD:**
```ts
// Page Object inheritance — rigid, breaks at 3+ levels
class BasePage { protected page: Page; constructor(page: Page) { this.page = page; } }
class AuthPage extends BasePage { async login() { ... } }
class DashboardPage extends AuthPage { }   // inherits login() — but what if dashboard page doesn't have a login form?
class AdminDashboardPage extends DashboardPage { }  // 3 levels deep, all parent methods exposed
// Adding a method to BasePage affects ALL pages — even those where it makes no sense.
```

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

### Anti-Patterns — Reject on Sight
- `page.$eval()` or `page.$$eval()` for DOM interaction — these evaluate arbitrary DOM selectors as strings and bypass Playwright's auto-waiting and retry-ability. Use `page.locator()`, `page.getByRole()`, or `page.getByText()` which automatically wait for the element to be actionable.
- `test.fixme` (or `test.skip`) committed to the main branch — skipped tests silently erode coverage. A test marked `fixme` is a test no one looks at again. Create a tracking issue and only skip when absolutely necessary with a link to the issue.
- `--headed` mode in CI — headed mode in CI is slower, consumes more memory, and provides no visual benefit (no human watches the screen). Use `--headless` in CI and save headed mode for local debugging with `--debug`.
- Mocking `fetch` globally in `setup` hooks — a global fetch mock affects every test, even tests that test fetch logic itself. Use `page.route()` for per-test or per-describe API mocking, which scopes to the specific page context.
- `page.waitForNavigation()` (deprecated) — Playwright's navigation auto-waits. Clicking a link that triggers navigation: `await page.getByText('Go to dashboard').click();` already waits for navigation to complete. Explicit `waitForNavigation` is redundant and causes timeouts when navigation happens faster than the waiter registers.

## Red Flags
- More than 5 `page.waitForTimeout()` calls in the test suite — at least 3 of them will flake under load
- Test file with 10+ `test()` blocks and no `test.describe` grouping — tests aren't sharing setup efficiently
- Console errors in browser logs that the test ignores — add `page.on('console', ...)` or `page.on('pageerror', ...)` listeners

**Reliable E2E tests don't wait for time — they wait for conditions. Use web-first assertions, route-based mocking, and composable fixtures. Every `waitForTimeout` is a future flake ticket.**
