---
name: microservice-boundary-design
description: Use when defining service boundaries in a monolith decomposition, evaluating whether a new feature should be a separate service, or when fixing cross-service data coupling
---

# Microservice Boundary Design

## Overview
The hardest problem in microservices isn't building them — it's drawing the lines. Wrong boundaries create distributed monoliths: services that look independent but share databases, require lockstep deployments, and fail together. Right boundaries follow domain events, not database tables.

## When to Use
- Planning to extract a service from a monolith
- Two services share a database, and writes from both corrupt each other's invariants
- A "simple" feature requires changes across 4+ services
- Deciding whether a new capability should be a new service or a module in an existing one

**Don't use when:** you have 3 developers and no scale problems. Start with a modular monolith; extract services only when team autonomy or independent scaling demands it.

## Core Workflow

### Step 1: Find Bounded Contexts, Not Entities
Map the domain using Event Storming: commands (user actions), events (things that happened), aggregates (consistency boundaries). A bounded context is where a term means one thing: "Order" in Checkout ≠ "Order" in Fulfillment. Each context owns its data exclusively — no other service reads or writes that database directly.

### Step 2: Design the Contract Between Services
Synchronous: REST/gRPC for commands that need immediate confirmation. Asynchronous: events over a message broker for "this happened" notifications. Never chain synchronous calls across services (A→B→C→D) — one slowdown cascades. Sender owns the event schema; consumers adapt. Version events with new optional fields, never remove existing ones.

### Step 3: Implement the Strangler Fig Pattern
For extraction: route traffic to the new service incrementally. Start with reads (query the new service, fall back to monolith). Then writes (dual-write to both, verify consistency). Finally, cut over reads and decommission the monolith code. Never do a big-bang cutover — the monolith has edge cases you haven't discovered yet.

## Quick Reference

| Symptom | Diagnosis |
|---------|-----------|
| Two services share a DB table | Wrong boundary — one must own it, the other calls its API |
| Every deploy touches 3+ services | Services are too fine-grained; merge or define a deployment unit |
| Event carries 50 fields, consumer uses 3 | Event is too fat; slim it or split into topic-per-concern |
| Sync call chain A→B→C→D | Add async events or a BFF (Backend For Frontend) that aggregates |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Splitting by entity, not behavior | "User Service" owns everything user-related — that's a monolith with HTTP |
| Shared database as integration pattern | Each service owns its data; other services call its API |
| Entity IDs as integration contracts | Use natural keys or opaque IDs; entity IDs couple consumers to internal schema |
| No dead letter queue for events | Undeliverable events must land somewhere for human inspection |

## GOOD/BAD Patterns

**GOOD:**
```python
# Service owns its data — other services call its API
class OrderService:
    def create_order(self, items: list[Item]) -> Order:
        # owns the orders DB exclusively
        return self.repo.save(Order(items=items))

class BillingService:
    def bill_for_order(self, user_id: str, order: OrderDTO) -> Invoice:
        # calls OrderService API, does NOT touch orders DB
        return self.invoice_repo.save(Invoice(user_id, order.total))
```

**BAD:**
```python
# Shared database — both services read/write the same table
class OrderService:
    def create_order(self, items):
        db.execute("INSERT INTO orders ...")  # OrderService writes orders

class BillingService:
    def bill_for_order(self, user_id, order_id):
        db.execute("UPDATE orders SET billed=true ...")  # BillingService also writes orders
```

---

**GOOD:**
```python
# Async event for cross-service notification
class OrderService:
    def confirm(self, order_id: str):
        self.repo.save(Order(id=order_id, status="confirmed"))
        self.event_bus.publish("order.confirmed", OrderConfirmedEvent(order_id=order_id))

# ShippingService subscribes — decoupled, independent deploy
class ShippingService:
    @event_handler("order.confirmed")
    def on_order_confirmed(self, event: OrderConfirmedEvent):
        self.create_shipment(event.order_id)
```

**BAD:**
```python
# Sync chain A -> B -> C -> D — one slowdown cascades
class OrderService:
    def confirm(self, order_id: str):
        self.repo.save(...)
        self.billing.charge(order_id)         # calls BillingService
        self.shipping.create(order_id)        # calls ShippingService
        self.notification.send(order_id)      # calls NotificationService
```

---

**GOOD:**
```python
@dataclass
class OrderConfirmedEvent:
    event_id: str       # opaque event ID
    order_id: str       # opaque order ID
    total_amount_cents: int
    occurred_at: datetime
```

**BAD:**
```python
@dataclass
class OrderConfirmedEvent:
    user_id: int        # coupled to Users table PK
    order_id: int       # coupled to Orders table auto-increment PK
    # entity-level IDs leak internal schema to consumers
```

### Anti-Patterns — Reject on Sight

- "User Service" owning everything related to users (auth, profile, settings, notifications, billing) — that's a monolith exposed over HTTP, not a bounded context
- Shared database table between two services — "just one more shared table" is how distributed monoliths are born
- Service with exactly 2 endpoints — too small; it's a function, not a service; merge it into a related context
- Synchronous call chain that spans 3+ services (A calls B calls C) — one slowdown cascades; use async events or a BFF
- Event schema that only adds fields and never removes or deprecates old ones — events are contracts; version them with backward-compatible additions only
- Dead letter queue that nobody monitors — undeliverable events pile up silently; set up alerts on DLQ depth

## Red Flags
- Feature that touches 5 services and takes 3 sprints — boundaries are wrong
- "Just one more shared table" — every shared table is future coordination overhead
- Service with 2 endpoints — too small; it's a function, not a service

**Services that always deploy together are not separate services. Merge them or fix the boundaries.**
