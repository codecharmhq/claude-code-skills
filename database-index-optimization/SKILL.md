---
name: database-index-optimization
description: Use when query performance degrades under load, EXPLAIN shows sequential scans, or when choosing which indexes to add, remove, or restructure
---

# Database Index Optimization

## Overview
Indexes are a trade: faster reads for slower writes and more storage. The #1 mistake is indexing for a slow query you saw once, creating write-amplification that hurts every insert. Always index from a query pattern, never from a hunch.

## When to Use
- A query that was fast at 10K rows takes 2+ seconds at 500K
- `EXPLAIN ANALYZE` shows `Seq Scan` on a table with 100K+ rows
- Insert/update performance dropped after adding 5+ indexes to the same table
- Choosing between a composite index and multiple single-column indexes

**Don't use when:** the table has < 1000 rows — sequential scan is faster than index lookup. Don't index a column just because it's a foreign key — verify a query actually filters on it.

## Core Workflow

### Step 1: Find the Queries That Matter
Extract slow queries: PostgreSQL `pg_stat_statements` (top by total_time), MySQL `sys.statement_analysis`, or application APM. Rank by total time, not count. A query that runs once per hour for 30 seconds matters more than one that runs 1000 times for 2ms. Set `log_min_duration_statement` to capture anything exceeding your SLA threshold.

### Step 2: Read the Query Plan
`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...`. Look for: `Seq Scan` on large tables, `Nested Loop` with high actual rows vs planned rows (bad estimate), `Sort` using disk (`external merge` or `Disk: ...`). Compare `rows` (estimated) vs `actual rows` — a 10x gap means stale statistics. Run `ANALYZE table_name` before drawing conclusions.

### Step 3: Design the Minimum Index Set
Start with the WHERE clause columns in equality-filter order (= first, then ranges). Add ORDER BY columns if the sort is a bottleneck. Use composite indexes: `(user_id, created_at DESC)` covers "get user's recent items" in one index. Consider covering indexes (`INCLUDE` columns, PostgreSQL 11+) to avoid heap lookups. Drop unused indexes: `pg_stat_user_indexes.idx_scan = 0` — it's pure write overhead.

## Quick Reference

| Symptom | Fix |
|---------|-----|
| `Seq Scan` on large filtered table | Add index on the filtered column(s) |
| Index exists but query uses `Seq Scan` | Check `WHERE` uses `LOWER(col)` or `col + 1` — expression indexes needed |
| `Bitmap Index Scan` then `Bitmap Heap Scan` | Normal for moderate selectivity; check if a covering index eliminates the heap scan |
| Sort spills to disk | Increase `work_mem` or add ORDER BY columns to the index |
| `Nested Loop` with high row count | Missing index on the join column of the inner table |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Index every foreign key | Only index FKs that are joined or filtered on |
| Adding an index mid-outage without `CONCURRENTLY` | `CREATE INDEX CONCURRENTLY` — non-blocking, but 2x slower |
| Index on `status` column with 3 values | Low cardinality = index ignored; use partial index or don't index |
| Duplicate indexes: `(a, b)` and `(a)` | `(a, b)` covers queries on `a` alone; drop `(a)` unless it serves a unique constraint |

## Red Flags
- Index with 0 scans over 30 days — it's dead weight; remove it
- `pg_stat_user_tables.n_tup_upd` >> `n_tup_hot_upd` — indexes prevent HOT updates; prune unused indexes
- 10+ indexes on a write-heavy table — each index doubles (or more) the write cost

**An index that's never scanned is not insurance — it's a tax on every INSERT, UPDATE, and DELETE.**
