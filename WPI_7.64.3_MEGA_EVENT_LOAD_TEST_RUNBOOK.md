# WPI 7.64.3 — Mega-Event Load Test & Capacity Gate Runbook

## Purpose

Prove WPI's real capacity with measured evidence before a JO-scale event. The architecture target remains:

- 6,000 games in a mega-event dataset
- 100+ simultaneously active games
- 10,000 simultaneous public Live viewers
- bounded public scoreboard/tournament reads
- sanitized Realtime Broadcast score delivery with RPC fallback

A PASS is a WPI operational release decision, not a Supabase vendor guarantee.

## Safety boundary

The harness knows the current WPI production Supabase host and **refuses `mega_event` mode against it**. Production is limited to a small read-only smoke test. Full testing requires `WPI_LOADTEST_ISOLATED_CONFIRM=YES_I_AM_USING_STAGING` and a different Supabase project host.

Never put a service/secret key in the repository, a browser page, a report JSON, or Git history. The 7.64.3 harness uses only the browser-safe publishable key for its public read/Broadcast workload.

## A. Safe production smoke

Set the existing production project URL and publishable key only in your Terminal session, then run:

```bash
export WPI_LOADTEST_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export WPI_LOADTEST_PUBLISHABLE_KEY="YOUR_PUBLISHABLE_KEY"
node scripts/wpi-mega-event-load-test-v7-64-3.mjs --mode smoke --duration 30 --concurrency 10 --realtime-viewers 5 --output capacity-results/production-smoke.json
```

Production smoke is capped at 60 seconds, 25 HTTP workers, 25 Realtime sockets and 2,500 requests. It always remains **Not certified**.

## B. Prepare isolated/staging data

1. Create/use a separate staging Supabase project.
2. Apply the WPI migration stack through `202608220003_mega_event_capacity_gate.sql`.
3. Create or retain one normal active WPI Live test team in staging.
4. Open `supabase/load-test/7.64.3_seed_mega_event_fixture.sql`.
5. Set the `target_team_id` to the staging team's UUID.
6. Run it only in staging.

The fixture creates exactly 6,000 public tournament games with 120 live, 2,940 upcoming and 2,940 final rows. It is deliberately separate from migrations.

## C. Run isolated load shards

Use a different Supabase host from production:

```bash
export WPI_LOADTEST_SUPABASE_URL="https://YOUR_STAGING_PROJECT.supabase.co"
export WPI_LOADTEST_PUBLISHABLE_KEY="YOUR_STAGING_PUBLISHABLE_KEY"
export WPI_LOADTEST_ISOLATED_CONFIRM="YES_I_AM_USING_STAGING"
node scripts/wpi-mega-event-load-test-v7-64-3.mjs --mode mega_event --duration 120 --concurrency 100 --realtime-viewers 500 --event-games 6000 --active-games 120 --simultaneous-viewers 10000 --shard-id shard-1 --output capacity-results/shard-1.json
```

The local harness caps one process at 1,000 Realtime sockets. Use multiple machines/processes/shards to reach 10,000 actual viewer sessions, then aggregate all shard JSON files. Do not claim the target from a modeled number alone.

Score Broadcast latency can only be measured when score updates occur while subscribers are connected. The capacity gate intentionally treats missing Realtime message evidence as **Not certified**.

## D. Capture non-public infrastructure/workflow evidence

Fill a copy of `scripts/WPI_7.64.3_CAPACITY_EVIDENCE_TEMPLATE.json` with measurements from the controlled test:

- Realtime drop rate
- score integrity across at least 100 games
- at least 100-game Final burst p95/error rate using the real Final workflow
- ad telemetry p95 impact on the scoring path
- Supabase database CPU p95
- peak database connections as a percentage of the available pool
- optional DB I/O wait p95

Do not put keys, tokens, emails or other credentials in this evidence file.

## E. Aggregate and evaluate

```bash
python3 scripts/wpi-capacity-gate-v7-64-3.py \
  --input capacity-results/shard-1.json \
  --input capacity-results/shard-2.json \
  --evidence capacity-results/manual-evidence.json \
  --target-host YOUR_STAGING_PROJECT.supabase.co \
  --target-environment staging \
  --mode mega_event \
  --event-games 6000 \
  --active-games 120 \
  --simultaneous-viewers 10000 \
  --confirmed-isolated-target \
  --output-dir capacity-results/final
```

The aggregator creates a JSON report and Markdown report. If required evidence is missing, the result remains **Not certified** rather than guessing.

## F. Record the report in WPI

As Platform Owner, open `live-scale-readiness.html`, choose the final JSON report under **Import capacity-gate report**, and record it. Supabase recalculates the gate server-side.

## WPI 7.64.3 operational thresholds

PASS requires all required evidence and:

- Public read p95 ≤ 750 ms; p99 ≤ 1,500 ms; errors ≤ 0.5%
- Realtime score delivery p95 ≤ 1,000 ms; drops ≤ 0.5%
- Score integrity = 100%
- 100-game Final burst p95 ≤ 1,500 ms; errors ≤ 0.5%
- Ad telemetry p95 impact ≤ 10%
- DB CPU p95 ≤ 70%
- Peak DB connections ≤ 70% of available pool

WATCH extends those limits to 1,500/2,500 ms public read, 2% error/drop, 2,500 ms Realtime, 3,000 ms Final burst, 25% ad impact and 85% DB CPU/connections. Anything beyond WATCH is FAIL. Any confirmed score-integrity loss is FAIL.

## Cleanup

After the staging test, run `supabase/load-test/7.64.3_cleanup_mega_event_fixture.sql` against staging. It deletes only rows whose `client_game_id` begins `wpi-loadtest-7643-`.
