---
name: accessibility-testing
description: Use when adding CI/CD a11y gates, fixing Lighthouse audit failures, integrating axe-core into tests, or meeting WCAG 2.2 deadlines
---

# Accessibility Testing

## Overview
Accessibility testing fails because teams bolt it on at the end. Automated tools catch 30-40% of issues; the rest need manual verification. The winning strategy: automate what machines can detect, checklist what they can't, and gate your CI on the automated subset — so the 30% that's cheap to catch never ships.

## When to Use
- WCAG 2.2 AA compliance is required (legal mandate or client contract)
- Lighthouse a11y score is below 90 and you don't know where to start
- Building a CI pipeline that must reject inaccessible PRs
- Adding a11y checks to an existing Playwright, Cypress, or Testing Library test suite

**Don't use when:** your only goal is "pass Lighthouse 100" — machine-passing does not equal usable. Don't use a11y tools to block a launch if you haven't run them before — add gates incrementally.

## Core Workflow

**Step 1: Gate CI on `@axe-core/playwright` (or Cypress equivalent).** Install `@axe-core/playwright`, inject it into existing E2E tests: `await new AxeBuilder({ page }).analyze()`. Fail the build on `critical` and `serious` violations. Ban `{ "color-contrast": { enabled: false } }` in axe config — contrast bugs are the #1 real-world a11y complaint. Set `axe-core` tag rules: `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`. Disable `best-practice` rules initially to avoid alert fatigue.

**Step 2: Run `eslint-plugin-jsx-a11y` on every PR.** Add to `.eslintrc`: `plugin:jsx-a11y/recommended`. The non-negotiable rules: `anchor-is-valid`, `alt-text`, `aria-role`, `heading-has-content`, `no-autofocus`. Make these `"error"` level, not `"warn"`. Fix: `<div onClick={handler}>` must be `<button onClick={handler}>` or get `role="button" tabIndex={0} onKeyDown={...}`. The lint rule catches this before it reaches the DOM.

**Step 3: Manual-audit the 60% that automation misses.** For every new component, check: Tab through it (keyboard-only navigation), test with screen reader (VoiceOver on Mac, NVDA on Windows), zoom to 200% (content must not truncate), and verify focus rings are visible. Record the audit in a checklist next to the component, not in a separate doc that drifts.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Lighthouse flags contrast but it looks fine visually | Trust the machine. Contrast ratio must meet 4.5:1 (normal text) and 3:1 (large text) mathematically. |
| axe-core finds 50+ violations on first run | Filter by `serious` + `critical` only. Fix those first. Tackle `moderate` in a follow-up PR. |
| Focus ring visible on click but not keyboard tab | Use `:focus-visible` not `:focus`. Browsers suppress `:focus` rings on mouse clicks. |
| Modal opens but focus stays on background | Trap focus: move focus to modal's first focusable element on open, lock Tab inside modal, restore on close. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Adding `aria-label` to a `<div>` without a role | `aria-label` is ignored on elements without a semantic or explicit role. Use `<button>` or add `role="button"`. |
| `color: #767676` on white background | Fails 4.5:1 contrast. Darken to at least `#595959` or bump font to 18.66px+ bold (qualifies for 3:1 large text threshold). |
| Testing only with mouse and calling it done | Keyboard navigation breaks are the most common a11y bug. Tab through EVERY new component. |

## Red Flags
- PR template asks "Does this affect accessibility?" with no automated enforcement — the answer is always "no" under deadline pressure
- axe-core configured with violations threshold > 0 — the gate is decorative, not functional
- Design mockups using `#999999` for body text — the designer hasn't checked contrast; this guarantees a last-minute color scramble

**Automate the 30% machines can catch, gating CI on it. Keyboard-test the rest. Accessibility debt grows silently — only automated gates prevent it.**
