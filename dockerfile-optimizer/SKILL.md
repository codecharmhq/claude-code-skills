---
name: dockerfile-optimizer
description: Use when writing production Dockerfiles, reducing image size, fixing layer cache misses, or when migrating from a dev-focused Dockerfile to a multi-stage production build
---

# Dockerfile Optimizer

## Overview
Docker builds are layer-cached, and layer order IS your cache strategy. The #1 mistake: copying all source code before installing dependencies, invalidating the cache on every code change and redownloading 500MB of packages each build.

## When to Use
- A Docker build takes 3+ minutes for a single-line code change
- Production image is 2GB+ and contains build tools
- Layer cache misses on every build even though dependencies haven't changed
- Migrating from `node:latest` to a pinned, minimal base image

**Don't use when:** the image is for local development only, or the project has a standardized buildpack that handles optimization automatically.

## Core Workflow

### Step 1: Order Layers by Change Frequency
Least-frequently-changed first. Layer order: base image → system packages → language runtime → dependencies → source code. `COPY package.json package-lock.json ./` then `RUN npm ci` BEFORE `COPY . .`. This way, code changes don't invalidate the dependency layer. Same pattern for Python: `COPY requirements.txt` → `RUN pip install` before `COPY . .`.

### Step 2: Multi-Stage for Zero Build Tools in Prod
Stage 1 (build): install compilers, build artifacts. Stage 2 (runtime): `COPY --from=build` only the compiled output. For Node: `npm run build` in stage 1, then `COPY --from=build /app/dist ./dist` and `npm ci --production` in stage 2. For Go: build a static binary in stage 1, then `FROM scratch` or `FROM alpine` with just the binary. Runtime stage must have zero compilers, zero dev headers.

### Step 3: Harden the Runtime Image
Pin base image to digest, not tag: `FROM node:20-alpine@sha256:abc...`. Run as non-root: `USER 1000`. Use `.dockerignore` to exclude `node_modules`, `.git`, `*.md`, `.env`. Set `HEALTHCHECK` in the Dockerfile. Never `COPY .` without a `.dockerignore` — you're shipping your entire dev environment including secrets and 2GB of build artifacts.

## Quick Reference

| Goal | Technique |
|------|-----------|
| Faster rebuilds | Dependency files copied BEFORE source code |
| Smaller image | Multi-stage: build in stage 1, copy artifacts to stage 2 |
| Security | `FROM ...@sha256:...` (digest, not tag), `USER 1000` |
| Layer debugging | `docker history <image> --no-trunc` shows every layer's size |
| Cache bust only when needed | `ARG CACHEBUST=1` then `RUN ...` — change arg to bust |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `FROM node:latest` | Pin to major + digest: `node:20-alpine@sha256:...` |
| `RUN apt-get upgrade` without cleanup | Chain: `apt-get update && apt-get install -y pkg && rm -rf /var/lib/apt/lists/*` |
| `COPY . .` before `RUN npm ci` | Swap order; dependencies first, code second |
| `ADD` instead of `COPY` | `COPY` is deterministic; `ADD` auto-extracts tarballs unpredictably |

## Red Flags
- Image tag contains ":latest" — unpinned, builds are non-reproducible
- `npm install` instead of `npm ci` in Docker — `install` mutates lockfile; `ci` is deterministic
- `EXPOSE` without a documented port — the port must match what the app actually listens on

**The Docker layer cache is your fastest CI. Protect it by ordering layers from most stable (base image) to least stable (source code).**
