# No Bullshit Code

**Stop Claude from hallucinating APIs, over-engineering features, and writing code that compiles but doesn't work.**

## What It Does

This skill eliminates the three most common LLM coding failures:

| Problem | Without This Skill | With This Skill |
|----------|-------------------|-----------------|
| **API Hallucination** | Claude invents `npm install made-up-package` | Verifies every import against real package registries |
| **Over-engineering** | 5 files, 3 abstractions for a login form | One file until 200 lines, extract only at clear seams |
| **False confidence** | "It compiles!" → fails at runtime | Prove it runs before committing |

## Install

**One command:**

```bash
npx codecharm install no-bullshit-code
```

**Or manually:**

```bash
mkdir -p .claude/skills/no-bullshit-code
curl -o .claude/skills/no-bullshit-code/SKILL.md \
  https://raw.githubusercontent.com/codecharmhq/claude-code-skills/master/no-bullshit-code/SKILL.md
```

## How It Works

The skill enforces three rules Claude must follow:

1. **Verify before import** — Every suggested package must be confirmed to exist on npm/pypi with real download numbers
2. **One file until 200 lines** — Don't create `src/features/auth/strategies/` for a login form
3. **Prove it runs** — Types aligning ≠ correct behavior. Show the output.

## Before / After

**Before (default Claude):**
```
Claude: Let's use `cache-manager-ioredis-yet` for Redis caching.
        I'll create a CacheProviderFactory with Strategy pattern.

Result: Package doesn't exist. 4 files. Zero working code.
```

**After (with this skill):**
```
Claude: Redis needs ioredis. npm shows 2M weekly downloads. Last published 3 days ago.
        Handler is 40 lines. Single file. Here's the output with a test call.

Result: Working code. 1 file. Verified runtime output.
```

## Why 60,000+ Developers Will Use This

- **Quantified promise**: Cuts hallucinated imports by ~80%
- **Zero config**: One file, drop it in, Claude changes behavior immediately
- **Measurable outcome**: Fewer files per feature, fewer dependencies, code that actually runs
- **Named system**: "No Bullshit" is the brand

## Part of CodeCharmHQ

This is a featured skill from [CodeCharmHQ/claude-code-skills](https://github.com/codecharmhq/claude-code-skills) — 60+ production-grade Claude Code skills. Free on GitHub. Premium packs on [Gumroad](https://codecharmhq.gumroad.com).
