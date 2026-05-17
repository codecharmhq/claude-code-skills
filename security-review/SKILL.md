---
name: security-review
description: Use when reviewing code for security issues, before deploying to production, or when security vulnerabilities are suspected.
---

# Security Review

## Overview
Security is everyone's responsibility. A systematic review catches the OWASP Top 10 before they reach production. Automate what you can, verify what you can't.

## When to Use
- Before any production deployment, especially a public-facing one
- When a pull request touches authentication, authorization, or payment logic
- After a dependency audit reveals critical or high severity vulnerabilities
- When investigating a reported security incident or suspicious behavior

**Don't use when:**
- Reviewing a personal script with no network access and no user input

## Core Workflow

### Step 1: Scan Dependencies
Run `npm audit`, `pip-audit`, `go mod verify`, or equivalent. Check for known CVEs. Any critical or high severity vulnerability must be patched or have a documented exception before proceeding.

### Step 2: Manual Code Review Against Checklist
Check each category: SQL injection (parameterized queries), XSS (output encoding), CSRF (tokens for state-changing requests), authentication (password hashing, session management, MFA), authorization (server-side access control on every endpoint), secrets (no hardcoded API keys, tokens, or passwords), input validation (whitelist, never trust user input), error handling (no stack traces to users), logging (no PII in logs).

### Step 3: Test Security Boundaries
Verify file upload validation, rate limiting on auth endpoints, HTTPS enforcement, security headers (CSP, HSTS, X-Frame-Options), and cookie flags (Secure, HttpOnly, SameSite). Use automated scanners (ZAP, Burp, Semgrep) as a second pass.

## Quick Reference

| Scenario | Action |
|----------|--------|
| SQL query uses string interpolation | Replace with parameterized query immediately |
| API key in source code | Rotate the key, move to env var or secrets manager |
| No auth on an admin endpoint | Add authentication and authorization check before merge |
| Dep with critical CVE | Update or replace the dependency; file exception if impossible |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Trusting client-side validation | Re-validate everything server-side |
| Security added as an afterthought | Use secure defaults; add review gate to CI pipeline |
| Ignoring dependencies with known flaws | Scan before every deploy; automate alerts for new CVEs |

## GOOD/BAD Patterns

**GOOD:**
```python
# Parameterized query — safe from injection
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
```

**BAD:**
```python
# String interpolation — SQL injection waiting to happen
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

---

**GOOD:**
```python
# Secrets from environment — never in source
import os
api_key = os.environ["STRIPE_API_KEY"]
```

**BAD:**
```python
# Hardcoded credential — leaked the instant this hits git
STRIPE_API_KEY = "sk_live_1a2b3c4d5e6f7g8h9i0j"
```

---

**GOOD:**
```python
# Server-side validation with whitelist
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg"}
if file.extension not in ALLOWED_EXTENSIONS:
    raise HTTPException(403)
```

**BAD:**
```python
# Client-side validation only — trivial to bypass
if file.extension in ALLOWED_EXTENSIONS:  # this runs in browser JS
    upload(file)  # any extension accepted via curl
```

### Anti-Patterns — Reject on Sight

- `eval()` / `exec()` on any user-supplied string — equivalent to `rm -rf /` as a service
- `password = request.form["pw"]; hashlib.md5(password)` — unsalted, obsolete hash; reject without exception
- `CSRFProtect(app)` with `exempt` on every POST route — you disabled the entire protection
- `cipher = AES.new(key, AES.ECB)` — ECB mode leaks plaintext patterns; use GCM or ChaCha20-Poly1305
- `if user.role == "admin":` in client-side code — auth check must be server-side and unreachable from the frontend
- `assert user.is_authenticated` — asserts are stripped with `python -O`, disabling auth at runtime
- `SECRET_KEY = "charlie-horse-battery-staple"` — hardcoded secret in source; must be env var or vault
- NPM package with 10M+ weekly downloads used for a `leftPad` equivalent — dependency blast radius out of proportion to utility

## Red Flags
- Any hardcoded credential in the diff
- Endpoints that accept user input but have no validation
- "We'll add security later" in a PR description
- No HTTPS, no security headers, no rate limiting on auth

**All of these mean:** block the merge until each red flag is resolved or has a documented exception.
