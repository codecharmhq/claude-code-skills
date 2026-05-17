---
name: tailwind-v4-migration
description: Use when migrating from Tailwind v3 to v4, converting config to CSS-first, using the @theme directive, or fixing breaking changes in class names and plugins
---

# Tailwind v4 Migration

## Overview
Tailwind v4 is the most significant architecture change in the framework's history: zero-config by default, CSS-first theme definition via `@theme`, automatic content detection, and native CSS cascade layer integration. The `tailwind.config.js` file is gone. The migration is mechanical but non-trivial — every custom theme value, plugin, and `@apply` usage needs review.

## When to Use
- Migrating an existing Tailwind v3 project to v4
- Configuring a new project with Tailwind v4 and need to port v3 knowledge
- Custom theme values, plugins, or `@apply` directives broke after upgrading
- Evaluating whether to adopt v4 now or wait for ecosystem stability

**Don't use when:** the project has 50+ custom Tailwind plugins — plugin ecosystem compatibility is still catching up. Don't migrate a week before a release — the migration can take 2-4 hours for medium projects. Don't use v4 if you depend on a third-party UI library that ships its own `tailwind.config.js`.

## Core Workflow

**Step 1: Convert `tailwind.config.js` to CSS-first theme.** v3 config `theme.extend.colors.primary` becomes `@theme { --color-primary: #3b82f6; }` in your main CSS file. v3 `theme.extend.fontFamily` becomes `@theme { --font-sans: 'Inter', sans-serif; }`. v3 `theme.extend.spacing` becomes `@theme { --spacing-18: 4.5rem; }`. The conversion is one-to-one but the syntax shifts from JS objects to CSS custom properties. Key difference: v4 theme values are exposed as design tokens that can be referenced in any CSS file, not just Tailwind utilities.

**Step 2: Replace `@apply` with native CSS or component composition.** v4 still supports `@apply` but the directive is increasingly discouraged. v3 pattern: `.btn { @apply px-4 py-2 bg-primary text-white rounded; }`. v4 approach: use the utility classes directly in JSX/HTML, or define a component. For truly reusable styles, use `@layer components { .btn { ... } }` with CSS custom properties referencing theme tokens: `background: var(--color-primary)`. The `@apply` directive in v4 does not support `!important` — if you need it, use CSS directly.

**Step 3: Audit custom plugins and remove v3-only patterns.** v3 plugins using `addComponents`, `addUtilities`, or `addBase` need rewriting as CSS `@layer` rules. v3 `tailwind.config.js` `content` paths are replaced by auto-detection — remove them and verify with `npx @tailwindcss/cli --dry-run` that all classes are detected. v3 arbitrary values like `w-[327px]` and `bg-[#bada55]` still work. v3 `@screen` directive is removed — use `@media` directly or Tailwind's responsive utilities.

## Quick Reference

| Scenario | Action |
|----------|--------|
| v3 `darkMode: 'class'` no longer works | v4: `@custom-variant dark (&:where(.dark, .dark *))` or use `prefers-color-scheme` default |
| `content` paths from v3 config lost | v4 auto-detects. Only add `@source` if files outside `./src` use Tailwind classes. |
| Custom v3 plugin that added `.btn-ghost` utility | Rewrite as `@utility .btn-ghost { background: transparent; border: 1px solid var(--color-border); }` in CSS |
| `tailwind.config.js` `important: true` no longer applies | v4 default is `:not(#\#)` prefix. Configure with `@config { important: true }` in CSS. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Still importing `tailwindcss/tailwind.css` (v3 entry) | v4 entry: `@import "tailwindcss"` (no file extension, no path). This is the only required import. |
| `@theme` values not available in arbitrary values | v4 theme tokens are CSS properties. Reference them: `bg-[var(--color-primary)]` or just use the utility `bg-primary`. |
| Running `npx tailwindcss init` to generate config | v4 doesn't need a config file. The init command generates a `tailwind.config.ts` that's v3 format — don't use it. |

## Red Flags
- `@import "tailwindcss/tailwind.css"` still in your CSS — this is the v3 entry point and will break silently or partially
- 20+ `@apply` directives in a single CSS file — these were a workaround for v3's limitations; refactor to component composition
- `tailwind.config.js` still in the repo after migration — someone will edit it thinking it's the source of truth

**Tailwind v4 is a CSS-first framework. The config file is dead; theme tokens are CSS properties; auto-detection replaces content paths. The migration is mechanical but every custom plugin and @apply directive needs manual review.**
