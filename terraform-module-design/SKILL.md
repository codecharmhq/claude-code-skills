---
name: terraform-module-design
description: Use when designing reusable Terraform modules, refactoring monolithic root modules, or when managing state drift across environments with workspaces or Terragrunt
---

# Terraform Module Design

## Overview
Terraform modules are function calls for infrastructure. A good module has a narrow public interface (2-5 variables), sensible defaults, and a single responsibility. A bad module has 40 variables, creates 30 resources, and every caller overrides every default.

## When to Use
- Copy-pasting the same resource block across 3+ environments
- Choosing between Terraform workspaces, Terragrunt, and separate state files for multi-env
- A root module has 500+ lines and mixes networking, compute, and database resources
- Designing a module intended for other teams to consume

**Don't use when:** the infrastructure is unique to one environment. Not everything needs to be a module — composition over premature abstraction.

## Core Workflow

### Step 1: Define the Module's Single Responsibility
One module = one infrastructure concern. VPC module: networking only. RDS module: database only. EKS module: cluster only. Compose them in the root module. Never create a "common-infra" module — that's a monolith by another name. Use `terraform graph | dot -Tpng > graph.png` to visualize dependencies.

### Step 2: Design the Variable Interface
Expose only what callers MUST configure: environment name, instance size, region. Everything else gets a sensible default or a `locals` block. Use `type` constraints: `map(object({...}))` is self-documenting. Add `validation` blocks for input boundaries. Never accept a raw ARN string where a `data` lookup suffices. Output: only the attributes callers need to reference (instance IDs, endpoint URLs, security group IDs).

### Step 3: Manage State With Explicit Backend Config
Each environment gets a separate state file (separate `.tfstate` in S3/GCS). Use Terragrunt for DRY backend config when managing 5+ environments. Use `terraform workspace` only for ephemeral environments (PR previews) — workspaces share the same backend and auth, which is dangerous for prod/nonprod separation. Always enable state locking (DynamoDB for S3 backend).

## Quick Reference

| Scenario | Pattern |
|----------|---------|
| Multi-environment (prod/staging/dev) | Separate state files per env; Terragrunt for DRY config |
| Ephemeral PR environments | `terraform workspace new pr-123` + destroy after merge |
| Module consumed by other teams | Version via git tags; semantic versioning on module releases |
| Sensitive output (DB password) | Mark `sensitive = true`; never print; use vault/Secrets Manager |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| 40 variables with no defaults | Split the module; it's doing too much |
| `terraform.tfvars` in version control with secrets | `.gitignore` tfvars; use CI secrets or Vault |
| `count` where `for_each` is needed | `for_each` preserves identity through adds/removes; `count` shifts indices |
| Provider config inside a module | Providers belong in root; modules inherit them |

## Red Flags
- `terraform destroy` without a plan first — always `terraform plan -destroy -out=plan.tfplan`
- State file not encrypted — S3: enable SSE; GCS: default encryption is on but verify
- Module that `depends_on` everything — dependencies should be implied by resource attribute references

**A Terraform module with no `validation` blocks and no `type` constraints on variables is not reusable — it's a copy-paste hazard.**
