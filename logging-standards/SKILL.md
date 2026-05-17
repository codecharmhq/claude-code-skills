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

## Red Flags
- Production logs cannot be queried without grep and regex
- Logs contain passwords, API keys, or personal data
- No correlation ID — cannot trace one request across services

**All of these mean: logging needs standardization before adding more observability tooling.**
