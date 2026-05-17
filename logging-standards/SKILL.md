---
name: logging-standards
description: Use when adding logging to applications, when logs are inconsistent or unhelpful, or when setting up logging infrastructure
---

# Logging Standards

## Overview
Consistent structured logging turns raw log data into actionable observability. Every log line should answer: what happened, when, in which request, and with what context.

## When to Use
- Logs are plain text without consistent structure
- Debugging production issues requires adding new log statements
- Log levels are used inconsistently (everything logged as ERROR)
- Sensitive data appears in log output

**Don't use when:**
- The application is purely local/CLI with no operational runtime

## Core Workflow

### Step 1: Define Log Levels and Conventions
- **ERROR**: Something is definitely wrong and needs human attention
- **WARN**: Something unexpected happened but the system recovered
- **INFO**: Business events, service lifecycle, significant state changes
- **DEBUG**: Developer details — not enabled in production by default
- **TRACE**: Step-by-step execution flow for deep debugging

### Step 2: Adopt Structured Logging
Log in JSON format with consistent field names: `timestamp`, `level`, `message`, `request_id`, `service`, `duration_ms`. Tools like structured loggers parse JSON natively — plain text requires regex.

### Step 3: Enrich Every Log with Context
Attach correlation ID at the request boundary and propagate it. Include function name, file, line number, and relevant identifiers (user ID, order ID — never PII or secrets).

## Quick Reference

| Scenario | Level |
|----------|-------|
| Service failed to start | ERROR |
| Request rate exceeds threshold | WARN |
| User signed up successfully | INFO |
| Trace-level flow debugging | DEBUG |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Logging sensitive data (passwords, tokens) | Whitelist safe fields, scan in CI |
| Inconsistent field names across services | Define a shared logging schema |
| Over-logging in hot paths | Measure log volume, use rate limiting |

## GOOD/BAD Patterns

**GOOD:**
```python
# Structured JSON logging — machine-parseable, queryable
import structlog
logger = structlog.get_logger()
logger.info("order.created", order_id="ord_123", total=4999, currency="usd")
# Output: {"event": "order.created", "order_id": "ord_123", "total": 4999, "currency": "usd", "timestamp": "2026-05-17T10:30:00Z", "level": "info"}
```

**BAD:**
```python
# Plain text interpolation — requires regex to parse
logging.info(f"Order {order_id} created for ${total}")
# Output: Order ord_123 created for $49.99
# Cannot filter, aggregate, or alert on this without fragile regex
```

---

**GOOD:**
```python
# Context-enriched with correlation ID
logger = logger.bind(request_id=request_id, user_id=user_id, service="checkout")
logger.info("payment.attempt", payment_method="card", amount_cents=4999)
```

**BAD:**
```python
# No context — cannot trace the request
logging.info("payment attempted")
# Which user? Which order? Which request? No way to know.
```

---

**GOOD:**
```python
# Proper log levels
logger.error("payment.gateway.timeout", gateway="stripe", timeout_ms=5000, order_id=order_id)
logger.warning("rate_limit.approaching", current_rpm=950, limit=1000)
logger.info("user.onboarded", user_id=user_id, plan="pro")
logger.debug("sql.query", query=sql, params=params)
```

**BAD:**
```python
# Everything logged as ERROR — alert fatigue guarantees real issues are ignored
logging.error(f"User {user_id} logged in")    # This is INFO, not ERROR
logging.error(f"Cache miss for key {key}")     # This is DEBUG, not ERROR
logging.error(f"Rate limit at 950/1000")       # This is WARN, not ERROR
```

### Anti-Patterns — Reject on Sight

- `log.info(f"password={password}")` or any log containing tokens, passwords, PII — secrets in logs are a security incident; use structured fields and scrub sensitive data
- Inconsistent field names across microservices (`orderId` in one, `order_id` in another, `OrderID` in a third) — define a shared logging schema and enforce with lint
- `logger.info()` inside a hot loop that executes 100K times per second — that's a DDoS against your logging infrastructure; use rate-limited or sampled logging
- No `request_id` or correlation ID in any log line — cannot trace a single request across services; observability starts here
- Production logs stored as plain `.txt` files — without structured format, every query requires grep + regex + prayer
- `System.out.println()` or `console.log()` used for production logging — these lack log levels, structured output, and routing; use a proper logger

## Red Flags
- Production logs cannot be queried without grep and regex
- Logs contain passwords, API keys, or personal data
- No correlation ID — cannot trace one request across services

**All of these mean: logging needs standardization before adding more observability tooling.**
