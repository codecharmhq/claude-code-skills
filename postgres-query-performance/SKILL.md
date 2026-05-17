---
name: postgres-query-performance
description: Use when PostgreSQL queries slow with data growth, EXPLAIN ANALYZE shows unexpected seq scans, or choosing between index types for a query workload
---

# PostgreSQL Query Performance

## Overview
PostgreSQL performance tuning is three layers: query structure (rewrite the SQL), indexing (give the planner a faster path), and configuration (give PostgreSQL the memory it needs). The most common mistake is jumping to the third layer before fixing the first two. A bad query with a perfect index is still a bad query.

## When to Use
- A query that was fast at 100K rows takes 2+ seconds at 1M rows
- `EXPLAIN ANALYZE` output shows `Seq Scan` on a table where you expected an index scan
- Choosing between B-tree, GIN, GiST, or BRIN indexes for a specific access pattern
- `ANALYZE` statistics are stale and the planner is making wrong cost estimates

**Don't use when:** the table has < 10K rows — sequential scan is faster. Don't add indexes without measuring the write impact with `pg_stat_user_indexes.idx_scan` and `idx_tup_read`/`idx_tup_fetch` ratios.

## Core Workflow

**Step 1: Read the query plan, not the query text.** Run `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...`. Scan top to bottom for the largest `(actual time=...)` minus planning time. Look at `Buffers: shared hit=X read=Y` — `read` means disk I/O; aim for `read=0` on repeated executions. Compare `rows` (estimated) vs `actual rows` — a 10x gap means `ANALYZE table_name` is overdue. If `Heap Fetches` is high, consider a covering index to skip the heap lookup.

**Step 2: Match the index type to the query pattern.** B-tree: equality + range, the default for 95% of cases. GIN: `@>`, `?`, `@@` operators on JSONB, arrays, and full-text search. GiST: geometric data, or full-text search when you need ranking. BRIN: very large append-only tables (time-series billions of rows) — tiny index that references block ranges. Partial index: `WHERE deleted_at IS NULL` — indexes only active rows, saving size and write overhead. Covering index: `INCLUDE (col)` (PG 11+) — adds non-key columns so the planner can skip the heap fetch entirely.

**Step 3: Tune `work_mem` BEFORE adding more indexes.** Set `work_mem` high enough that sorts and hash tables fit in memory. Check: `EXPLAIN ANALYZE` showing `Sort Method: external merge Disk` — the sort spilled. Increase `work_mem` per-session (e.g., `SET work_mem = '256MB'`) and re-run. Default 4MB is sized for 1990s hardware. For reporting queries, 256MB-1GB is appropriate. Use `SET LOCAL` to scope it to one query — don't globally raise it and starve the connection pool.

## Quick Reference

| Scenario | Action |
|----------|--------|
| `WHERE jsonb_col @> '{"status":"active"}'` does Seq Scan | Add GIN index: `CREATE INDEX ON t USING GIN (jsonb_col jsonb_path_ops)`. GIN beats B-tree for containment. |
| Low-cardinality column (status, type) ignored by planner | Expression or partial index: `CREATE INDEX ON orders (status) WHERE status IN ('pending', 'processing')` |
| `ORDER BY created_at DESC LIMIT 10` still slow with index | Planner picks the wrong direction. Try `CREATE INDEX ON t (created_at DESC)` — ordering matters for LIMIT. |
| `ANALYZE` takes forever on a 500M-row table | Use `ANALYZE table_name (column_name)` to sample only the columns you need, not the whole row. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Index on `UPPER(email)` ignored because query uses `LOWER(email)` | Index must match the exact expression. `CREATE INDEX ON users (LOWER(email))` — expression indexes are exact-match. |
| `SELECT *` with a covering index | Covering indexes only help when the SELECT list is a subset of the index columns. `SELECT *` always forces heap fetches. |
| Adding index during peak traffic without `CONCURRENTLY` | `CREATE INDEX CONCURRENTLY` — 2x slower but doesn't block writes. Never create indexes without it on production. |

## Red Flags
- `pg_stat_user_indexes.idx_scan = 0` for 30+ days — dead index; drop it
- `n_tup_upd` >> `n_tup_hot_upd` — indexes are preventing HOT updates; prune unused indexes
- 8+ indexes on a write-heavy table (orders, events, logs) — each insert pays the write tax 8 times

**Measure first with EXPLAIN ANALYZE. Match the index type to the query operator. Tune work_mem. Only then add indexes — and always CONCURRENTLY.**
