---
name: ci-cd-pipeline-security
description: Use when hardening CI/CD pipelines, auditing workflow permissions, or when secrets are exposed in build logs or a pipeline runs untrusted third-party code
---

# CI/CD Pipeline Security

## Overview
Your CI/CD pipeline has credentials to deploy to production. That makes it the highest-value attack surface after your source code. Pipeline security is about least privilege: every workflow gets exactly the permissions it needs, for exactly the duration of the run, from a branch that has code review.

## When to Use
- Setting up CI/CD for a new repository or adding a new deployment workflow
- A workflow uses a PAT with repo-wide access when it only needs to read one repo
- Audit or compliance review requires pipeline hardening
- Third-party GitHub Action is used without version pinning or code review

**Don't use when:** the pipeline already runs with `read-only` permissions and OIDC-based cloud auth. Don't add friction without closing a real threat.

## Core Workflow

### Step 1: Apply Least Privilege to Workflow Permissions
Start with `permissions: read-all` at the workflow level. Grant write permissions per-job, not per-workflow. A lint job needs only `contents: read`. A release job needs `contents: write`. Never use `permissions: write-all` — it gives every job the ability to push to main, publish packages, and delete releases.

### Step 2: Replace Long-Lived Secrets With OIDC
Static cloud credentials in repo secrets are a breach waiting to happen. OIDC: the workflow presents an auto-generated JWT to the cloud provider, which exchanges it for short-lived credentials — no secrets stored in GitHub. AWS: `aws-actions/configure-aws-credentials` with OIDC role. GCP: `google-github-actions/auth`. Only fall back to long-lived secrets when the provider doesn't support OIDC.

### Step 3: Pin Actions and Review Third-Party Code
Pin actions to a full commit SHA: `uses: actions/checkout@11bd719...` NOT `@v4` or `@main`. Tags are mutable and `@main` auto-updates — both are supply chain risks. Before adding a third-party action: read its source code, check its issue tracker for security reports, and verify it's actively maintained. Prefer official actions (`github/`, `aws-actions/`, `google-github-actions/`) when available.

## Quick Reference

| Threat | Mitigation |
|--------|------------|
| Secret leak in build log | Set `echo "::add-mask::$SECRET"` for dynamic secrets |
| Untrusted PR accessing secrets | Use `pull_request_target` only with explicit checkout of PR ref |
| Workflow pushes to protected branch | Branch protection rule: disallow workflow push without PR |
| Compromised third-party action | Pin to commit SHA; periodically review with `actionlint` |
| npm token in `.npmrc` during build | Use OIDC (`npm config set registry ... -- //...:_authToken=NPM_TOKEN`) |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `GITHUB_TOKEN` with `write-all` | Set `permissions: {}` and add only what's needed |
| PAT stored as repo secret instead of using `GITHUB_TOKEN` | PATs outlive the job; `GITHUB_TOKEN` auto-expires |
| `pull_request_target` without `ref: ${{ github.event.pull_request.head.sha }}` | Default checkout is the BASE branch — your tests run against merged code, not the PR |
| Secrets passed to forked PR workflows | `pull_request` from forks does NOT have access to secrets by default — that's correct |

## GOOD/BAD Patterns

**GOOD:**
```yaml
# Per-workflow and per-job least privilege
permissions:
  contents: read
jobs:
  deploy:
    permissions:
      contents: write  # only this job can push
      id-token: write   # needed for OIDC
```

**BAD:**
```yaml
# write-all — every job inherits full repo access
permissions: write-all
```

---

**GOOD:**
```yaml
# OIDC-based cloud auth — no static secrets, auto-expiring credentials
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@e3e6ae9
  with:
    role-to-assume: arn:aws:iam::123456:role/github-oidc-role
    aws-region: us-east-1
```

**BAD:**
```yaml
# Static cloud keys in repo secrets — breach leaks permanent credentials
- name: Configure AWS credentials
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_KEY }}
  run: aws s3 sync ...
```

---

**GOOD:**
```yaml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
```

**BAD:**
```yaml
- uses: actions/checkout@v4     # mutable tag — can be repointed
- uses: some-org/unverified-action@master  # auto-updates — supply chain risk
```

### Anti-Patterns — Reject on Sight

- `GITHUB_TOKEN` with `write-all` on any workflow — replace with `permissions: {}` (nothing) and grant per-job
- Secrets dumped into an `env:` block at workflow top — every step sees every secret; scope them per-step
- `pull_request` workflow that accesses secrets — PRs from forks must not receive secrets; use `pull_request_target` with explicit ref checkout only
- Any action referenced by a two-segment tag (`@v1`, `@v2`, `@master`) — mutable references are a tag-repointing attack vector
- `run: echo "${{ secrets.X }}"` or any action that prints `${{ secrets }}` in its output — secrets are compromised the instant they appear in logs
- `npm publish` in a workflow without `provenance` flag — no attestation; anyone can publish a compromised package to that version

## Red Flags
- Workflow with `issues: write, pull-requests: write, contents: write` — can a single job really need all three?
- Action referenced by tag (`@v2`) or branch (`@master`) — attack surface for tag repointing
- `env:` block that dumps all secrets into every step — each step should only see the secrets it needs

**If a compromised workflow can push to main or deploy to production without human review, the pipeline is the weakest link in your security model.**
