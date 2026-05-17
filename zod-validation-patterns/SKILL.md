---
name: zod-validation-patterns
description: Use when designing Zod schemas for API validation, composing schemas, using discriminated unions, or structuring refine and superRefine rules
---

# Zod Validation Patterns

## Overview
Zod's API is simple — define a schema, parse data. The complexity emerges when schemas depend on each other (conditional validation), when parsing user input vs API responses (coercion boundaries), and when schema files grow to 300+ lines of overlapping definitions. The patterns that prevent this: discriminated unions, schema composition, and strict coercion gates.

## When to Use
- Designing input validation for API routes (Next.js, Express, Fastify)
- Building complex forms where field validation depends on other field values
- Sharing validation schemas between client and server
- Replacing Joi, Yup, or manual validation with type-safe Zod schemas

**Don't use when:** you need runtime performance for 10K+ validations/second — Zod creates intermediate objects. Use a structural validator or validate at the edge. Don't use Zod for database schema definition — use your ORM's migration system.

## Core Workflow

**Step 1: Compose schemas with `merge` and `intersection`, not copy-paste.** `const BaseUser = z.object({ id: z.string(), email: z.string().email() }); const CreateUser = BaseUser.omit({ id: true }).extend({ password: z.string().min(8) }); const UserResponse = BaseUser.extend({ name: z.string().nullable() })`. Never redefine the same fields in multiple schemas — change the base and all derivatives update. For cross-cutting concerns: `const WithTimestamps = z.object({ createdAt: z.date(), updatedAt: z.date() }); const Post = BasePost.merge(WithTimestamps)`.

**Step 2: Use discriminated unions for conditional validation.** A form where "shippingMethod: 'digital'" needs no address, but "shippingMethod: 'physical'" requires address, city, zip: `const Order = z.discriminatedUnion('shippingMethod', [z.object({ shippingMethod: z.literal('digital'), email: z.string().email() }), z.object({ shippingMethod: z.literal('physical'), address: z.string(), city: z.string(), zip: z.string() })])`. The discriminator field determines which schema is applied. TypeScript narrows the type after parsing — `if (order.shippingMethod === 'physical') { order.address }` is typed correctly.

**Step 3: Separate coercion at the boundary, validate internally.** At the API boundary: `z.coerce.number()` for query params (they're strings), `z.coerce.date()` for ISO strings. Inside your app: `z.number()`, `z.date()`. Never use coercion in shared validation schemas — coercion is an input-layer concern. Pattern: `const InputSchema = z.object({ age: z.coerce.number().int().min(0) }); const DomainSchema = z.object({ age: z.number().int().min(0) })`. Parse with InputSchema at the route handler, validate domain logic with DomainSchema. This keeps coercion explicit and traceable.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Field required only when another field has a specific value | `z.discriminatedUnion('type', [...])` or `z.object({...}).refine((data) => ...)` |
| Parsing query string `?ids=1,2,3` into number array | `z.string().transform(s => s.split(',').map(Number)).pipe(z.array(z.number()))` |
| Schema for API response that shouldn't coerce | Use base schemas without `.coerce`. Coercion only on input schemas. |
| Third-party API response with unknown shape | `z.object({...}).passthrough()` — allows extra keys. Later add `.strict()` once the shape is known. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `z.coerce.number()` on a schema used for both input and output | Output numbers get coerced, hiding type bugs. Split InputSchema (with coercion) vs DomainSchema (no coercion). |
| `.refine()` with async DB call inside | `.refine` runs during parse. Move async checks to `superRefine` or validate in the route handler AFTER parsing. |
| Deeply nested `.merge()` chain that becomes un-debuggable | Flatten to named schemas. `A.merge(B).merge(C)` → `const Merged = z.object({ ...A.shape, ...B.shape, ...C.shape })` |

## Red Flags
- Single schema file with 300+ lines — extract domain schemas into `schemas/user.ts`, `schemas/order.ts`
- `.passthrough()` in production schemas — it silently accepts unknown fields; use `.strict()` after the API contract stabilizes
- `z.any()` or `z.unknown()` in a schema — you've lost validation at that field; define the actual shape

**Schema composition (merge, extend, discriminatedUnion) prevents copy-paste. Coercion is an input-layer concern — split InputSchema from DomainSchema. Use discriminated unions for conditional validation instead of .refine() sprawl.**
