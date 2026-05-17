---
name: debugging-github-actions
description: "Use when GitHub Actions workflows fail, CI/CD pipelines break, or when debugging automation failures in GitHub workflows"
---

# Debugging GitHub Actions

## Overview
Read failure logs from the end backward — the last error is the symptom, the first error is the root cause. Always distinguish between a step-level bug and an environment-level issue.

## When to Use
- A workflow run shows a red X and you need to find why
- A step succeeds locally but fails in CI
- Tests pass on your machine but not in the runner
- A workflow that previously worked suddenly breaks

**Don't use when:**
- The failure is a known application bug — fix the code directly, not the pipeline

## Core Workflow

### Step 1: Read logs from the last failed step
Open the workflow run, click the failed step, and scroll to the **first** error line. The red "Error:" banner at the very bottom is often a downstream consequence, not the cause.

### Step 2: Classify the failure
Is it a **step issue** (wrong command, missing env var, syntax error) or an **environment issue** (runner OS difference, tool version mismatch, cache corruption, network timeout)? This decides the fix path.

### Step 3: Reproduce locally or add debug output
Use `act` to run the workflow locally, or add a step with `tmate` for SSH access to a live runner. For secret-related issues, verify secrets are set in the repo Settings > Secrets and variables.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Secret not found | Check repo Settings > Secrets and that the env variable mapping is correct |
| Permission denied (push/PR) | Check `contents: write` or `pull-requests: write` in the workflow YAML |
| Cache miss / stale cache | Delete the cache key in Actions > Caches and re-run |
| Version mismatch | Pin exact tool versions in `actions/setup-*` steps |
| Network timeout | Add `retry_wait_seconds` or switch to a self-hosted runner |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reading only the last error line | Scroll up; find the **first** error, not the last error message |
| Debugging on `main` branch | Debug on a feature branch with workflow_dispatch trigger to avoid spamming the team |
| Assuming runner=local environment | Check `runner.os`, available tool versions, and system dependencies explicitly |

## Red Flags
- A step passes on re-run without any change — likely a transient network or race condition
- "secret" or "token" in error output — never print secrets; mask them or use `::add-mask::`
- YAML indentation errors — GitHub Actions YAML is strict; use a linter before pushing

**All of these mean:** treat the root cause, not the symptom. Re-running a flaky job without investigation hides systemic issues.
