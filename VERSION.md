# WPI 7.64.2 — Scale & Mega-Event Readiness

WPI 7.64.2 hardens the public WPI Live read path for larger events without buying a higher infrastructure tier. Public Live Center and Tournament Center game retrieval now use server-side filtering plus bounded pages of at most 100 games, eliminating the prior single-browser 250/2,000-row caps as the scaling model.

Public score delivery now uses sanitized Supabase Realtime Broadcast as the primary update path. The database trigger sends only public score/state fields to a per-game public topic; the browser keeps a safety RPC fallback and immediately falls back if Realtime is unavailable. Anonymous privacy remains score/team-level only.

A Platform Owner Scale Readiness page reports the current observed WPI footprint, verifies the pagination/index/Broadcast foundation, and can run lightweight endpoint-latency probes. It explicitly does not certify the 6,000-game / 10,000-viewer target: a controlled mega-event load test is still required before JO-scale traffic.

Supabase migration required: `202608220002_scale_mega_event_readiness.sql`. No Edge Function redeploy, new secret, Stripe activation, hosting migration, or infrastructure upgrade is required.
