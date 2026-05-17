---
name: shadcn-ui-patterns
description: Use when building UI with shadcn/ui, composing complex components, extending themes, or resolving shadcn/ui dependency conflicts
---

# shadcn/ui Patterns

## Overview
shadcn/ui is not a library — it's a copy-paste component architecture. Unlike npm packages, you own the code, which means you own the bugs and the upgrades. Success depends on understanding composition, theme extension, and the upgrade model.

## When to Use
- Building a new React/Next.js project and choosing a UI component system
- Extending shadcn/ui beyond the default theme tokens
- Building a design system that wraps shadcn/ui primitives
- Composing 3+ shadcn/ui components into reusable business components

**Don't use when:** you want zero-effort updates (use Material UI or Ant Design). Don't use on a project that won't maintain its own component code. Don't mix with CSS-in-JS runtime libraries — shadcn/ui is built on Tailwind's compile-time approach.

## Core Workflow

**Step 1: Lock the theme tokens before building components.** Edit `globals.css` to define every token you need upfront — `--primary`, `--radius`, `--sidebar-background`, and semantic tokens like `--destructive`, `--success`, `--warning`. Never use raw Tailwind values like `bg-blue-500` in components; always reference tokens via `bg-primary` or custom utilities. The theme file is a contract: break it without updating all consumers and your design drifts.

**Step 2: Compose with `asChild` and variants, not props.** shadcn/ui's power is Radix primitives + cva/variants. When building a `DataTable` header that needs to be both a button and a link, use `asChild` (Radix Slot) — don't fork the component. Extend variants via `cva` instead of adding boolean props: `{ variant: 'destructive' | 'outline' | 'ghost' }` scales; `{ isDestructive: boolean, isOutlined: boolean }` doesn't.

**Step 3: Handle upgrades with `npx shadcn@latest diff`.** Run `npx shadcn diff` to see upstream changes before merging. When upstream changes a component you've customized, port your diff into the new version manually. Never blindly `npx shadcn add` over a customized component — it overwrites your changes. Keep customized components in `components/custom/` separate from stock `components/ui/`.

**GOOD:**
```tsx
// cva variant system — scales, type-safe, theme-consistent
import { cva, type VariantProps } from 'class-variance-authority';

const badge = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      success: 'bg-success text-success-foreground',
      warning: 'bg-warning text-warning-foreground',
    },
    size: { sm: 'px-2 text-[10px]', md: 'px-2.5 py-0.5 text-xs' },
  },
  defaultVariants: { variant: 'default', size: 'md' },
});

export function Badge({ variant, size, className }: VariantProps<typeof badge> & { className?: string }) {
  return <span className={badge({ variant, size, className })} />;
}
```

**BAD:**
```tsx
// boolean props — combinatorial explosion, no constraints, ugly ternary chains
interface BadgeProps {
  isSuccess?: boolean;
  isWarning?: boolean;
  isSmall?: boolean;
  children: React.ReactNode;
}

export function Badge({ isSuccess, isWarning, isSmall, children }: BadgeProps) {
  let cls = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ';
  if (isSuccess) cls += 'bg-green-500 text-white ';     // hardcoded color — dark mode breaks
  if (isWarning) cls += 'bg-yellow-500 text-black ';
  if (isSmall) cls += 'px-2 text-[10px] ';
  return <span className={cls}>{children}</span>;
}
// Adding "isDanger" later means adding another boolean, another ternary, another test.
// This does not scale past 3 variants.
```

**GOOD:**
```tsx
// asChild composition — Radix Slot preserves accessibility tree
import { Slot } from '@radix-ui/react-slot';

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, variant, size, className, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={buttonVariants({ variant, size, className })} ref={ref} {...props} />;
  }
);
```

**BAD:**
```tsx
// forking a component to support both <button> and <a> — duplicates logic, breaks a11y
interface ButtonProps { href?: string; onClick?: () => void; children: React.ReactNode; }

export function Button({ href, onClick, children }: ButtonProps) {
  if (href) {
    return <a href={href} className={styles} onClick={onClick}>{children}</a>;  // <a> without href? broken
  }
  return <button className={styles} onClick={onClick}>{children}</button>;
}
// Every behavior change (loading state, disabled, tooltip) must be updated in TWO places.
```

**GOOD:**
```css
/* globals.css — theme tokens as CSS variables, dark mode built in */
@layer base {
  :root {
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --radius: 0.5rem;
  }
  .dark {
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
  }
}
```

**BAD:**
```tsx
/* hardcoded Tailwind colors — no dark mode, no theme consistency */
<button className="bg-blue-500 hover:bg-blue-600 text-white">
  Submit
</button>
/* What does "blue-500" mean in dark mode? Nothing. It's the same blue on white bg — invisible. */
```

## Quick Reference

| Scenario | Action |
|----------|--------|
| Theme token not applying to a component | Check `globals.css` — shadcn components reference CSS variables, not hardcoded values |
| Radix breaking change in upgrade | Pin `@radix-ui/*` versions until `npx shadcn diff` confirms compatibility |
| Building a complex form with 10+ fields | Compose `FormField` + `FormItem` + `FormControl` wrappers; never inline shadcn primitives directly |
| Dark mode flickers on load | Add `suppressHydrationWarning` to `<html>` and use `next-themes` `ThemeProvider` with `attribute="class"` |

## Common Mistakes

| Mistake | Fix |
|---------|------|
| Copying a component, customizing it, then running `shadcn add` again on it | Keep custom copies in a separate directory. `shadcn add` overwrites `ui/` components. |
| Using raw Tailwind `bg-white` instead of `bg-background` | Never hardcode colors. Every color must come from a CSS variable so dark mode works. |
| Installing shadcn/ui as a package (`@shadcn/ui` doesn't exist) | shadcn/ui is `npx shadcn@latest init` then `npx shadcn@latest add <component>`. No npm install. |

### Anti-Patterns — Reject on Sight
- `isPrimary` / `isLarge` / `isGhost` boolean props — combinatorial explosion of booleans instead of a single `variant` string. Every new visual style adds another boolean, another ternary, and another test case. Use `cva` variants.
- `npm install shadcn-ui` — no such package exists. shadcn/ui is a CLI tool (`npx shadcn@latest`). Installing a fake npm package means you got a different project entirely (or a typosquatted malicious package).
- Direct DOM `getElementById` or `querySelector` in shadcn components — bypasses Radix's accessible component primitives. Radix handles keyboard navigation, focus management, and aria attributes. Raw DOM access in a shadcn project means you're not using the framework.
- Modifying `node_modules/@radix-ui/*` directly — these are npm dependencies. Changes vanish on `npm install`. Fork via `npx shadcn add` and customize the copied component in `components/ui/`.

## Red Flags
- Component files growing past 200 lines — extract sub-components; ownership model means YOU maintain it
- 3+ developers writing inline custom styles instead of extending theme tokens — the design system has no enforcement
- `shadcn diff` returning 15+ changed files you've never touched — you're frozen on an old version and drifting into fork territory

**shadcn/ui gives you ownership. If you're not willing to maintain component code, switch to a library that ships a versioned package.**
