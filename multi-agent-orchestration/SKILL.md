---
name: multi-agent-orchestration
description: Use when coordinating 3+ Claude agents for complex tasks, designing agent pipelines, or debugging agent race conditions and context isolation issues
---

# Multi-Agent Orchestration

## Overview
One Claude agent is a smart junior developer. Three Claude agents, properly orchestrated, is an engineering team. The hard part isn't spawning agents — it's dividing work so agents don't step on each other, merging results without conflicts, and keeping each agent's context focused enough to be useful. This skill patterns the coordination, not the individual agent behavior.

## When to Use
- A task is too large for one agent's context window (refactoring 20+ files, auditing an entire codebase)
- Work can be naturally parallelized (research 5 APIs, review 10 PRs, test 8 endpoints)
- You need independent verification (one agent writes code, another reviews it)
- Tasks require different expertise (one agent analyzes security, another optimizes performance)

**Don't use when:** the task fits in one session with one agent. Don't use for simple parallel file reads — the Explore agent handles that. Don't spawn agents to ask questions you could answer with a grep.

## Core Workflow

**Step 1: Decompose by artifact, not by step.** Give each agent ownership of a specific output file or research domain. Agent A owns `auth.ts`, Agent B owns `database.ts`, Agent C writes tests. Agents with clear file ownership don't conflict. Never assign two agents to the same file — merging their output is harder than writing it fresh.

**Step 2: Brief each agent like a senior engineer joining a new project.** Include: what problem we're solving, what files are off-limits, what the output format is, what decisions are already made. Every agent needs context on the 3 files adjacent to its work — not the whole codebase. A 100-line brief produces better output than a 10-line brief with the entire repo dumped into context.

**Step 3: Merge results with a synthesis pass.** After agents complete, run one synthesis step: check for interface mismatches (Agent A's `createUser()` takes `email`, Agent B's `getUser()` returns `userId`), resolve naming conflicts, verify cross-agent interfaces align. The synthesis agent reads only the outputs, not the full codebase.

**GOOD:**
```ts
// Agent A brief — focused, specific, boundary-enforcing
/**
 * Task: Implement auth.ts with email/password and OAuth2
 * Owns: src/auth.ts, src/middleware/auth.ts
 * Off-limits: src/database.ts (Agent B), src/api/ (Agent C)
 * Interfaces you must match:
 *   - import { createUser } from '../database' (returns { id: string, email: string })
 *   - import { AppError } from '../errors' (use AppError.forbidden(), AppError.unauthorized())
 * Decisions already made:
 *   - JWT access tokens (15min) + refresh tokens (7d) stored as httpOnly cookies
 *   - Password hashing: argon2id with memoryCost=65536
 *   - Rate limit: 5 attempts/account/15min
 * Output: single file src/auth.ts, max 200 lines, no database queries (use database.ts)
 */
```

**BAD:**
```ts
// Vague brief — agent will guess, hallucinate, or over-engineer
/**
 * Add authentication to the app. Use best practices.
 * Make it secure and fast. Handle all edge cases.
 */
// Agent doesn't know: which files? what stack? existing patterns? where to stop?
```

## Quick Reference

| Scenario | Pattern | Why |
|----------|---------|-----|
| Code audit of 50+ files | 5 agents, 10 files each | Context per agent stays focused |
| Research 3 competing libraries | 3 agents, 1 library each | Independent analysis, no cross-contamination |
| Feature with API + UI + tests | 3 agents: API, UI, tests | Clear file boundaries |
| Agent outputs conflict at merge | Run synthesis agent | Resolves interface mismatches |
| Agent went rogue (rewrote off-limits file) | Brief was too vague | Add explicit "Off-limits" section |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Briefing agents with the entire codebase | Only include the 3-5 files adjacent to their work |
| Assigning two agents to the same output file | Each agent owns specific files; synthesis merges |
| No interface contract between agents | Define shared types/interfaces in the brief |
| Auto-spawning agents for trivial questions | Use Explore agent or grep; agents are expensive |

### Anti-Patterns — Multi-Agent Failures
- Chain-spawning (Agent A's output → Agent B's input → Agent C) — one failure cascades, and latency multiplies. All agents should run in parallel when possible.
- Briefing agents from conversation context ("as we discussed earlier") — agents don't have session history. Every brief must be self-contained.
- Spawning agents without off-limits file declarations — agents will refactor adjacent files and create merge conflicts.
- Using agents as async workers for CPU-bound tasks — agents are LLM instances, not task runners. An agent to "calculate pi to 1000 digits" is a misuse.

## Red Flags
- Agent output references files it wasn't assigned — the brief lacked boundaries
- Three agents return the same file modified three different ways — file ownership wasn't specified
- Synthesis step takes longer than any individual agent — agents' interfaces didn't match
- Agent spawned agent spawned agent (3+ deep) — flatten the hierarchy

**One agent is a developer. Three agents with clear boundaries and a synthesis pass is a team. The brief is the architecture — invest in it.**
