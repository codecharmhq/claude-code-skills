---
name: agent-code-review
description: Use when reviewing AI-generated code, detecting LLM hallucinations in code, or catching anti-patterns Claude/GPT/Copilot commonly produce
---

# Agent Code Review — AI Output Quality Guard

## Overview
AI coding agents produce code that compiles but is wrong. They hallucinate APIs, over-engineer solutions, add phantom dependencies, and write code that passes type checks but fails at runtime. This skill turns Claude into a second agent that reviews the first agent's output — catching fabricated imports, impossible states, and security holes before they reach production.

## When to Use
- After any AI agent generates a significant chunk of code (50+ lines)
- Before committing AI-generated code to your repo
- When an AI-written function "looks right" but you can't verify every import
- Setting up CI/CD gates that auto-review AI-generated PRs

**Don't use when:** reviewing human-written code — use `code-review-workflow`. Don't use for one-liner fixes.

## Core Workflow

**Step 1: Verify every import and dependency.** AI models fabricate library APIs. For every `import` in the generated code, verify: Does this package exist on npm/PyPI/crates.io? Does this specific export exist in this version? Is the version compatible with the rest of the project? Run `npm view <package>` or equivalent before accepting the code.

**Step 2: Check for impossible states and logic errors.** AI generates code that handles the happy path but ignores edge cases: null/undefined, empty arrays, failed network requests, invalid user input, race conditions. For every function: What happens if the input is empty? What if the API call fails? What if two requests overlap? Trace each path.

**Step 3: Detect AI over-engineering patterns.** AI loves unnecessary abstractions: `AbstractBaseRepository<T>`, `interface IUserService`, `class UserFactoryFactory`. These are clues the code was AI-generated without real constraints. Flag any abstraction that doesn't have at least 3 concrete implementations or that wraps a single function call.

**GOOD:**
```ts
// After AI generates code, run this checklist:
// 1. npm view next-auth@4.24.5 — exists? yes
// 2. next-auth/providers/github — real export? yes
// 3. Null checks: session?.user?.email — handled? yes
// 4. Error state: auth fails — shows error message, not blank screen
// 5. No unnecessary abstractions — direct API usage

import NextAuth from 'next-auth';
import Github from 'next-auth/providers/github';

export const { handlers, auth, signIn } = NextAuth({
  providers: [Github({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET })],
  callbacks: {
    session({ session, token }) {
      if (session.user) session.user.id = token.sub!;
      return session;
    },
  },
});
```

**BAD:**
```ts
// AI hallucination — these don't exist in next-auth v4
import { createAuthHandler, AuthMiddleware } from 'next-auth/server';  // FABRICATED
import { GithubProvider } from 'next-auth';  // Real is next-auth/providers/github
import { useSession } from 'next-auth/client';  // v4 uses next-auth/react

// AI over-engineering — wraps a single call in 3 classes
class AuthServiceFactory {
  static create(): IAuthService {
    return new AuthService(new GithubAdapter());
  }
}
// Just call NextAuth directly.
```

## Quick Reference

| AI Pattern | Detection | Fix |
|-----------|-----------|-----|
| `import { X } from 'package'` | Run `npm view package exports` — does X exist? | Replace with correct import path |
| `class AbstractX<T>` | Count concrete implementations — 0 or 1? | Delete the abstraction, use the concrete code |
| `useEffect(() => { fetch() })` | Missing cleanup, race condition | Add AbortController + cleanup |
| `try { ... } catch { /* empty */ }` | Silently swallows errors | Add error reporting or re-throw |
| `as unknown as T` | Type assertion escape hatch | Fix the types; this is a lie |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Trusting the AI's import paths | Verify every import against the actual package docs |
| Not checking for null/undefined | Trace every data path — where can null appear? |
| Accepting `any` as "temporary" | AI's `any` stays forever; fix before commit |

### Anti-Patterns — Common AI-Generated Code Smells
- `import * as _ from 'lodash'` — tree-shaking bypass, AI doesn't understand bundle size
- `isLoading ? <Spinner/> : data ? <Content/> : <Empty/>` — AI's ternary nesting gets ugly fast
- `useEffect` with API calls and no cleanup — race condition factory
- `interface IUserService` with single implementation — Java-in-TypeScript, AI's favorite abstraction
- `console.log` scattered everywhere instead of structured logging — AI doesn't know logging infra
- `new Date().toISOString().split('T')[0]` — AI's date handling is always fragile
- Hardcoded magic strings like `'sk-...'` — AI doesn't respect secrets management

## Red Flags
- Every file imports `lodash` but only uses `_.get` — AI cargo-cults imports
- Abstract base classes with "Base", "Abstract", "Core" in the name — AI abstraction addiction
- Type assertions (`as`, `!`, `any`) used to silence type errors instead of fixing them
- Empty catch blocks or `catch (e) { console.log(e) }` — AI doesn't know your error handling strategy

**AI writes code that looks right. This skill makes it actually right. Every AI-generated import is a potential lie — verify first, commit second.**
