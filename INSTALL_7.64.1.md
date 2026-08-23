# WPI 7.64.1 — Tournament Experience

## Scope

- Adds `live-tournament.html`, a public team-level WPI Live tournament destination.
- Shows Live, Upcoming and Final public WPI Live games with team/division/status search and filtering.
- Shows WPI-team tournament records derived only from finalized public WPI Live games.
- Explicitly does **not** represent those records as official standings and does not fabricate missing brackets/schedules.
- Adds tournament discovery to `live.html`.
- Adds tournament navigation from public game cards, public score pages and authenticated Supporter Game Info.
- Reuses the youth-safe WPI event sponsor delivery system.
- Preserves the 7.64.0 `launch=1` scorer/new-game bypass and protected scoring foundation.

## Supabase

Run:

`supabase/migrations/202608220001_public_tournament_experience.sql`

This adds public read-only tournament RPCs plus additive v2 public scoreboard/game-score RPCs carrying tournament identity.

No Edge Function redeploy, new secret, Stripe activation, push-notification permission or infrastructure upgrade is required.

## Validation

Run:

`./release-check-live-7.64.1`

Then:

`./release-check-clean`

## Live validation

1. Open WPI Live and confirm **Tournament centers** appears above the public scoreboard.
2. Open a tournament center and confirm Live / Upcoming / Finals sections are built only from public WPI Live games.
3. Confirm team, division, search and status filters work.
4. Confirm WPI-team records are labeled as informational and not official standings.
5. Open a tournament game from the center and confirm the public score page loads.
6. Confirm the public score page has **Tournament center** navigation.
7. Open the same game as an authenticated Supporter and confirm Game Info links to the tournament center.
8. Create/start a new game through the scorer flow and confirm the 7.64.0 `launch=1` stability fix remains intact.
