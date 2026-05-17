---
name: code-review-workflow
description: Use when reviewing pull requests, performing code review, or when asked to review someone else's code changes
---

# Code Review Workflow

## Overview
Code review catches bugs early, improves code quality, and spreads knowledge across the team. Review the logic, not the person.

## When to Use
- Assigned as a reviewer on a pull request
- Asked by a teammate to look at their changes
- Conducting a pre-merge review as part of CI process

**Don't use when:**
- Changes are trivial and already covered by automated checks (typos, formatting)

## Core Workflow

### Step 1: Understand the Context
Read the PR description and linked issues first. What problem does this solve? Review tests before implementation — they define expected behavior. If tests are missing, ask for them.

### Step 2: Review Systematically
Check in order: security (injection, auth, data exposure), correctness (edge cases, null states, off-by-one), performance (N+1 queries, unnecessary allocations), readability (clear naming, appropriate abstractions). Run the code locally if needed.

### Step 3: Give Constructive Feedback
Be specific: "This loop runs O(n^2) — suggest using a Set" not "This is slow." Ask questions instead of demands: "What happens when the list is empty?" Praise good solutions: "Nice use of early return here." Approve only when all concerns are addressed.

**GOOD:**
```typescript
// Reviewer feedback: specific, actionable, explains the "why"
// "This loop builds a new array on every iteration (O(n^2)).
//  Consider using a Set for O(1) lookups:
//  const seen = new Set(); items.filter(item => !seen.has(item.id) && seen.add(item.id))"
```

**BAD:**
```typescript
// Reviewer feedback: vague, personal, doesn't help the author improve
// "This is slow. Please fix."  — not specific; doesn't say what's slow or how to fix it
// "You wrote this wrong again." — attacks the person, not the code
```

## GOOD/BAD Patterns — Code Under Review

**GOOD:**
```typescript
// Null-safe, handles missing data gracefully
function UserProfile({ userId }: { userId: string }) {
  const { data: user, error, isLoading } = useSWR(`/api/users/${userId}`, fetcher);
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (!user) return <NotFound entity="User" />;
  return <ProfileCard user={user} />;
}
```

**BAD:**
```typescript
// No loading/error/empty states — crashes on null, hangs on loading
function UserProfile({ userId }: { userId: string }) {
  const { data: user } = useSWR(`/api/users/${userId}`, fetcher);
  return <ProfileCard user={user} />;  // user is undefined on first render → crash
}
```

---

**GOOD:**
```python
# Idempotent payment — network retry won't double-charge
@router.post("/charges")
def create_charge(payload: ChargeRequest, idempotency_key: str = Header()):
    existing = db.query(Charge).filter_by(idempotency_key=idempotency_key).first()
    if existing:
        return existing.to_dict(), 200
    charge = process_payment(payload)
    charge.idempotency_key = idempotency_key
    db.add(charge); db.commit()
    return charge.to_dict(), 201
```

**BAD:**
```python
# No idempotency — network retry = double charge
@router.post("/charges")
def create_charge(payload: ChargeRequest):
    charge = process_payment(payload)  # called twice on retry → customer charged twice
    db.add(charge); db.commit()
    return charge.to_dict(), 201

## Quick Reference

| Scenario | Action |
|----------|--------|
| Minor style issue | Suggest but don't block |
| Logic error or bug | Request changes with explanation |
| Great solution | Approve with positive comment |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Nitpicking style that passes linter | Trust automated tools, focus on substance |
| Approving without understanding | Ask questions until the logic is clear |
| Reviewing too fast | Go file by file, don't skim |

### Anti-Patterns — Reject on Sight
- Leaving a comment that says only "Fix this" or "This is wrong" — provides no context about what's wrong or why; the author must guess or chase you for clarification
- Approving a PR with unresolved security concerns (injection, hardcoded secrets, missing auth checks) — a security issue is a blocking concern, not a suggestion
- Rubber-stamping PRs without reading the diff — if you're approving more than 90% of PRs without comments, you're not reviewing; you're signing off
- Review comments that rewrite the code instead of describing the problem — "Use a Map here" without saying why the current approach fails teaches nothing; explain the issue, let the author solve it
- Requesting changes on a PR without a single approving comment on anything — even broken PRs have something worth keeping; pure negativity triggers defensiveness, not improvement
- Nitpicking variable names while missing an N+1 query on the same screen — cosmetic issues are suggestions, not blockers; performance and correctness issues are blockers

## Red Flags
- PR has no tests but adds business logic — request tests before approving
- Large PR with no explanation — ask for a summary or split
- Reviewer rubber-stamping all PRs — slow down and actually read the diff

**All of these mean: request changes or ask clarifying questions before approving.**
