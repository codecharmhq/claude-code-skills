---
name: server-actions-zod-validation
description: Use when building Next.js forms with Server Actions, structuring Zod validation, or debugging revalidation and error propagation
---

# Server Actions + Zod Validation

## Overview
Server Actions merge the mutation endpoint and the handler into one function. The win: no separate API route. The risk: validation, error handling, and revalidation now live in the same place, and getting one wrong silently corrupts the other two.

## When to Use
- Building forms in Next.js App Router that mutate server state
- Replacing REST API POST routes with Server Actions
- Implementing progressive enhancement: form works before JavaScript loads
- Validating shared types across client and server with Zod

**Don't use when:** the mutation needs to be called from outside Next.js (React Native app, external API consumer) — Server Actions are HTTP POST endpoints under the hood but not designed as a public API. Don't use for real-time collaborative editing — use WebSockets. Don't use when you need streaming responses from a mutation.

## Core Workflow

**Step 1: Validate twice — once on the client (for UX), once on the server (for security).** Client-side: use `useActionState` with Zod `safeParse` to show field errors before submitting. Server-side: `parse` (not `safeParse`) at the top of every Server Action — throw immediately on invalid input. Never rely on client validation alone; Server Actions are publicly callable POST endpoints. Strip unknown keys with `.strict()` or `.strip()` to prevent mass-assignment attacks.

**Step 2: Structure error returns with discriminated unions.** Return `{ success: true, data }` or `{ success: false, errors: { fieldName: string[] } }`, never a raw try/catch that swallows the error type. Use `zodError.flatten().fieldErrors` to extract per-field messages. On the client, `useActionState` receives this discriminated union; render field errors next to their inputs. Never return `{ error: "Something went wrong" }` without field-level detail.

**Step 3: Revalidate surgically after successful mutations.** Call `revalidatePath()` for the specific route that displays the mutated data, not `/`. For list + detail pages, call it twice: `revalidatePath('/posts')` and `revalidatePath(`/posts/${id}`)`. Use `revalidateTag()` when the data is fetched with a tagged `fetch` call — tags are more maintainable than paths at scale. Always revalidate AFTER the database write, never before.

**GOOD:**
```ts
// Double validation — client for UX, server for security
'use server';
import { z } from 'zod';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
}).strict();  // rejects unknown fields at API level

export async function signup(_prev: unknown, formData: FormData) {
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };  // field-level errors
  }
  // parsed.data is fully typed and sanitized
  await db.user.create({ data: parsed.data });
  revalidatePath('/users');
  return { success: true, data: null };
}
```

**BAD:**
```ts
'use server';
export async function signup(formData: FormData) {
  const email = formData.get('email');              // unvalidated string
  const password = formData.get('password');         // could be anything
  // Client said it validated — but Server Actions are public POST endpoints.
  // Anyone can curl this endpoint with a 1-character password.
  await db.user.create({ email, password });         // SQL injection? Mass assignment?
}
```

**GOOD:**
```ts
// Structured discriminated union return
export async function createPost(formData: FormData) {
  const parsed = PostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false as const, errors: parsed.error.flatten().fieldErrors };
  }
  try {
    const post = await db.post.create({ data: parsed.data });
    revalidatePath('/posts');
    revalidatePath(`/posts/${post.id}`);
    return { success: true as const, data: post };
  } catch (e) {
    return { success: false as const, errors: { _form: ['Failed to create post'] } };
  }
}
```

**BAD:**
```ts
// Raw Error throw — caught by error boundary, no field-level detail
export async function createPost(formData: FormData) {
  const parsed = PostSchema.parse(Object.fromEntries(formData));  // throws on bad input
  try {
    const post = await db.post.create({ data: parsed.data });
    revalidatePath('/posts');
    return { post };
  } catch (e) {
    throw new Error('Failed to create post');  // generic — which field? what value?
    // useActionState receives nothing. User sees: "Something went wrong" toast.
  }
}
```

**GOOD:**
```ts
// Surgical revalidation — targets only affected routes
revalidatePath('/posts');            // list page
revalidatePath(`/posts/${id}`);      // detail page
// OR with tags:
revalidateTag(`post-${id}`);
revalidateTag('posts-list');
```

**BAD:**
```ts
// Firehose revalidation — clears every cached page
revalidatePath('/');  // home, settings, profile, docs, everything
// Every other page on the site re-renders from scratch.
// 50ms action now causes 500ms of downstream re-renders.
```

## Quick Reference

| Scenario | Action |
|----------|--------|
| Form submits but UI doesn't update | Missing `revalidatePath` or `revalidateTag` after mutation — Server Actions don't auto-refresh |
| Double submit creates duplicate records | Disable button during `useActionState` pending state; also check server-side with unique constraint |
| `z.object()` passes silently on extra fields | Add `.strict()` to the server-side schema; client can use `.strip()` |
| Server Action 404 or 405 in production | Check `next.config.js` — Server Actions need `experimental: { serverActions: true }` (Next 14) |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Validating only on the client with `useForm` + Zod | Server Actions are HTTP endpoints. Always `z.parse()` server-side first before any DB operation. |
| `revalidatePath('/')` after every mutation | Revalidates the entire app. Target the specific route that displays the changed data. |
| Throwing raw `Error` and catching with a generic boundary | Return structured error objects. The client needs field-level messages to render inline errors. |

### Anti-Patterns — Reject on Sight
- `"use server"` in a barrel `index.ts` file — the `"use server"` directive applies to the entire module. Barrel files re-export from other modules, making every re-exported function a Server Action. Use `"use server"` in dedicated action files only (e.g., `app/actions/auth.ts`).
- `useActionState` without pending check — allows double-submit while the first request is in flight. Always check `pending` from `useActionState` and disable submit button: `disabled={pending}`.
- `redirect()` inside a `try/catch` — Next.js `redirect()` throws `NEXT_REDIRECT` as a special error. A `catch` block that doesn't re-throw `NEXT_REDIRECT` swallows the redirect and the UI never navigates. Always check: `if (error instanceof RedirectError) throw error`.
- Inline Zod schemas inside every Server Action file — creates duplication. Shared schemas (`schemas/post.ts`, `schemas/user.ts`) prevent drift between client validation, server validation, and TypeScript types.
- Server Action returning `{ error: "Something went wrong" }` without field-level detail — the client can only show a generic toast, not inline field errors. Return `flatten().fieldErrors` for per-field rendering.

## Red Flags
- Server Action file with 10+ exported functions and zero shared validation schemas — extract Zod schemas to a shared `schemas/` module
- `revalidatePath` called with hardcoded strings scattered across 5+ files — switch to `revalidateTag` + named tags
- Production error logs showing "NEXT_REDIRECT" errors from Server Actions — you're throwing redirects inside try/catch blocks

**Validate server-first, return structured errors, and revalidate precisely. A Server Action is a mutation endpoint — treat it with the same security rigor as a REST POST route.**
