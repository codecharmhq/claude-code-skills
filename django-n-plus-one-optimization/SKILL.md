---
name: django-n-plus-one-optimization
description: Use when Django ORM queries explode under load, debugging hundreds of identical SQL queries, or when choosing between select_related, prefetch_related, and Prefetch objects
---

# Django N+1 Query Optimization

## Overview
The Django ORM is productive until it isn't: one innocent `for obj in queryset` can fire thousands of queries. The ORM defers all relation loading by default — you must be explicit about what to join and when to prefetch.

## When to Use
- A list view that was fast at 10 rows now takes 2 seconds at 100
- Django Debug Toolbar shows "200+ queries" on a single page
- Choosing between `select_related()` and `prefetch_related()`
- Serializer N+1 that only appears in DRF list endpoints, not detail

**Don't use when:** the queryset returns a single object — `.first()` or `.get()` overhead is negligible. Don't optimize a page with 3 queries.

## Core Workflow

### Step 1: Detect N+1 in Development
Enable Django Debug Toolbar SQL panel. Look for repeating query patterns — identical SQL with different IDs. In production: use `django-querycount` middleware to log thresholds. Set a hard limit: any endpoint exceeding 20 queries in dev fails a custom check. Always add `assertNumQueries()` in tests for list views.

### Step 2: Choose the Right Prefetch Strategy
`select_related()`: SQL JOIN, one query. Use for ForeignKey and OneToOne. Never for ManyToMany — it can't do JOINs across a through-table. `prefetch_related()`: separate query + Python join. Use for ManyToMany, reverse ForeignKey, and GenericForeignKey. Avoid `prefetch_related()` on a queryset that will be sliced — Django prefetches the full set.

### Step 3: Use Prefetch Objects for Filtered Relations
`Prefetch('orders', queryset=Order.objects.filter(status='active'), to_attr='active_orders')`. This avoids loading all related objects into memory. Combine with `filteredrelation` on the model for reusable filtering. For nested relations: `prefetch_related('author__profile')` — Django handles both levels. For computed fields: annotate the queryset rather than computing in Python.

## Quick Reference

| Scenario | Tool |
|----------|------|
| ForeignKey/OneToOne | `select_related('user')` |
| ManyToMany/Reverse FK | `prefetch_related('tags')` |
| Filtered prefetch | `Prefetch('items', queryset=..., to_attr='...')` |
| Count without loading objects | `.annotate(count=Count('related'))` |
| Exists check | `.filter(related__isnull=False).exists()` — no join |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `prefetch_related` on queryset that gets `.count()` | Count queries don't prefetch; paginate first |
| Mixing `select_related` and `prefetch_related` without measuring | Add one, measure, then add the next |
| `len(queryset)` to check emptiness | Use `.exists()` — it generates `SELECT 1 LIMIT 1` |
| DRF `SerializerMethodField` doing queries | Annotate in `get_queryset()` instead |

## Red Flags
- Loop inside a template or serializer that accesses a related field — every iteration may hit the DB
- `prefetch_related` on a queryset passed to `.iterator()` — prefetch is ignored with server-side cursors
- `.all()` without `.select_related()` in a list view — assume every FK access is a separate query

**Any queryset iteration that touches related fields without explicit select/prefetch is an N+1 time bomb.**
