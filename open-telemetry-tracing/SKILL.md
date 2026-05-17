---
name: open-telemetry-tracing
description: Use when setting up distributed tracing in microservices, choosing sampling strategies for production, or instrumenting HTTP/gRPC calls with OpenTelemetry SDKs
---

# OpenTelemetry Tracing

## Overview
OpenTelemetry is the universal observability wire format. It doesn't store or visualize data — it standardizes how you emit it. The decision that matters: sampling strategy. Get it wrong and you either drown in trace data costs or miss the 1-in-1000 error that's killing production.

## When to Use
- Microservices where a single user request spans 3+ services
- Migrating from a vendor agent (Datadog, New Relic) to vendor-neutral instrumentation
- Debugging latency — you can see which service adds the 800ms delay
- Standardizing observability across polyglot teams (Go, Node, Python, Java)

**Don't use when:** you have a monolith and a single database — logs + metrics are simpler and sufficient. Don't use OTel if no one on the team has committed to owning the collector infrastructure.

## Core Workflow

**Step 1: Deploy the OTel Collector as a sidecar or DaemonSet before instrumenting code.** The collector receives spans via OTLP, batches them, and exports to backends (Jaeger, Tempo, Honeycomb, Datadog). Run it as a sidecar for critical services (lower latency, independent config), as a DaemonSet for everything else (shared resource, simpler ops). Key collector config: `batch` processor with `timeout: 200ms` and `send_batch_size: 512` — don't emit every span individually. Add `memory_limiter` to bound collector memory during traffic spikes.

**Step 2: Pick sampling strategy before the first span.** Head-based sampling (decide at span creation): `always_on` for dev, `probabilistic: 0.1` (10%) for high-throughput production, `parentbased_always_on` to keep entire traces. Tail-based sampling (decide at the collector after the trace completes): catches errors and slow traces that probabilistic would miss. Use `tail_sampling` processor with policies: `latency > 500ms OR status_code == ERROR`. Combine: probabilistic 10% at the SDK + tail sampling for anomalies at the collector.

**Step 3: Instrument the three layers.** Auto-instrumentation: use language agents (`@opentelemetry/instrumentation-http`, `opentelemetry-instrumentation-flask`) — covers 80% of spans. Manual instrumentation: add custom spans for business logic (checkout, payment processing) with meaningful names and attributes. Propagation: ensure `traceparent` W3C header propagates through async queues, message brokers, and serverless invocations — broken propagation is the #1 cause of fragmented traces.

## Quick Reference

| Scenario | Action |
|----------|--------|
| Trace shows gaps between services | W3C `traceparent` header not propagated. Check middleware in each service. |
| Collector OOM during traffic spike | Add `memory_limiter` processor with `limit_mib: 512` and `spike_limit_mib: 256`. Add `queued_retry` for backpressure. |
| 10M spans/hour, $5K monitoring bill | Reduce head sampling to 5%, add tail sampling at collector for error/latency traces only. |
| Spans missing in async/background job | Inject context manually: `context.with(trace.setSpan(context.active(), span), () => { doWork(); })` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `always_on` sampling in production with 1M requests/day | Bill shock. Use `parentbased_traceidratio` at 10-25%. Tail-sample anomalies at the collector. |
| Every team picks their own backend | OTel decouples instrumentation from storage. Standardize on one backend or at least one wire format. |
| Adding custom attributes like `user.email` to every span | PII in traces is a data leak. Hash identifiers. Redact with `redaction` processor in the collector pipeline. |

## Red Flags
- "We'll add tracing later when we grow" — adding tracing retroactively means instrumenting 50+ services at once, which will never be prioritized
- Sampling configured at 100% with no budget conversation — the monitoring bill will force a panic-driven sampling change
- Traces show services but no DB calls — auto-instrumentation isn't covering the database layer

**OpenTelemetry is a standard, not a product. The collector, sampling strategy, and context propagation are the three decisions that determine whether tracing delivers value or just a bill.**
