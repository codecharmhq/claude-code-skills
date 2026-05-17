---
name: agent-memory-system
description: Use when building cross-session memory for AI agents, implementing vector search over project knowledge, or compressing context to stay within token limits
---

# Agent Memory System — Cross-Session Intelligence

## Overview
The #1 complaint about AI coding agents: they forget everything between sessions. You explain the architecture on Monday, by Wednesday Claude has amnesia. This skill implements a persistent memory layer: vector embeddings for semantic search, automatic context compression, and session-to-session knowledge continuity. Your project's decisions, architecture, and patterns survive across sessions.

## When to Use
- Claude/agent keeps asking "what database are we using?" every session
- Long sessions hit token limits and lose context from early in the conversation
- Multiple team members use AI on the same codebase and need shared context
- You've made architecture decisions you don't want to re-explain every session

**Don't use when:** you're doing a one-off script that won't need follow-up. Don't use if you have fewer than 3 sessions on a project.

## Core Workflow

**Step 1: Implement automatic session capture.** After every significant interaction, extract decisions, patterns, and context. Store as structured entries with timestamps and categories. Use CLAUDE.md and memory files as the storage layer — they're already loaded into every session. Write immediately after learning new information.

**Step 2: Build a tiered memory architecture.** Tier 1 (always loaded): CLAUDE.md — 200 lines max, project essentials only. Tier 2 (semantic retrieval): Memory index files organized by topic — loaded when relevant keywords appear. Tier 3 (archive): Full conversation summaries and decision logs — searched only when explicitly needed.

**Step 3: Implement context compression.** When context approaches limits, compress rather than truncate. Summarize earlier parts of the conversation into structured memory entries. Preserve: active task state, error messages, file paths modified, decisions made. Discard: raw command output, repeated attempts, intermediate debugging. The compressed state should contain everything needed to resume work.

**GOOD:**
```yaml
# Memory entry: project context, auto-captured after architecture discussion
---
name: payment-service-architecture
description: Payment service uses Stripe Connect, idempotency keys, and event-driven fulfillment
metadata:
  type: project
  updated: 2026-05-17
  tags: [architecture, payments, stripe, events]
---
# Payment Service Architecture

## Decision: Stripe Connect with idempotency keys
- We use Stripe Connect Express accounts for seller onboarding
- Every charge endpoint accepts idempotency_key header
- Fulfillment is event-driven via Redis pub/sub, not synchronous
- Refund grace period: 7 days (configurable per merchant)

## Pending: PCI compliance review for saved cards
## Constraints: No card numbers touch our servers — Stripe Elements handles all PCI scope
```

**BAD:**
```yaml
# Generic, useless memory — no decision, no context, no searchability
---
name: stuff
description: important things about the project
---
We talked about payments. It's complicated. Remember to check the docs.
# This memory entry will never help anyone resume work.
```

## Quick Reference

| Scenario | Action |
|----------|--------|
| Agent forgot what DB we use | Check memory for `tags: [database, architecture]` |
| Session hit token limit mid-task | Save task state to memory, compress old context, resume |
| New teammate starts using AI | Point CLAUDE.md to memory index — all context auto-loaded |
| Two contradictory decisions saved | Memory index with timestamps — newer wins, flag conflict |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Saving memory only at session end | Save after every significant decision — crashes happen |
| Memory entries are too generic | Include specific file paths, version numbers, error messages |
| No search tags in memory entries | Add `tags:` to every entry for retrieval |
| Saving raw conversation logs | Extract decisions and patterns, not dialog |

### Anti-Patterns — Memory Systems That Don't Work
- `memory.md` as a single 2000-line file — no structure, impossible to search, bloats context
- Saving everything — noise drowns signal; only save decisions, patterns, and errors
- No expiration — stale memories about deleted features mislead future sessions
- Cross-project memory without namespacing — Project A's "database decision" overwrites Project B's
- Treating memory as append-only — update or delete outdated entries; memory is a living document

## Red Flags
- CLAUDE.md hasn't been updated in 3+ sessions — the most important memory tier is stale
- Memory index has entries from 2 months ago that reference deleted code
- "We discussed this before" happening multiple times per session — memory not loading

**An AI agent that forgets is an intern you have to re-brief every meeting. Persistent memory turns it into a teammate.**
