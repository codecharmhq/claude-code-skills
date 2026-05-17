---
name: fastapi-dependency-patterns
description: Use when designing FastAPI dependency chains, debugging Depends() injection order, or when building reusable auth, DB session, and permission dependencies
---

# FastAPI Dependency Patterns

## Overview
FastAPI's `Depends()` is a compile-time dependency injection framework disguised as function arguments. The key insight: dependencies form a DAG, FastAPI resolves them in parallel where possible — unless you create hidden sequential chains.

## When to Use
- Building a multi-layered dependency: auth → user → permissions → resource
- Dependencies run twice when you expect them to run once
- DB session leaks because yield didn't run the finally block
- Choosing between middleware and a dependency for cross-cutting logic

**Don't use when:** a simple `if` check in the endpoint body suffices. Don't over-abstract a one-off dependency into reusable infrastructure.

## Core Workflow

### Step 1: Model the Dependency Graph
Each `Depends()` is a node. FastAPI resolves sub-dependencies from leaf to root, caching results per-request by default. Use `use_cache=False` when the dependency must re-execute (e.g., nonce validation). Dependencies at the same level without shared parameters run concurrently — exploit this for independent data fetches.

### Step 2: Yield for Teardown, Not Try/Finally
Generator dependencies (`yield`) guarantee cleanup runs after the response. Use `yield` for: DB sessions, file handles, external connections. Never `try/finally` in a dependency; the finally block runs before the response is sent, not after. The teardown code after `yield` runs post-response — ideal for logging metrics without blocking the client.

### Step 3: Compose With Classes for Stateful Flow
For complex auth: `def get_current_user(token) → User`, then `def get_active_org(user, org_id) → Org`. Class-based dependencies: implement `__call__` for parameterized injection: `Depends(RateLimiter(max_calls=100))`. Use `Security()` instead of `Depends()` when the dependency is part of OpenAPI's security scheme — it auto-generates the padlock icon in docs.

## Quick Reference

| Scenario | Pattern |
|----------|---------|
| DB session per request | `def get_db() → Session: yield db; db.close()` runs after response |
| Auth with OAuth2 scheme | `Security(get_current_user, scopes=["admin"])` |
| Parameterized dependency | Class with `__call__` + `Depends(MyDep(param=...))` |
| Skip sub-dependency caching | `Depends(my_dep, use_cache=False)` |
| Background task after response | `BackgroundTasks` parameter in endpoint |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `Depends()` in middleware | Use `app.add_middleware()` for protocol-level logic |
| Cached dependency with stale data | `use_cache=False` or move cache to Redis |
| DB session committed in dependency | Commit only in endpoint; dependency just provides the session |
| `HTTPException` in non-HTTP context | WebSocket dependencies use `WebSocketException` |

## Red Flags
- Same dependency imported 10+ times — extract to a router-level `dependencies=[Depends(auth)]` list
- `Depends(get_db)` called at nested depth 4 — the graph is too deep; flatten or use context variables
- Dependency that accesses `request.body()` — body is consumed; use Pydantic model instead

**Every nested Depends() beyond depth 2 signals that your dependency graph needs flattening.**
