---
name: graphql-schema-design
description: Use when designing a GraphQL schema, choosing between connection and list types for pagination, or when preventing N+1 resolvers in a federated graph
---

# GraphQL Schema Design

## Overview
A GraphQL schema is a contract that outlives any single client. The right schema prevents N+1 resolvers at query time, avoids breaking changes, and keeps federation composable. The wrong schema encodes every internal table as a type and produces 500-query waterfalls.

## When to Use
- Designing a new GraphQL API or adding entities to an existing one
- Choosing between Relay-style connections and simple lists for a relationship
- Planning a schema change that must not break existing clients
- Setting up Apollo Federation or schema stitching across services

**Don't use when:** the frontend needs exactly one view's data and never changes — REST with a typed client is simpler. Don't GraphQL-wrap a single internal service with 2 consumers.

## Core Workflow

### Step 1: Model by Domain, Not by Table
GraphQL types represent domain concepts, not database rows. Combine related fields into a single type even if they come from different tables. Use enum types for finite sets (`OrderStatus`), not strings. Never expose internal IDs as the only identifier — add opaque `id: ID!` fields even if they wrap the DB primary key.

### Step 2: Design Pagination With Connections
Any list field that can grow beyond ~100 items needs pagination. Use the Relay Connection spec: `edges { node, cursor }` + `pageInfo { hasNextPage, endCursor }`. Avoid offset-based pagination — it breaks under concurrent writes. For stable cursors: encode a database timestamp or sequence, never the offset.

### Step 3: Prevent Resolver N+1 with DataLoader
Every resolver that fetches related data must use DataLoader. Batch function: receives a list of parent keys, returns a list of children in the same order. Cache per-request with `new DataLoader(batchFn)`. In federated graphs: use `@key` directives and let the gateway stitch. Never call a database or API directly in a resolver that runs per-item — that's the definition of N+1.

## Quick Reference

| Scenario | Pattern |
|----------|---------|
| List > 100 items | Relay Connection with cursor pagination |
| Related entity (1:1 or N:1) | Direct field, resolved via DataLoader |
| Deprecating a field | `@deprecated(reason: "Use newField instead")` — never remove silently |
| Multiple services owning types | Apollo Federation with `@key` directives |
| Nullable vs non-nullable | Non-null only for guaranteed-present fields; nullability is forward-compatible |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Type-per-table schema | Design for the domain; merge related concepts |
| Field-level DataLoader (new instance per field) | One DataLoader per entity type per request (cache key = parent ID) |
| `[Type!]!` (non-null list of non-null items) | Use `[Type!]` — allow empty lists; null items break fewer clients |
| Versioning with `/v2/graphql` | Evolve the schema; deprecate fields, never fork the endpoint |

## Red Flags
- Resolver with a raw SQL query or HTTP call that runs per-list-item — batch it with DataLoader
- `@deprecated` fields older than 6 months — remove them and bump the version
- Type with 30+ fields and no sub-types — the type is doing too much; decompose it

**A GraphQL resolver that makes an outbound call without DataLoader is a performance incident waiting to happen.**
