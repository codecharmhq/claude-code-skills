---
name: authentication-patterns
description: Use when implementing login/logout, choosing between JWT and session auth, adding OAuth2 social login, or hardening token storage and refresh rotation
---

# Authentication Patterns

## Overview
Authentication is the highest-stakes code you write. The breach isn't from choosing the wrong algorithm — it's from the seams: token storage, refresh rotation, session invalidation, and credential reuse. Secure the seams.

## When to Use
- Implementing auth from scratch (login, registration, session management)
- Choosing between JWT access/refresh tokens and server-side sessions
- Adding OAuth2/OIDC social login (Google, GitHub, Apple)
- Implementing passwordless: magic links, WebAuthn/passkeys, or OTP codes

**Don't use when:** you can use a managed auth provider (Auth0, Clerk, Supabase Auth, NextAuth/Auth.js). Don't implement your own cryptographic primitives — use well-audited libraries. Don't add password auth if social login covers your user base — every password database is a liability.

## Core Workflow

**Step 1: Pick the session model.** Server-side sessions (Redis-backed): simple to revoke, stateful, requires session lookup on every request. JWT access + refresh tokens: stateless, good for distributed systems, but revocation requires a blocklist or short-lived access tokens (5-15 min). Never put sensitive data in JWT payloads — JWTs are base64-encoded, not encrypted, and the payload is readable by anyone who obtains the token. Hybrid: short-lived JWT access token (15 min) + server-side refresh token with rotation — best of both worlds.

**Step 2: Implement refresh token rotation and reuse detection.** Every time a refresh token is used, issue a new refresh token and invalidate the old one. If a previously-used refresh token is presented (replay attack), invalidate the entire token family — the legitimate user must re-login. Store refresh token families in a database, not in the JWT. Expiration: access token 15 minutes, refresh token 7-30 days with sliding expiration.

**Step 3: Secure the credential flow, not just the tokens.** Hash passwords with bcrypt (cost factor 12+) or argon2id. Rate-limit login: 5 attempts per account per 15 minutes, 20 attempts per IP per minute. Implement account locking with escalating delays (1s, 5s, 15s, 60s) not permanent lockout (denial-of-service vector). For OAuth2, validate `state` parameter on callback to prevent CSRF, and use PKCE for SPA/mobile flows.

**GOOD:**
```ts
// httpOnly cookie + SameSite=Strict — XSS-proof token storage
res.setHeader('Set-Cookie', [
  `access_token=${accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900`,
  `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800`,
]);
// JavaScript can NEVER read these tokens — XSS loses its prize.
```

**BAD:**
```ts
// JWT in localStorage — one XSS and every token is exfiltrated
localStorage.setItem('access_token', accessToken);   // readable by ANY JS on the page
localStorage.setItem('refresh_token', refreshToken);
// A single compromised npm dependency with an XSS payload = all user sessions stolen.
```

**GOOD:**
```ts
// Refresh token rotation + reuse detection
export async function rotateRefreshToken(oldToken: string) {
  const family = await db.refreshToken.findUnique({ where: { token: oldToken } });
  if (!family) throw new UnauthorizedError('Invalid token');
  if (family.usedAt) {
    // Replay attack detected — invalidate entire family
    await db.refreshToken.updateMany({
      where: { familyId: family.familyId },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Token family compromised — re-login required');
  }
  const newToken = crypto.randomUUID();
  await db.refreshToken.update({
    where: { id: family.id },
    data: { usedAt: new Date(), token: newToken },
  });
  return newToken;
}
```

**BAD:**
```ts
// Stateless refresh tokens — no rotation, no revocation
const refreshToken = jwt.sign(
  { userId, type: 'refresh' },
  REFRESH_SECRET,
  { expiresIn: '30d' }
);
// Token lives for 30 days. No way to revoke it server-side before expiry.
// If leaked, attacker has 30-day access. No rotation means no reuse detection.
```

**GOOD:**
```ts
// Password hashing with argon2id + proper parameters
import * as argon2 from 'argon2';
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MB
  timeCost: 3,         // 3 iterations
  parallelism: 4,
});
const match = await argon2.verify(hash, password);
```

**BAD:**
```ts
// Unsalted SHA-256 — hash collision attack, rainbow table vulnerable
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update(password).digest('hex');
// OWASP's most-hated pattern. No salt, no work factor, millisecond to compute.
// All modern GPU rigs crack this at billions of hashes/second.
```

## Quick Reference

| Scenario | Action |
|----------|--------|
| JWT stored in localStorage and XSS steals it | Move to httpOnly, Secure, SameSite=Strict cookie. JavaScript can't read httpOnly cookies. |
| "Remember me" extends session to 30 days | Extend refresh token expiry, not access token. Access token stays 15 minutes. |
| Logout in a JWT-based system | Delete refresh token server-side. Client deletes access token (in-memory or cookie). That's it. |
| User changes password, old sessions persist | Invalidate ALL refresh token families for that user. Sessions table: `DELETE FROM sessions WHERE user_id = $1`. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| JWT contains `user.role`, role changes in DB, JWT still has old role | Short-lived access tokens (15 min max). Role changes take effect at next refresh. Or use opaque tokens that hit the DB. |
| `httpOnly` cookie prevents JS theft but CSRF is still open | Add `SameSite=Strict` for same-origin requests, `SameSite=Lax` + CSRF token for cross-site safe methods. |
| API keys in client-side code for "simplicity" | Never. API keys are server-side only. Client auth must use short-lived tokens issued by your server. |

### Anti-Patterns — Reject on Sight
- `jwt.verify(token, secret)` without checking `iss` (issuer), `aud` (audience), or `sub` (subject) claims — accepts tokens from any issuer. An attacker's signing key that signs a valid-JWT-structure can authenticate as any user. Always verify all claims relevant to your domain.
- Refresh token stored as a JWT (stateless refresh) — prevents server-side revocation. Once a JWT refresh token is issued, there's no way to invalidate it before expiry without a blocklist (which defeats the stateless purpose). Store refresh tokens as opaque strings in a database with a `revoked` column.
- Rate limiting by IP address only — an attacker can distribute login attempts across thousands of IPs (botnet) and bypass a per-IP limit entirely. Always rate-limit by account identifier (username/email) in addition to IP.
- `localStorage.setItem('token', jwt)` — XSS-exposed. One compromised npm dependency with a DOM injection payload and every token on the domain is exfiltrated. Use `httpOnly` cookies.
- Custom password hashing with MD5, SHA-1, or SHA-256 — these are designed for speed, not password storage. Modern GPUs compute billions of SHA-256 hashes per second. Use `argon2id` or `bcrypt` with cost factor >= 12.

## Red Flags
- Password reset token that doesn't expire (or expires in 24+ hours) — 15 minutes max for password reset links
- Access token lifetime > 15 minutes without a plan for instant revocation — stolen tokens are active until they expire
- The word "crypto" appears in custom code — you're writing primitives; stop and use a library

**Authentication fails at the seams, not the algorithm. Short-lived credentials, rotational refresh, and immediate revocation are more important than which hashing function you picked.**
