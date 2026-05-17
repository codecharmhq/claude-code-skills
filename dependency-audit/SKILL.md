---
name: dependency-audit
description: "Use when updating project dependencies, fixing security vulnerabilities in dependencies, or when packages need to be upgraded"
---

# Dependency Audit

## Overview
A healthy dependency strategy balances security, stability, and maintenance burden. Audit regularly, update deliberately: lockfile refreshes first, minor/patch upgrades next, major upgrades last with separate validation.

## When to Use
- A security advisory (CVE, Dependabot alert, `npm audit`) reports a vulnerability
- Dependencies are months out of date and need a systematic upgrade
- A pull request from Dependabot or Renovate needs review
- You are evaluating whether to add a new dependency

**Don't use when:**
- The project is a throwaway prototype — audit only for known critical CVEs

## Core Workflow

### Step 1: Scan for vulnerabilities
Run the ecosystem-specific audit tool: `npm audit`, `pip audit`, `cargo audit`, `go vulncheck`, `bundler-audit`. Review the output: severity (Critical/High/Medium/Low), patched version, and whether the vulnerable path is reachable from your code.

### Step 2: Evaluate update risk
Check semver of the patched version. Lockfile-only refresh (`npm update`) is zero-risk. Minor/patch bumps rarely break. Major upgrades require testing the full application. Check for transitive dependency conflicts — a patched sub-dependency may force upgrades elsewhere.

### Step 3: Apply and test
Update lockfile first: `npm update <pkg>` or manually edit the lockfile. Run the full test suite. For major upgrades, treat it as a feature branch with its own review. For critical CVEs with no patch available, consider a fork, a workaround, or removing the feature that uses it.

### Step 4: Shrink the dependency footprint
Periodically prune unused deps (`depcheck`, `cargo-udeps`). Replace kitchen-sink libraries with smaller alternatives. Each dependency is a liability — fewer deps means fewer audits.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Low/Medium CVE, patch is a patch bump | `npm update <pkg>` and commit |
| High/Critical CVE, no breaking change | Update and prioritize in current sprint |
| Major upgrade needed for fix | Create a feature branch, test thoroughly, review |
| No patch available | Pin an override fork, add a workaround, or remove the feature |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Running `npm audit fix` blindly | Review each fix — `audit fix --force` can upgrade across majors and break things |
| Ignoring transitive dependencies | `npm ls <vulnerable-pkg>` to see what pulls it in; update the direct parent |
| Pinning every version | Pin only what breaks; float the rest so Dependabot can auto-fix |
| Not testing after a dependency update | Even a patch bump has broken production — run tests before merging |

## Red Flags
- A dependency with 10+ transitive deps for one function — replace with inline code or a smaller lib
- Deprecated package with no replacement — fork or migrate before it becomes a security hole
- Dependabot PRs piling up unmerged — each one is an unpatched vulnerability
- Pinning versions without a comment — future you won't know why it's pinned

**All of these mean:** reduce the dependency surface first, then update what remains. Fewer deps is the only permanent fix.
