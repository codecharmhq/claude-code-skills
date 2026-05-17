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

## GOOD/BAD Patterns

**GOOD:**
```yaml
# Pin to commit SHA — immutable and auditable
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
```

**BAD:**
```yaml
# Tag reference — mutable; attacker can repoint @v4 to malicious code
- uses: actions/checkout@v4
```

---

**GOOD:**
```yaml
# Explicit least-privilege permissions
permissions:
  contents: read
jobs:
  deploy:
    permissions:
      contents: write  # only deploy job can write
```

**BAD:**
```yaml
# write-all — every job can push to main, delete releases, publish packages
permissions: write-all
```

---

**GOOD:**
```yaml
# Debug via step-level env var, not by printing the secret
- name: Debug connection
  run: curl -v ${{ vars.API_URL }}
  env:
    DEBUG: "true"
```

**BAD:**
```yaml
# Printing secrets to workflow logs — permanent and visible to all repo admins
- name: Debug token
  run: echo "Token is ${{ secrets.DEPLOY_TOKEN }}"
```

### Anti-Patterns — Reject on Sight

- `continue-on-error: true` on a critical step with no `|| true` comment — silently swallows failures
- `run: echo ${{ secrets.X }}` anywhere in the workflow — secrets printed to logs are compromised
- `pull_request_target` without `ref: ${{ github.event.pull_request.head.sha }}` — runs workflow from base branch on untrusted PR code
- `ubuntu-latest` without pinning — `latest` changes without notice and can break your pipeline
- Secrets block at top of workflow instead of per-job — every step has access to every secret
- `actions/upload-artifact@v3` used instead of `@v4` — v3 is deprecated and stopped uploading after 2025-01-30

## Red Flags
- A step passes on re-run without any change — likely a transient network or race condition
- "secret" or "token" in error output — never print secrets; mask them or use `::add-mask::`
- YAML indentation errors — GitHub Actions YAML is strict; use a linter before pushing

**All of these mean:** treat the root cause, not the symptom. Re-running a flaky job without investigation hides systemic issues.
