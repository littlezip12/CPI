# WPI 7.64.3 — Mega-Event Load Test & Capacity Gate

## Supabase
Run `supabase/migrations/202608220003_mega_event_capacity_gate.sql`.

The migration stores sanitized load-test evidence and evaluates the gate. It does not generate test games or traffic.

## Validation
Run `./release-check-live-7.64.3`, then `./release-check-clean`.

## Production smoke
The load harness defaults to a tightly capped, read-only smoke test and refuses full load mode against the current WPI production Supabase host. See `WPI_7.64.3_MEGA_EVENT_LOAD_TEST_RUNBOOK.md`.

## Full mega-event test
Use an isolated/staging Supabase project. The optional fixture is `supabase/load-test/7.64.3_seed_mega_event_fixture.sql`; cleanup is `supabase/load-test/7.64.3_cleanup_mega_event_fixture.sql`. Neither file is part of the migration sequence.

No Edge Function, new secret, Stripe, production hosting, or infrastructure-tier action is required by this release.
