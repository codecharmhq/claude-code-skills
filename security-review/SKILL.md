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

## Red Flags
- Any hardcoded credential in the diff
- Endpoints that accept user input but have no validation
- "We'll add security later" in a PR description
- No HTTPS, no security headers, no rate limiting on auth

**All of these mean:** block the merge until each red flag is resolved or has a documented exception.
