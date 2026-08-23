# WPI 7.64.3 — Mega-Event Load Test & Capacity Gate Handoff

Built from authoritative pushed WPI 7.64.2 baseline `CPI-main - 2026-08-22T211712.044.zip`.

## Scope

- production-safe capacity test ledger and server-side gate evaluation
- explicit PASS/WATCH/FAIL thresholds
- Platform Owner capacity-gate status/history import on `live-scale-readiness.html`
- Node 22 no-dependency public RPC + raw Supabase Realtime Broadcast load harness
- production hard guard: full load modes refuse `jmdamtxspyshjxgmunda.supabase.co`
- staging-only 6,000-game fixture + cleanup scripts, not migrations
- shard aggregator + Markdown/JSON report generator
- no automatic claim of 10K certification

## PASS evidence required

- >= 6,000 event games
- >= 100 active games
- >= 10,000 actual Realtime viewer sessions aggregated across shards
- >= 10,000 public-read samples
- >= 10,000 score Broadcast message samples
- score integrity = 100% across >= 100 games
- >= 100-game real Final workflow burst evidence
- ad telemetry impact measurement
- DB CPU and connection measurements

Missing evidence => Not certified. Score-integrity loss => FAIL.

## Supabase

Migration: `202608220003_mega_event_capacity_gate.sql`.

No Edge Function, new secret, Stripe, hosting migration or infrastructure upgrade.

## Protected files

7.64.3 must preserve the authoritative 7.64.2 protected scoring/backend hashes. No protected runtime file is intentionally changed by this release.
