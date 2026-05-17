---
name: websocket-real-time-patterns
description: Use when adding WebSocket or SSE features, designing reconnection strategies, choosing between polling and push, or scaling connections across instances
---

# WebSocket & Real-Time Patterns

## Overview
Real-time is an architectural commitment, not a feature flag. Adding WebSockets changes how you deploy (sticky sessions or pub/sub), how you scale (connection state is memory), and how clients handle disconnection (exponential backoff with jitter). The protocol choice — WebSocket, SSE, or polling — is secondary to the reconnect strategy.

## When to Use
- Building features that need server-to-client push (notifications, live chat, collaborative editing)
- Choosing between WebSocket, Server-Sent Events (SSE), and polling for a specific use case
- Designing reconnection logic that survives network flaps and server restarts
- Scaling real-time beyond a single server instance

**Don't use when:** the data updates every 30+ seconds — polling is simpler and more reliable. Don't use WebSockets if only the server pushes (no client → server messages) — SSE is lighter and auto-reconnects. Don't add real-time to a REST API that works fine.

## Core Workflow

**Step 1: Choose the transport by message direction, not by "real-time" label.** Server → client only: SSE. Built-in reconnection, works over HTTP/2 and HTTP/3, simpler infrastructure (no special proxy config). Bidirectional: WebSocket. Full-duplex, lower latency for frequent small messages, but requires sticky sessions or a pub/sub adapter when scaling. Client → server only: don't use real-time — POST/PUT is simpler. Consider WebTransport for latency-critical bidirectional (gaming, streaming) — it runs over QUIC with no head-of-line blocking.

**Step 2: Implement exponential backoff with jitter for reconnection.** Never retry at a fixed interval — thundering herd kills your server on restart. Algorithm: `delay = min(base * 2^attempt, maxDelay) * (1 + random(0, 0.5))`. Base: 1 second, maxDelay: 30 seconds, max attempts: Infinity (or 10 before falling back to polling). On `online` event (`navigator.onLine`), reset attempt counter — the disconnection was transient. Track `visibilitychange`: pause WebSocket when the tab is hidden, resume/reconnect on visibility. Never reconnect when the tab is backgrounded.

**Step 3: Scale with a pub/sub adapter, not sticky sessions.** Sticky sessions (load balancer pins a client to one server) fail when that server restarts — all connected clients disconnect. Instead: each server instance subscribes to a pub/sub channel (Redis, NATS, Kafka). When server A publishes a message, servers B and C receive it and push to their connected clients. This decouples the WebSocket server from the message source. Client connects to any instance; messages route through pub/sub. Database is the source of truth; pub/sub is the delivery mechanism.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Chat messages arriving out of order | Add a sequence number or timestamp to each message. Reorder in the client buffer. |
| WebSocket disconnects during deployment | Graceful shutdown: send close frame, drain messages, close. Client reconnects with backoff. |
| 10K concurrent WebSocket connections hitting file descriptor limits | Tune `ulimit -n`, use `SO_REUSEPORT`, or move to managed services (Pusher, Ably). |
| SSE not supported in IE or very old browsers | SSE is supported everywhere modern. If you need IE, use polling — the polyfill IS polling. |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Fixed 3-second reconnect interval | Exponential backoff with jitter. Without it, every client reconnects simultaneously on server restart. |
| WebSocket messages with no acknowledgment pattern | If delivery matters, implement ack: `{ id, type: 'ack_required', data }` → `{ id, type: 'ack' }`. Retry unacknowledged messages. |
| Using WebSocket for a one-way notification feed | SSE auto-reconnects, works through proxies, and is simpler. Use SSE unless you need client → server messages. |

## Red Flags
- Reconnection logic that doesn't include jitter — server restart = 1000 clients reconnecting at the exact same millisecond
- WebSocket server with no pub/sub backend and 2+ instances — messages sent to instance A don't reach clients on instance B
- Connection count growing monotonically (no disconnection cleanup) — ghost connections leak memory and file descriptors

**The real-time problem isn't the protocol — it's what happens when the connection drops. Nail the reconnection strategy and the pub/sub topology before picking WebSocket vs SSE.**
