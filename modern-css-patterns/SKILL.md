---
name: modern-css-patterns
description: Use when adopting CSS @layer, container queries, :has(), or nesting in production, or migrating from Sass/SCSS to native CSS
---

# Modern CSS Patterns

## Overview
CSS released more features in 2023-2024 than the previous decade combined: cascade layers (`@layer`), container queries (`@container`), the `:has()` selector, native nesting, and `light-dark()`. These aren't syntactic sugar — they replace entire categories of JavaScript and preprocessor logic.

## When to Use
- Adopting CSS @layer to control precedence without specificity hacks
- Replacing media queries with container queries for reusable responsive components
- Using `:has()` to style parent elements based on children (previously impossible in CSS)
- Migrating from Sass/SCSS nesting to native CSS nesting

**Don't use when:** you need to support IE 11 or very old browsers — these features are 2022+. Don't use `@layer` on a 3-file stylesheet — the complexity isn't worth it. Don't mix Sass nesting with native CSS nesting in the same file.

## Core Workflow

**Step 1: Establish a cascade layer hierarchy and never use `!important` again.** Define layers in order of priority: `@layer reset, base, components, utilities;` — utilities wins over components, components over base. Put third-party CSS in its own layer: `@layer tailwind-base, my-app, tailwind-utilities;` — this guarantees your styles can override the framework. When a style isn't applying, check the layer order, not specificity. Layers with higher priority ALWAYS win, regardless of selector specificity within lower layers.

**Step 2: Replace media queries with container queries for reusable components.** A card component should adapt to ITS container width, not the viewport. `@container card (min-width: 400px) { .card { grid-template-columns: 1fr 1fr; } }`. Declare the container: `.card-wrapper { container-type: inline-size; container-name: card; }`. Now the card is self-contained — drop it in a 300px sidebar or an 800px main column and it styles itself correctly. Container queries eliminate the "which breakpoint does this component use?" question.

**Step 3: Use `:has()` to eliminate JavaScript visibility logic.** `form:has(input:invalid) .submit-btn { opacity: 0.5; pointer-events: none; }` — disable the submit button when any input is invalid, with zero JavaScript. `.sidebar:has(.active) { grid-template-columns: 250px 1fr; }` — expand the sidebar when it contains an active item. `:has()` is a parent selector: `.card:has(img) { padding: 0; }` — remove padding on image cards. It's supported in all modern browsers (Firefox 121+, Chrome 105+, Safari 15.4+).

## Quick Reference

| Scenario | Action |
|----------|--------|
| Utility class overridden by component CSS despite being "more important" | Put utilities in a higher `@layer` than components. Layer order beats specificity. |
| Component needs width-dependent styling but viewport media queries don't match | Use `container-type: inline-size` on the container + `@container` queries on the component. |
| JavaScript toggling a className to track whether a child has focus | `div:has(input:focus) { border-color: blue; }` — zero JavaScript, pure CSS. |
| Sass nesting that compiles to overly-specific selectors | Native CSS nesting with `&` — identical syntax, no compiler, and the browser handles specificity natively. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Adding `@layer` to every file without defining layer order | Layers follow first-encountered order. Define `@layer reset, base, components, utilities;` in your root CSS BEFORE any layer content. |
| `@container` queries not working | The container element must have `container-type` set (inline-size, size, or normal). It doesn't work on the container itself without it. |
| `:has()` used inside `:has()` creating performance cliffs | Nesting `:has()` triggers expensive style recalc. Keep `:has()` selectors shallow — one level. |

## Red Flags
- `!important` appearing more than 3 times in a stylesheet — adopt `@layer` to replace the specificity war
- Media query count growing linearly with component count — container queries make components self-styling
- Sass as a hard dependency for a feature supported by native CSS (nesting, variables, color functions)

**CSS is now a programming language for layout. Cascade layers dictate precedence, container queries make components self-aware, and :has() eliminates the last class of JavaScript-driven style logic. Adopt these one at a time — they replace the tools you already use.**
