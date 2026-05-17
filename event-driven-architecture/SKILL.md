---
name: event-driven-architecture
description: Use when designing event-driven systems, choosing between message brokers (Kafka/Redis/NATS/RabbitMQ), implementing event sourcing or CQRS, or debugging out-of-order event delivery and dead-letter queues
---

# Event-Driven Architecture

## Overview
Events decouple services, but they also decouple you from knowing what's happening right now. A synchronous call stack shows you the error at line 47. An event-driven system shows you a DLQ message that arrived 40 minutes late and references an order that was deleted 39 minutes ago. Building event systems means designing for ordering guarantees, delivery semantics, and the fact that your consumers will receive events in orders you didn't predict.

## When to Use
- Breaking a monolith into services that need async communication
- Choosing between Kafka, Redis Streams, NATS, and RabbitMQ for a new system
- Order events arriving before customer events, causing null-reference cascades
- Implementing event sourcing for audit-trail or temporal-query requirements
- Dead-letter queue is growing and nobody knows why

**Don't use when:** two services need a simple request-response — HTTP/gRPC is simpler. Don't event-source a system with 3 events total. Don't use messaging for synchronous UI updates — WebSocket/SSE is for real-time.

## Core Workflow

**Step 1: Define events by business fact, not by technical action.** Events are past-tense facts: `OrderPlaced`, `PaymentCaptured`, `ShipmentDelayed`. Not imperatives: `CreateOrder`, `UpdateInventory`, `SendEmail`. Imperatives tell consumers what to do — facts tell them what happened and let them decide. Facts compose; commands conflict. **GOOD:** `{ type: "PaymentCaptured", order_id: "abc", amount_cents: 2990 }`. **BAD:** `{ type: "ProcessOrder", action: "charge", gateway: "stripe" }`.

**Step 2: Choose the broker by ordering and retention needs, not popularity.** Kafka: ordered, partitioned, durable — for event sourcing, stream processing, replay. Redis Streams: fast, simple, ephemeral or persistent — for real-time pub/sub with consumer groups. RabbitMQ: flexible routing, mature — for complex topologies with many exchange types. NATS: minimal, high-throughput — for cloud-native microservices that need simple pub/sub. Key question: "Do I need to replay events from 3 days ago?" Yes → Kafka or persisted Redis Streams. No → anything works.

**Step 3: Design consumers for at-least-once delivery and out-of-order arrival.** Assume every event arrives at least once — make handlers idempotent (`event_id` dedup). Assume events arrive out of order — a `PaymentSucceeded` event may arrive before the `OrderCreated` event it references. Handle missing parents: check if the referenced entity exists; if not, park the event for retry (not DLQ — it's not a poison message, just an early one). Add sequence numbers to events within the same aggregate to detect gaps.

## Quick Reference

| Need | Broker | Why |
|------|--------|-----|
| Event replay + streaming | Kafka | Append-only log, replay from any offset |
| Real-time pub/sub, simple | Redis Pub/Sub or Streams | Minimal setup, fast in-memory delivery |
| Complex routing (topic → queue) | RabbitMQ | Exchanges, bindings, dead-letter exchanges built-in |
| Cloud-native, minimal ops | NATS | 20MB binary, no ZooKeeper, auto-discovery |
| Exactly-once semantics | Kafka (transactions) or don't bother — use idempotent consumers instead | True exactly-once is rare; design for at-least-once + idempotency |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Every service has its own event schema | Shared schema registry (Avro/Protobuf); evolve with backward-compatible rules |
| Consumers that assume event order | Dedup by event_id, handle missing parents with retry, not crash |
| Events that carry too little data (IDs only) | Include enough context for consumers to act without calling back — but not PII |
| Events that carry too much (entire DB row) | Include entity ID + changed fields + timestamp; consumer queries for full state if needed |
| No event versioning | Add `version` and `schema_url` fields to every event from day one |

## GOOD/BAD Patterns

**GOOD:**
```typescript
// Events are past-tense facts with version, trace, and idempotency support
interface OrderPlaced {
  type: "OrderPlaced";
  version: 1;
  event_id: string;          // UUID — unique per event instance
  aggregate_id: string;      // order ID — events for same entity share this
  sequence: number;          // monotonically increasing per aggregate
  timestamp: string;
  data: {
    customer_id: string;
    items: { sku: string; quantity: number; price_cents: number }[];
    total_cents: number;
  };
}
```

**BAD:**
```typescript
// Imperative, unversioned, no dedup info — consumers can't handle retries or evolution
interface ProcessOrder {
  command: "create";
  order: any;  // what changed? what's the aggregate? what version?
}
```

---

**GOOD:**
```python
# Idempotent consumer with parent-entity check
def handle_payment_captured(event: dict):
    if EventLog.exists(event["event_id"]):
        return  # already processed — idempotent
    order = Order.find(event["aggregate_id"])
    if not order:
        # OrderCreated hasn't arrived yet — park and retry
        Scheduler.retry_later(event, delay_seconds=30)
        return
    order.apply_payment(event)
    EventLog.mark_processed(event["event_id"])
```

**BAD:**
```python
# No dedup, no missing-parent handling — crashes on retry and out-of-order
def handle_payment_captured(event: dict):
    order = Order.find(event["order_id"])
    order.status = "paid"  # What if Order doesn't exist yet? NullReferenceException
    order.save()  # What if this is a redelivery? Double-applies payment
```

### Anti-Patterns — Event System Failures
- Fire-and-forget with no dead-letter queue — events that fail are silently dropped; build a DLQ from day one, even if it's just a database table
- Every consumer uses its own schema for the same event — one event, one schema, one source of truth; evolve it with the registry
- Events that cross service boundaries with database transaction IDs — exposes internal implementation; use business identifiers (order number, not DB row ID)
- Single consumer handling 15 event types with `if/elif/elif/elif` — use a router/dispatcher pattern; each handler is one function, one event type
- Events published but never consumed (or consumed by a service that got deleted) — track event lineage; know which services consume which events

## Red Flags
- Events in the DLQ that process successfully on retry — your consumers have race conditions or missing-parent issues, not poison events
- "We don't need a schema registry yet" — when you need it, every consumer has already hardcoded a slightly different event format
- Consumer codebase has comments like "// sometimes this field is null, sometimes it's an object" — schema drift across producers; fix the schema, not the comment
- Three services publishing the same event type with different field names — shared schema registry, now

**Events are the API between services that don't call each other. Version them, validate them, and never trust that events arrive in the order you expect.**


---
