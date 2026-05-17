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

## GOOD/BAD Patterns

**GOOD:**
```graphql
# Domain-driven types — one User type, fields from multiple tables
type User {
  id: ID!
  email: String!
  profile: Profile          # separate table, same type
  orders(first: Int!, after: String): OrderConnection!  # paginated
}
```

**BAD:**
```graphql
# Table-per-type — exposes database structure, leaks internals
type UserTable {
  user_id: Int!
  user_email: String!
  user_password_hash: String!  # security leak
  user_bio: String
}
```

---

**GOOD:**
```typescript
// One DataLoader per request — batched query, 2 DB calls for 100 posts
const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await db.users.findMany({ where: { id: { in: [...ids] } } });
  const userMap = new Map(users.map(u => [u.id, u]));
  return ids.map(id => userMap.get(id) || null);
});
const resolvers = {
  Post: { author: (post) => userLoader.load(post.authorId) },
};
```

**BAD:**
```typescript
// Per-item DB call — 101 queries for 100 posts (1 for posts + 100 per author)
const resolvers = {
  Post: { author: (post) => db.users.findOne({ where: { id: post.authorId } }) },
};
```

---

**GOOD:**
```graphql
# Mutation returns a payload type — room for errors and partial success
type CreateUserPayload {
  user: User
  errors: [UserError!]!
}
type UserError {
  field: String!
  message: String!
}
```

**BAD:**
```graphql
# Mutation returns raw type — no place for validation errors
type Mutation {
  createUser(email: String!, name: String!): User!
}
```

### Anti-Patterns — GraphQL Schema Failures
- `type Query { user(id: ID!): User }` with non-null return type — if user doesn't exist, the field errors with no data; return nullable `User`
- Exposing DB auto-increment IDs as the only `id` — clients hardcode them, then collide across environments; use opaque `ID!` with `toGlobalId()`
- `[Order!]!` (non-null list of non-null items) — an empty list that happens to be null crashes the entire query; prefer `[Order!]` everywhere
- 50+ top-level Query fields — impossible to deprecate or refactor; group under domain types: `query { users { search, byId }, posts { feed, byTag } }`

## Red Flags
- Resolver with a raw SQL query or HTTP call that runs per-list-item — batch it with DataLoader
- `@deprecated` fields older than 6 months — remove them and bump the version
- Type with 30+ fields and no sub-types — the type is doing too much; decompose it
- Every mutation returns the raw entity type — no place for validation errors or partial success

**A GraphQL resolver that makes an outbound call without DataLoader is a performance incident waiting to happen.**
