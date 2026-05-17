---
name: cloud-right-sizing
description: Use when optimizing cloud resource allocation, reducing idle compute spend, or when choosing instance types and auto-scaling thresholds for production workloads
---

# Cloud Right-Sizing

## Overview
The cloud's default is overprovisioning. Every team adds a buffer "just in case," and those buffers compound across environments, regions, and accounts. Right-sizing is continuous — not a one-time audit — because traffic patterns, instance types, and pricing all shift.

## When to Use
- Monthly cloud bill is 30%+ higher than expected
- Average CPU utilization across production instances is below 30%
- Choosing instance types for a new service or migrating from static instances to auto-scaling
- Reserved Instance or Savings Plan renewal is approaching

**Don't use when:** the workload is spiky and stateless — auto-scaling matters more than instance sizing. Don't optimize a $200/month bill for $50 of savings.

## Core Workflow

### Step 1: Measure Actual Utilization, Not Provisioned Capacity
Collect 30 days of data at 5-minute intervals. Track: CPU (target 50-70%), memory (target 60-80%), network throughput, disk IOPS. Tools: AWS Compute Optimizer, GCP Recommender, Azure Advisor. Spot patterns: dev/staging instances run at 5% utilization every night and weekend — schedule shutdown.

### Step 2: Match Workload to Pricing Model
Steady-state, predictable workloads → Reserved Instances (1-year, convertible) or Savings Plans (more flexible, same discount). Spiky, unpredictable → On-Demand or Spot. Batch, fault-tolerant → Spot/Preemptible with fallback. Multi-region HA → RI in baseline region, Spot in secondary. Never run 24/7 steady workloads purely on On-Demand — that's paying 40% extra indefinitely.

### Step 3: Implement Auto-Scaling With Realistic Bounds
Scale-out threshold: CPU > 65% for 3+ minutes (avoids flapping on transient spikes). Scale-in: CPU < 40% for 10+ minutes (prevents thrashing). Min instances: handle base load + one AZ failure. Max instances: budget limit, not infinity. Use predictive scaling if your traffic has a daily sinusoidal pattern — it scales before the spike, not during it.

## Quick Reference

| Pattern | Action |
|---------|--------|
| < 30% CPU for 30 days | Downsize by one instance tier or reduce count |
| Dev/staging unused at night | Lambda/script to stop non-prod instances 8pm-8am |
| Steady DB workload | Reserved Instance, 1-year, Standard (not Convertible) |
| Stateless web tier | Spot instances + On-Demand baseline; 60-70% cost reduction |
| Memory-bound, CPU-idle | Use memory-optimized family (R series, not general-purpose) |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using last month's peak as next month's baseline | Use P95 over 30 days, not P100 — peaks are anomalies |
| Reserved Instance for a service being decommissioned | Check lifecycle before committing to 1-year terms |
| Instance family migration without benchmarking | Different CPU architectures change single-thread performance; test first |
| Ignoring data transfer costs | Cross-AZ traffic can exceed compute cost; co-locate chatty services |

## Red Flags
- Production instances that have run at < 20% CPU for 7+ days — they're at least one size too large
- Reserved Instance coverage below 60% on steady-state workloads — you're paying On-Demand premium
- Auto-scaling group with min=max — no scaling happening; either overprovisioned or at risk

**The most expensive cloud resource is the one you're paying for but not using. Measure first, resize second, automate third.**
