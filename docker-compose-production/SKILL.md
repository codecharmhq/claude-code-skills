---
name: docker-compose-production
description: Use when adapting docker-compose for production, configuring health checks, managing secrets, or setting resource limits and restart policies
---

# Docker Compose Production Patterns

## Overview
Docker Compose isn't just for `docker compose up` on a dev laptop. In production, it's a single-host orchestrator that must handle graceful shutdown, health-check-driven restarts, secret injection without `.env` files, and resource limits that prevent noisy neighbors from starving the host.

## When to Use
- Running production services on a single VM without Kubernetes
- Moving a Compose file from development to production and need hardening
- Configuring health checks, restart policies, and resource limits
- Managing secrets and configs without `.env` files committed to the repo

**Don't use when:** you need multi-host orchestration — use Kubernetes or Docker Swarm. Don't use Compose in production if you need zero-downtime rolling updates — Compose restarts containers sequentially. Don't use if your team can't SSH into the host — managed container services are safer.

## Core Workflow

**Step 1: Configure production restart, resource, and logging policies.** Restart policy: `restart: unless-stopped` (survives host reboot, stops cleanly on manual `docker compose stop`). Never `restart: always` — it restarts even after intentional shutdown. Resource limits: `deploy: resources: limits: { cpus: '2', memory: '512M' }, reservations: { cpus: '0.5', memory: '256M' }`. Without limits, one container OOM kills others. Logging: `logging: { driver: 'json-file', options: { max-size: '10m', max-file: '3' } }` — prevents filling the host disk.

**Step 2: Implement health checks that verify the application, not just the process.** `healthcheck: { test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'], interval: '30s', timeout: '5s', retries: 3, start_period: '40s' }`. The health check must call an actual endpoint that verifies database connectivity — a process check only confirms the container is running, not serving. `start_period` gives the app time to boot before health checks begin. Without it, slow-starting apps get restarted mid-boot. Health checks drive `depends_on` conditions: `depends_on: db: { condition: service_healthy }`.

**Step 3: Inject secrets via file mounts, never environment variables.** `secrets: { db_password: { file: /run/secrets/db_password } }` mounts the secret as a file inside the container. The app reads from `/run/secrets/db_password`, not from `DB_PASSWORD` env var. Environment variables leak to child processes, appear in debug logs, and show up in `docker inspect`. Use Docker secrets or bind mounts from a protected directory: `- /etc/app/secrets:/run/secrets:ro`. Never put secrets in `environment:` or `.env` files in production.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Container runs but health check fails | Check `docker inspect <container> | jq '.[0].State.Health'`. Look at the last 5 check results with logs. |
| App crashes during deploy, Compose doesn't restart | `restart: unless-stopped` only restarts on exit code ≠ 0. If the process exits 0 intentionally, Compose won't restart. |
| Host runs out of disk from container logs | Add `max-size: 10m, max-file: 3` to logging config. Without it, logs grow unbounded. |
| Service A starts before DB is ready | Add `depends_on: db: { condition: service_healthy }` and ensure DB has a healthcheck. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `.env` file with `POSTGRES_PASSWORD=admin123` committed to git | Use Docker secrets or `env_file` pointing to a file outside the repo. `.env` in `.gitignore`. |
| No `start_period` on a JVM/Node app that takes 60s to boot | Health check kills the container during startup. Set `start_period: 90s` to cover the full boot window. |
| `restart: always` on a service that should be stoppable | `always` restarts even after `docker compose stop`. Use `unless-stopped` for production. |

## Red Flags
- Health check endpoint returns 200 but the app can't reach the database — health check isn't deep enough
- `docker compose down && docker compose up -d` as the deploy command — this causes downtime between down and up
- Container has no memory limit — one memory leak takes down the entire host

**Production Compose is hardened with resource limits, file-based secrets, and app-level health checks. The goal is not to mimic Kubernetes but to run a reliable single-host deployment with guardrails.**
