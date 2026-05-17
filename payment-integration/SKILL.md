---
name: payment-integration
description: Use when integrating Stripe/Paddle/LemonSqueezy subscriptions, designing billing systems, implementing payment webhooks, or building checkout flows that need idempotent order processing
---

# Payment Integration

## Overview
Payment integration is state-machine engineering with money at the edges. The hard parts aren't the checkout UI — they're idempotent order creation, webhook signature verification, subscription state reconciliation, and graceful degradation when the payment provider is down. Get these right and payments are boring. Get them wrong and you double-charge customers or lose revenue silently.

## When to Use
- Adding subscription billing to an existing product
- Webhook handler returns 200 but orders aren't created
- Customers report double charges or subscriptions stuck in "pending"
- Migrating between payment providers (Stripe → Paddle, etc.)
- Auditing existing payment code for correctness

**Don't use when:** building a payment processor or gateway yourself — use Stripe/Paddle/Adyen; they've solved PCI compliance. Don't use for crypto/blockchain payments — different domain entirely.

## Core Workflow

**Step 1: Design the order state machine first.** States: `pending` (payment initiated), `processing` (webhook received, fulfillment started), `completed` (fulfilled), `failed` (payment rejected/error), `refunded` (refund processed). Transitions: `pending → processing → completed` (happy path), `pending → failed` (payment rejected), `processing → failed` (fulfillment error), `completed → refunded` (refund). Every transition must be atomic and logged. Never delete orders — only transition states.

**Step 2: Make every charge idempotent at the API boundary.** Stripe's `Idempotency-Key` header prevents duplicate charges at the provider level. But you ALSO need application-level idempotency for the provider → your-server direction. Store `provider_transaction_id` on every order. Before creating a new order, check if the transaction already has one. **GOOD:** `SELECT * FROM orders WHERE provider_txn_id = $1` before insert. **BAD:** Insert first, then check — race condition window for duplicate orders.

**Step 3: Verify webhooks cryptographically.** Never trust `req.body.event_type` without signature verification. Stripe: `stripe.webhooks.constructEvent(body, signature, webhook_secret)`. Paddle: verify the `p_signature` parameter against your public key. Always respond 200 immediately after verification — the provider will retry otherwise. Process the webhook asynchronously (queue it). Store raw webhook body for debugging: you'll need it when reconciliation fails.

## Quick Reference

| Provider | Idempotency Mechanism | Webhook Verification |
|----------|----------------------|---------------------|
| Stripe | `Idempotency-Key` header (per-request) | Signed payload with webhook secret |
| Paddle (Classic) | `passthrough` field for custom dedup key | `p_signature` param verified against public key |
| Paddle (Billing) | `Idempotency-Key` header | Webhook signature header |
| LemonSqueezy | `Idempotency-Key` header | `X-Signature` header with HMAC-SHA256 |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Webhook handler does heavy work before returning 200 | Acknowledge immediately; enqueue processing; provider retries time out fast |
| No retry handling on failed fulfillment | Queue with exponential backoff; DLQ for manual review after 3 failures |
| Subscription status sourced from your DB, not the provider | Provider is the source of truth; your DB is a cache — reconcile on every webhook |
| Checking `order.status` instead of `provider_txn_id` for dedup | Race condition: two webhooks can both see `status=pending` before either updates it |

## GOOD/BAD Patterns

**GOOD:**
```python
# Idempotent order creation — check by provider transaction ID
@app.post("/webhooks/stripe")
def stripe_webhook(request: Request):
    payload = request.body()
    sig_header = request.headers.get("Stripe-Signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        return Response(status_code=400)

    # Respond immediately
    background_queue.enqueue(process_stripe_event, event)

    return Response(status_code=200)

def process_stripe_event(event):
    if event.type == "checkout.session.completed":
        session = event.data.object
        # Idempotency: check provider transaction ID FIRST
        existing = Order.find_by_provider_txn(session.id)
        if existing:
            return  # already processed — no-op
        order = create_order_from_session(session)
        fulfill(order)
```

**BAD:**
```python
# No signature verification, no idempotency, blocks webhook response
@app.post("/webhooks/stripe")
def stripe_webhook(request: Request):
    data = request.json()
    # NO SIGNATURE CHECK — anyone can post to this endpoint
    if data["type"] == "checkout.session.completed":
        order = create_order(data)  # No dedup — creates duplicate on retry
        send_email(order)  # Slow I/O during webhook — provider times out
        return Response(status_code=200)
```

---

**GOOD:**
```python
# Subscription state machine — atomic transitions, logged
class SubscriptionState(Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    EXPIRED = "expired"

VALID_TRANSITIONS = {
    SubscriptionState.ACTIVE: [SubscriptionState.PAST_DUE, SubscriptionState.CANCELED],
    SubscriptionState.PAST_DUE: [SubscriptionState.ACTIVE, SubscriptionState.EXPIRED],
    SubscriptionState.CANCELED: [],  # terminal
}

def transition(subscription, to_state):
    if to_state not in VALID_TRANSITIONS[subscription.state]:
        raise InvalidTransition(f"{subscription.state} → {to_state}")
    audit_log(f"sub_{subscription.id}_state_change", subscription.state, to_state)
    subscription.state = to_state
    subscription.save()
```

**BAD:**
```python
# No state machine — any transition is possible, no audit trail
def handle_webhook(event):
    if "cancel" in event.type:
        subscription.status = "canceled"  # from active? past_due? what about refunds?
        subscription.save()
        # No audit log, no transition validation, no side-effect handling
```

### Anti-Patterns — Payment Systems That Fail
- `order.status = "paid"` set from client-side callback without server-side verification — clients lie; always verify with the provider's API or webhook
- Webhook handler with `await sendEmail()` before returning 200 — email delivery takes 2+ seconds; the provider already retried and created a duplicate order
- Storing raw card data anywhere: logs, error messages, support tickets — PCI scope expands to your entire stack; never let card PAN touch your servers
- `total_cents = price * 100` with floating-point — `2.99 * 100 = 298.99999999999994` in IEEE 754; always use integer cents from the start, never convert from float
- Subscription cron job that iterates ALL subscriptions to check expiry — O(n) per minute on a growing table; use indexed `expires_at` with `WHERE expires_at BETWEEN now() AND now() + interval`

## Red Flags
- "We'll add idempotency later" — every payment endpoint without idempotency WILL produce duplicates under network retries
- Raw payment provider response in error logs — tokens and PII leak into logging systems
- Subscription status stored in your DB but never reconciled against the provider — drift is inevitable
- `float` anywhere in a billing calculation — integer cents only; floating-point + money = rounding errors

**Payment code correctness is measured in dollars. Every idempotency gap, unverified webhook, and floating-point price is a future support ticket with a dollar amount attached.**


---
