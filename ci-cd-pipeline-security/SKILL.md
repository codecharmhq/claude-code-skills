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

## Red Flags
- Workflow with `issues: write, pull-requests: write, contents: write` — can a single job really need all three?
- Action referenced by tag (`@v2`) or branch (`@master`) — attack surface for tag repointing
- `env:` block that dumps all secrets into every step — each step should only see the secrets it needs

**If a compromised workflow can push to main or deploy to production without human review, the pipeline is the weakest link in your security model.**
