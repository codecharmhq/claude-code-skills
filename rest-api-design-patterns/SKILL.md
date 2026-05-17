---
name: rest-api-design-patterns
description: Use when designing a REST API, versioning an existing one, choosing pagination strategies, or standardizing error responses
---

# REST API Design Patterns

## Overview
REST is not CRUD over HTTP. The hard parts are never the happy-path `GET /posts/1` — they're pagination cursors, partial updates with side effects, idempotency for payment endpoints, and error formats that clients can actually parse. Design these up front because retrofitting them breaks every client.

## When to Use
- Designing a new public or partner-facing REST API
- Standardizing response formats across 3+ microservices
- Choosing between cursor, offset, or keyset pagination
- Implementing long-running operations (async jobs) over HTTP

**Don't use when:** the API is internal-only and small (< 5 consumers) — GraphQL or tRPC may serve better. Don't over-engineer a todo app — the patterns here are for APIs that outlive their first consumer.

## Core Workflow

**Step 1: Define the error contract first.** Every response must be machine-parseable. Use RFC 7807 Problem Details: `{ "type": "https://api.example.com/errors/insufficient-funds", "title": "Insufficient Funds", "status": 422, "detail": "Balance 10.00 USD below required 25.00 USD", "instance": "/transfers/abc-123" }`. Never return `{ "error": "Something went wrong" }` — clients can't branch on that. Add a `type` URI that points to documentation, not a generic string. Validation errors: `{ "type": "/errors/validation", "status": 422, "errors": [{ "field": "email", "message": "Invalid format", "code": "invalid_email" }] }`.

**Step 2: Pick pagination by read pattern, not default.** Cursor-based (`?cursor=abc&limit=20`) for feeds and real-time data where items are inserted mid-page — it's stable under writes. Offset-based (`?offset=40&limit=20`) for admin tables with sort-on-any-column and jump-to-page-N UX. Keyset (`?after_id=100&limit=20`) for large datasets with monotonic keys — it outperforms offset by using the index. Always include `Link` headers (RFC 5988) with `rel="next"` and `rel="prev"`. Return total count only for offset pagination — computing it for cursors burns a full table scan.

**Step 3: Enforce idempotency for non-safe operations.** Require `Idempotency-Key` header on `POST`, `PUT`, `PATCH`, and `DELETE`. Store the key + response for 24 hours. On duplicate key, return the stored response (not a 409). The first request processes normally; retries within the window return the original result. This is non-negotiable for payment, transfer, and order-creation endpoints. Use UUID for the key format; let clients generate it, never the server.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Long-running operation (> 2 seconds) | Return `202 Accepted` with a `Location` header pointing to a status endpoint. Client polls. |
| Fields clients keep sending that you've deprecated | Don't reject them. Accept and ignore with a `Warning` header: `299 - "The 'phone' field is deprecated"` |
| Business rule violation (not auth, not validation) | Use 422 Unprocessable Entity with RFC 7807 body. 400 is for malformed syntax, 422 is for semantic errors. |
| API versioning across breaking changes | URL versioning (`/v2/`): simple, visible, works everywhere. Header versioning: cleaner URLs, harder to test. Pick one and lock it in. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `GET /posts?page=1&size=20` with no consistent ordering | Add explicit `ORDER BY id DESC` or `created_at DESC` — without it, page boundaries drift across requests |
| Returning 200 with `{ "success": false }` in the body | Use HTTP status codes. Return `4xx`/`5xx`. Clients like caches and proxies make decisions based on status codes, not body parsing. |
| Nesting related data 5 levels deep by default | Use sparse fieldsets (`?fields=id,title,author.name`) or `include` params. Deep nesting is the slowest path to a broken API contract. |

## Red Flags
- More than 2 pagination styles in the same API — clients have to learn both; they won't
- Error responses that differ in structure between endpoints — you've lost machine-parseability
- No `Idempotency-Key` on `POST /orders` — double-submit bugs are a matter of time, not probability

**REST APIs outlive their first client. Design the error contract, pagination strategy, and idempotency model before the first endpoint — retrofitting these after clients exist is a breaking change.**
