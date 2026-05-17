---
name: writing-api-documentation
description: Use when documenting REST APIs, creating API reference docs, or when API documentation is missing or outdated.
---

# Writing API Documentation

## Overview
Good API docs are the interface between your code and its users. Treat documentation as a first-class deliverable, not an afterthought.

## When to Use
- A REST or public API exists but has no reference docs
- Existing API docs are outdated, incomplete, or inconsistent with behavior
- Onboarding new integrators who struggle to understand endpoints
- Preparing for a public API launch or developer portal release

**Don't use when:**
- The API is purely internal and all consumers are in the same codebase with strong typing

## Core Workflow

### Step 1: Map the Surface
List every endpoint, method, and status code. Use OpenAPI/Swagger as the single source of truth. Group endpoints by resource (users, orders, payments).

### Step 2: Document Each Endpoint
For every endpoint, write: purpose, path params and query params (required vs optional, types, constraints), request body schema with an example, all response status codes with body examples, and error response format with codes.

### Step 3: Add Cross-Cutting Sections
Write authentication (API key, OAuth, or JWT), rate limits (limits, headers, retry-after), base URL, and pagination before the endpoint reference.

### Step 4: Verify by Copy-Paste
Test every example request and response verbatim. If it doesn't work in curl, it will not work for users.

## Quick Reference

| Scenario | Action |
|----------|--------|
| No docs exist | Start with OpenAPI spec, generate skeleton |
| Docs are stale | Diff endpoints against implementation, update spec |
| Integrators confused | Add more code examples in multiple languages |
| Error unclear | Document every error code with cause and fix |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Writing examples that don't actually work | Test every example end-to-end before committing |
| Forgetting to document error responses | Include error schema and every possible code |
| Omitting required vs optional | Mark every field clearly; use tables |

## Red Flags
- You can't tell from the docs what an endpoint returns without scrolling
- Error responses are documented as "varies"
- No example for the most common use case

**All of these mean:** rewrite the endpoint docs before proceeding.
