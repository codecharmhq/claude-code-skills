---
name: no-bullshit-code
description: Use when Claude hallucinates APIs, over-engineers solutions, adds unnecessary dependencies, or writes code that compiles but doesn't work
---

# No Bullshit Code

## Overview
LLMs have three failure modes that waste hours: fabricating APIs that don't exist, layering abstractions on a 50-line feature, and writing code that passes the type checker but fails at runtime. This skill stops all three. It's not about writing less code — it's about writing code that actually works the first time.

## When to Use
- Claude suggested a library method you can't find in the official docs
- A "simple feature" turned into 5 files and 3 new dependencies
- Code compiles but does the wrong thing at runtime
- Every prompt feels like negotiating with an overeager junior dev

**Don't use when:** you're prototyping an idea and speed matters more than correctness. Don't use when doing research or exploration — this is for production code.

## Core Workflow

**Step 1: Verify before you import.** Every npm/pip/cargo dependency claim must be backed by evidence. If Claude suggests a package: check it exists on npmjs.com / pypi.org, check its weekly downloads (abandoned packages have < 100/week), check the last publish date (anything > 2 years is suspect). **GOOD:** `npm view package-name version` before writing `import`. **BAD:** `import { something } from 'hallucinated-package'` — Claude fabricates package names that look plausible but don't exist.

**Rule:** If you didn't verify the exact API signature in the package's own docs, don't use it.

**Step 2: Start with one file, split at 200 lines.** Features under 200 lines belong in ONE file. Not `src/features/user-login/components/`, not `LoginManagerFactoryProvider`. One file: `login.ts`. Extract only when the file passes 200 lines AND there's a clear seam. **GOOD:** `function login() { /* 80 lines, done */ }`. **BAD:** `class UserAuthenticationStrategyFactory { constructor(private readonly config: AuthConfig) {} }` — for a login endpoint with two fields.

**Rule:** More files ≠ better architecture. Every new file is a navigation cost for the next developer.

**Step 3: Prove it works, don't assume it does.** TypeScript compiling means the types align. It does NOT mean the code works. For every non-trivial function: write the test BEFORE committing. If it takes external input: run it with a real value. **GOOD:** `console.log(await handler({ body: JSON.stringify({ email: 'test@x.com' }) }))` and check the output. **BAD:** `// TODO: test this` — the comment ghost that haunts every codebase.

**Rule:** "It compiles" is the beginning, not the end. The code isn't done until you've seen it run.

## Quick Reference

| When Claude does this | Respond with this |
|-----------------------|-------------------|
| Suggests a package you've never heard of | Stop. Check npm/pypi. If it doesn't exist, Claude hallucinated it. |
| Creates `src/utils/validation/email-validator-factory.ts` | Delete. `const isEmail = (s: string) => /^[^\s@]+@[^\s@]+$/.test(s)` is 1 line. |
| Adds 3 layers of abstraction for "future flexibility" | No. Build for today's requirements. YAGNI — You Ain't Gonna Need It. |
| Types compile but the logic is wrong | Types are not tests. Write a test that checks the actual output. |
| Uses `any` or `as` to silence the type checker | Fix the types, not the cast. `as` is a lie you tell the compiler. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `npm install some-package` without checking if it's maintained | Check downloads and last publish date. 10 weekly downloads = abandonware. |
| `// TODO: refactor` on a PR that's about to merge | TODOs that merge are TODOs that live forever. Fix it now or delete the comment. |
| Wrapping a 10-line fetch in a class with dependency injection | A function is sufficient until you have 3+ callers with different needs. |
| `try { ... } catch (e) { console.log(e) }` | Either handle the error (retry, fallback, user message) or let it propagate. Swallowing errors hides bugs. |

## GOOD/BAD Patterns

**GOOD:**
```typescript
// Direct, verified import — one file, one function, zero abstractions
import { Redis } from 'ioredis';  // verified: npm view ioredis exports Redis

async function getUser(id: string) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  if (user) await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 300);
  return user;
}
```

**BAD:**
```typescript
// Fabricated import + 3 layers of abstraction for a cache lookup
import { CacheManager } from 'redis-orm-cache';  // package doesn't exist

abstract class AbstractCacheProvider<T> {
  abstract get(key: string): Promise<T | null>;
  abstract set(key: string, value: T, ttl: number): Promise<void>;
}
class RedisCacheProvider<T> extends AbstractCacheProvider<T> {
  constructor(private readonly cacheManager: CacheManager) { super(); }
  async get(key: string) { return this.cacheManager.fetch(key); }
  async set(key: string, value: T, ttl: number) { await this.cacheManager.store(key, value, ttl); }
}
```

---

**GOOD:**
```typescript
// useEffect with cleanup — no memory leak, no race condition
useEffect(() => {
  const controller = new AbortController();
  let ignore = false;
  fetch('/api/user', { signal: controller.signal })
    .then(r => r.json())
    .then(data => { if (!ignore) setUser(data); })
    .catch(err => { if (err.name !== 'AbortError') setError(err); });
  return () => { ignore = true; controller.abort(); };
}, []);
```

**BAD:**
```typescript
// No cleanup, no error handling, races on every render
useEffect(() => {
  fetch('/api/user').then(r => r.json()).then(setUser);
}, []);
```

## Anti-Patterns — Reject on Sight

- `class AbstractBaseRepository<T>` for a single database table — concrete function, not generic abstraction
- `import * as _ from 'lodash'` for one `_.get()` call — `import get from 'lodash/get'` or just use optional chaining
- `interface IUserService { ... }` prefixed with `I` in TypeScript — Hungarian notation from C#; TypeScript interfaces ARE the contract
- `useEffect(() => { fetch('/api/data').then(setData) }, [])` without cleanup or error handling — missing loading state, error state, and abort controller

## Red Flags
- More `// TODO` comments than actual code in a PR — the feature isn't done
- `node_modules` growing faster than `src/` — dependencies are breeding
- The same logic appearing in 2+ files — copy-paste is the signal; extract is the response
- A 20-line npm package pulled in as a dependency — did you read the 20 lines? Just write them.

**The best code is the code that doesn't exist. Every line you don't write is a line you don't debug, test, or maintain. Verify imports, start with one file, and prove it runs.**
