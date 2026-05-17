---
name: microservice-boundary-design
description: Use when defining service boundaries in a monolith decomposition, evaluating whether a new feature should be a separate service, or when fixing cross-service data coupling
---

# Microservice Boundary Design

## Overview
The hardest problem in microservices isn't building them — it's drawing the lines. Wrong boundaries create distributed monoliths: services that look independent but share databases, require lockstep deployments, and fail together. Right boundaries follow domain events, not database tables.

## When to Use
- Planning to extract a service from a monolith
- Two services share a database, and writes from both corrupt each other's invariants
- A "simple" feature requires changes across 4+ services
- Deciding whether a new capability should be a new service or a module in an existing one

**Don't use when:** you have 3 developers and no scale problems. Start with a modular monolith; extract services only when team autonomy or independent scaling demands it.

## Core Workflow

### Step 1: Find Bounded Contexts, Not Entities
Map the domain using Event Storming: commands (user actions), events (things that happened), aggregates (consistency boundaries). A bounded context is where a term means one thing: "Order" in Checkout ≠ "Order" in Fulfillment. Each context owns its data exclusively — no other service reads or writes that database directly.

### Step 2: Design the Contract Between Services
Synchronous: REST/gRPC for commands that need immediate confirmation. Asynchronous: events over a message broker for "this happened" notifications. Never chain synchronous calls across services (A→B→C→D) — one slowdown cascades. Sender owns the event schema; consumers adapt. Version events with new optional fields, never remove existing ones.

### Step 3: Implement the Strangler Fig Pattern
For extraction: route traffic to the new service incrementally. Start with reads (query the new service, fall back to monolith). Then writes (dual-write to both, verify consistency). Finally, cut over reads and decommission the monolith code. Never do a big-bang cutover — the monolith has edge cases you haven't discovered yet.

## Quick Reference

| Symptom | Diagnosis |
|---------|-----------|
| Two services share a DB table | Wrong boundary — one must own it, the other calls its API |
| Every deploy touches 3+ services | Services are too fine-grained; merge or define a deployment unit |
| Event carries 50 fields, consumer uses 3 | Event is too fat; slim it or split into topic-per-concern |
| Sync call chain A→B→C→D | Add async events or a BFF (Backend For Frontend) that aggregates |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Splitting by entity, not behavior | "User Service" owns everything user-related — that's a monolith with HTTP |
| Shared database as integration pattern | Each service owns its data; other services call its API |
| Entity IDs as integration contracts | Use natural keys or opaque IDs; entity IDs couple consumers to internal schema |
| No dead letter queue for events | Undeliverable events must land somewhere for human inspection |

## Red Flags
- Feature that touches 5 services and takes 3 sprints — boundaries are wrong
- "Just one more shared table" — every shared table is future coordination overhead
- Service with 2 endpoints — too small; it's a function, not a service

**Services that always deploy together are not separate services. Merge them or fix the boundaries.**
