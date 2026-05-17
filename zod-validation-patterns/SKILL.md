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

**GOOD:**
```ts
// Schema composition — single source of truth
const BaseUser = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});

const CreateUser = BaseUser.omit({ id: true }).extend({
  password: z.string().min(8).max(128),
});

const UpdateUser = BaseUser.partial();  // all fields optional for PATCH

// Change BaseUser.email and ALL derivatives update automatically.
```

**BAD:**
```ts
// Copy-paste field definitions — schema drift guaranteed
const CreateUserSchema = z.object({
  id: z.string(),                     // forgot .uuid() — accepts "abc"
  email: z.string().email(),
  password: z.string().min(8),
});

const UpdateUserSchema = z.object({
  id: z.string().uuid(),              // here .uuid() IS present — inconsistent!
  email: z.string(),                  // forgot .email() — accepts "not-an-email"
});
// A field added to CreateUserSchema is never added to UpdateUserSchema.
// Bug report: "I can create a user with email but not update it" — schema drift.
```

**GOOD:**
```ts
// Discriminated union for conditional validation
const OrderSchema = z.discriminatedUnion('shippingMethod', [
  z.object({
    shippingMethod: z.literal('digital'),
    email: z.string().email(),
  }),
  z.object({
    shippingMethod: z.literal('physical'),
    address: z.string().min(1),
    city: z.string().min(1),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  }),
]);

// TypeScript narrows automatically:
if (order.shippingMethod === 'physical') {
  console.log(order.address);  // typed as string, not string | undefined
}
```

**BAD:**
```ts
// Complex .refine() chain — unreadable, unscalable
const OrderSchema = z.object({
  shippingMethod: z.enum(['digital', 'physical']),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
}).refine((data) => {
  if (data.shippingMethod === 'digital' && !data.email) return false;
  if (data.shippingMethod === 'physical' && !data.address) return false;
  return true;
}, { message: 'Missing required fields for shipping method' });
// Error message: "Missing required fields for shipping method" — WHICH field?
// Adding a 3rd shipping method means editing the refine, not adding a union variant.
```

**GOOD:**
```ts
// Coercion only at API boundary
const InputSchema = z.object({
  age: z.coerce.number().int().min(0).max(150),  // accepts "25" from query string
  joined: z.coerce.date(),                        // accepts "2024-01-15T00:00:00Z"
});

const DomainSchema = z.object({
  age: z.number().int().min(0).max(150),          // must be actual number
  joined: z.date(),                                // must be actual Date
});

// Route handler: parse(queryParams, InputSchema) → coerce
// Business logic: parse(domainData, DomainSchema) → validate
```

**BAD:**
```ts
// Coercion in shared schemas — hides type bugs
const UserSchema = z.object({
  age: z.coerce.number(),     // used for both API input AND database output
  joined: z.coerce.date(),    // database returns Date objects, but coercion re-processes them
});

// Database returns { age: 25, joined: 2024-01-15T00:00:00Z }.
// z.coerce.number() on a number: no-op.
// z.coerce.date() on a Date: creates a NEW Date object — different reference, passes.
// Now someone reads user.joined.getFullYear() — it works.
// But someone serializes it: JSON.stringify(user) — the Date was coerced from the original Date,
// so if the original was already a Date... actually it's fine. BUT the pattern is dangerous:
// if you ever pass a string from an API response through the same schema, it coerces silently
// and you lose the signal that the API changed its date format.
const UserSchema = z.object({
  age: z.coerce.number(),     // used for both input AND output — fragile
});
```

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

### Anti-Patterns — Reject on Sight
- `.transform()` applied BEFORE `.parse()` (in the same pipeline) — `z.string().transform(s => s.toUpperCase()).parse(input)` runs transform on potentially invalid data. If the input is a number, `.toUpperCase()` throws a cryptic error instead of Zod returning a structured validation error. Validate first, transform after: `.pipe()` or a chained schema.
- `z.object({}).catchall(z.any())` in production schemas — accepts any JSON shape and silently passes everything through. This is `any` for objects. You've lost all validation at the field level. Use `.strict()` to reject unknown keys and `.catchall(z.string()...)` with a specific type if dynamic keys are required.
- `.refine()` with an `async` function in a synchronous call — `z.string().refine(async (val) => await db.exists(val))` returns a Promise, but `.refine()` doesn't await it. The validation passes immediately because a Promise is truthy. Use `superRefine` or validate async checks separately after `parse()` completes.
- `z.any()` used as a "temporary" schema — "I'll come back and type this later." It never happens. The field becomes an untracked data leak: any shape passes, any downstream code that assumes a type crashes at runtime. Start with a minimal shape: `z.unknown()` at least forces type narrowing in usage.
- `safeParse` with error swallowed — `const result = schema.safeParse(input); if (result.success) { use(result.data); }` without logging the error. Silent parse failures hide schema drift between client and server. Always log `result.error` when in development.

## Red Flags
- Single schema file with 300+ lines — extract domain schemas into `schemas/user.ts`, `schemas/order.ts`
- `.passthrough()` in production schemas — it silently accepts unknown fields; use `.strict()` after the API contract stabilizes
- `z.any()` or `z.unknown()` in a schema — you've lost validation at that field; define the actual shape

**Schema composition (merge, extend, discriminatedUnion) prevents copy-paste. Coercion is an input-layer concern — split InputSchema from DomainSchema. Use discriminated unions for conditional validation instead of .refine() sprawl.**
