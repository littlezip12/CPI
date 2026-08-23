# WPI 7.64.2 — Scale & Mega-Event Readiness

## Supabase
Run `supabase/migrations/202608220002_scale_mega_event_readiness.sql`.

## Validation
Run `./release-check-live-7.64.2`, then `./release-check-clean`.

## Live validation
1. Open WPI Live; change search/type/group/status and confirm results reload from bounded server pages.
2. Use Load more and confirm additional games append without duplicating the first page.
3. Open a large Tournament Center; filters should reload from the server and Load more should page beyond the first 60 games.
4. Open a public live score. It should report `live push · safety refresh 60s` after the Realtime channel subscribes. If Realtime cannot subscribe, it should fall back to a 12-second RPC refresh.
5. As Platform Owner, open `live-scale-readiness.html`, refresh the snapshot and run the 5-call probe.
6. Create/start a new scorer game and confirm the protected 7.64.0 launch-stability path remains normal.

No Edge Function, secret, Stripe, notification, hosting, or infrastructure-tier action is required.
