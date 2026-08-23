# WPI 7.64.3 — Mega-Event Load Test & Capacity Gate

WPI 7.64.3 turns the 7.64.2 scale architecture into a measurable release gate. It adds a production-safe capacity evidence ledger, explicit WPI PASS/WATCH/FAIL thresholds, a Platform Owner capacity-gate view, a read-only production smoke harness, and an isolated/staging load-test harness that exercises bounded public RPCs plus public Realtime Broadcast subscriptions.

Full mega-event mode is hard-blocked against the current WPI production Supabase host and requires an explicit staging confirmation. A staging-only 6,000-game fixture and cleanup script are included but are not migrations and must never be run against production. The capacity gate cannot PASS from a smoke probe or incomplete evidence: it requires the 6,000-game / 100+ active-game / 10,000-viewer envelope plus public-read, Realtime, score-integrity, finalization, ad-impact and database-resource measurements.

Supabase migration required: `202608220003_mega_event_capacity_gate.sql`. No Edge Function redeploy, secret, Stripe activation, hosting migration, or infrastructure-tier purchase is required.
