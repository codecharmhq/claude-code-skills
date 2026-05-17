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

**GOOD:**
```yaml
# File-based secrets — process isolation, no env var leakage
secrets:
  db_password:
    file: /run/secrets/db_password   # outside the repo, 0400 permissions
  api_key:
    file: /run/secrets/api_key

services:
  app:
    secrets:
      - db_password
      - api_key
    # App reads from /run/secrets/db_password, not from env var
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password  # path, not the value
```

**BAD:**
```yaml
# Environment variable secrets — visible in docker inspect, child processes, and logs
services:
  app:
    environment:
      - DB_PASSWORD=supersecret123     # visible in: docker inspect, docker logs, /proc/PID/environ
    # Any child process (shell exec, subprocess) inherits DB_PASSWORD.
    # If the app crashes and dumps env to a log file: credentials in plaintext.
```

**GOOD:**
```yaml
# Health check with application-level verification
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s   # JVM/Node need time to boot

  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  app:
    depends_on:
      db:
        condition: service_healthy  # app starts only when DB is accepting connections
```

**BAD:**
```yaml
# No health check, no start_period — container runs but app may be dead
services:
  app:
    # No healthcheck defined. Docker only knows if the PROCESS is alive.
    # If Node.js starts but Express fails to bind to port 3000, Docker says "running".

  db:
    # No healthcheck. depends_on: true means "process started", not "ready to accept connections".
  app:
    depends_on:
      - db   # triggers start WHILE db is still initializing — connection refused
```

**GOOD:**
```yaml
# unless-stopped — restarts on crash, stays dead on manual stop
services:
  app:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

**BAD:**
```yaml
# restart: always — restarts even after intentional shutdown
services:
  app:
    restart: always    # docker compose stop → container restarts!
    # No resource limits — one memory leak OOM-kills the entire host
```

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

### Anti-Patterns — Reject on Sight
- `network_mode: host` in production — bypasses Docker's network isolation, making all containers share the host's network stack. Port conflicts, no network namespace isolation, and containers can access any service on localhost without going through the compose network. Use Compose's default bridge network with explicit port mapping.
- `command: npm run start` (or `npm run dev`) in production — `npm run start` runs through npm, adding an extra process layer and startup delay. Use `CMD ["node", "dist/index.js"]` directly, or use a process manager like `tini` for proper signal handling (`docker run --init`).
- `image: latest` in production — non-reproducible deploys. `latest` means something different on every pull. A broken `latest` push breaks production on the next deploy. Pin to semantic versions: `image: myapp:1.2.3` or a specific SHA digest.
- Environment variable interpolation in Compose files for secrets — `${DB_PASSWORD}` in `docker-compose.yml` is evaluated at parse time and the raw value is embedded in the compose config. Use Docker secrets or `.env` files outside the repo, never inline shell variables.
- No `healthcheck` on any service — Docker only knows if the container process is alive, not if the application is responding. A Node.js process that started but crashed internally (port not bound) still shows as "running." Every service should have a healthcheck that validates its specific readiness condition.
- `docker compose down && docker compose up -d` as deploy — causes downtime between the `down` (stops all containers) and `up` (starts new ones). Use `docker compose up -d --no-deps --build <service>` for zero-downtime-ish rolling restart of individual services.

## Red Flags
- Health check endpoint returns 200 but the app can't reach the database — health check isn't deep enough
- `docker compose down && docker compose up -d` as the deploy command — this causes downtime between down and up
- Container has no memory limit — one memory leak takes down the entire host

**Production Compose is hardened with resource limits, file-based secrets, and app-level health checks. The goal is not to mimic Kubernetes but to run a reliable single-host deployment with guardrails.**
