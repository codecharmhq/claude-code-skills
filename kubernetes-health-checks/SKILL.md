---
name: kubernetes-health-checks
description: Use when configuring Kubernetes liveness, readiness, or startup probes, or when debugging pods stuck in CrashLoopBackOff or failing health checks under load
---

# Kubernetes Health Checks

## Overview
Kubernetes probes don't just report health — they control the pod lifecycle. A misconfigured liveness probe kills your pod in production. A missing readiness probe routes traffic to pods that can't serve. They are the #1 cause of cascading deployment failures.

## When to Use
- Configuring probes for a new deployment or StatefulSet
- Pods cycle between Running and CrashLoopBackOff every few seconds
- Traffic hits a pod before it's ready, producing 502 errors during rolling updates
- Choosing between `exec`, `httpGet`, and `tcpSocket` probe types

**Don't use when:** a sidecar handles health (like Istio or Linkerd) — use their native health checks instead of duplicating with K8s probes.

## Core Workflow

### Step 1: Choose the Right Probe for Each Purpose
**Startup probe** (K8s 1.18+): protects slow-starting containers from liveness kills. Max `failureThreshold * periodSeconds` must exceed worst-case startup time. Once it succeeds, liveness takes over. **Liveness probe**: restart the container if it fails. Only check internal state (deadlock, corrupted state) — never check external dependencies. **Readiness probe**: remove from service endpoints if it fails. Check DB connectivity, cache warmup, queue consumer readiness.

### Step 2: Set Thresholds That Survive Real Conditions
`initialDelaySeconds`: pad by 50% beyond measured startup. `periodSeconds`: 10s minimum — probing every second adds CPU pressure cluster-wide. `timeoutSeconds`: must be shorter than `periodSeconds`, or probes stack and collide. `failureThreshold`: at least 3 for liveness (avoid transient restarts), at least 2 for readiness. Never set `failureThreshold: 1` on liveness — every GC pause or CPU spike triggers a restart.

### Step 3: Design the Health Endpoint
Liveness: `/healthz` — returns 200 if the process is alive. Minimal checks only: process responding, no internal deadlock. Readiness: `/readyz` — returns 200 if the service can accept requests. Check: DB ping (with timeout), cache connection, mandatory config loaded. Never check external APIs in readiness — one downstream outage removes all your pods from service.

## Quick Reference

| Problem | Probe Fix |
|---------|-----------|
| CrashLoopBackOff on slow start | Add startup probe; increase `initialDelaySeconds` |
| 502s during rolling update | Add readiness probe with DB check; set `failureThreshold: 2` |
| Pod restarts under GC pause | Increase liveness `failureThreshold` to 5 |
| Never becomes ready after deploy | Readiness checks an external API — remove that dependency |
| Traffic hits terminating pod | Add `preStop` hook with `sleep 5` before SIGTERM |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Liveness checks database connectivity | DB outage restarts ALL pods; move DB check to readiness only |
| Same endpoint for liveness and readiness | Separate endpoints with different failure criteria |
| `failureThreshold: 1` on liveness | Minimum 3; one hiccup shouldn't kill a healthy pod |
| No startup probe for JVM/ML model pods | Add startup probe with 60-120s `failureThreshold * periodSeconds` |

## Red Flags
- Liveness probe that curls an external API — cascade failure generator
- Readiness and liveness pointing at the same endpoint — they serve different purposes
- `periodSeconds: 1` — probing too fast competes with your application for CPU

**The liveness probe should only answer: "is this process itself broken?" If the answer depends on anything external, move it to readiness.**
