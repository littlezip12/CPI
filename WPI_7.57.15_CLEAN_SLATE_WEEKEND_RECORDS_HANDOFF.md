# WPI 7.57.15 — Clean Slate & Tournament Weekend Records Handoff

Baseline: pushed WPI 7.57.14 repository `CPI-main - 2026-08-09T191314.758.zip`.

## Product decisions implemented
- Intentionally clear every prior WPI Live test/game record and begin the pilot record book empty.
- Preserve team profile, roster, memberships, roles, GroupMe setup, and other reusable team configuration.
- Replace the flat `Permanent records / Game history` dashboard concept with **Season archive → Tournaments & weekends**.
- Every Tournament game is attached to a durable tournament record container.
- Every Friendly requires a named **Scrimmage Weekend** so multiple games from the same weekend stay together.
- Reusing the same Scrimmage Weekend name reuses the same record container.
- Manual tournament fallback remains reconciliation-safe: later official tournament matching enriches the same canonical game row.
- Game-Day Hub remains the single Owner/Admin game-creation surface.
- New game database records are production records after the 7.57.14 pilot graduation.

## Database
New table: `public.live_game_series`

Series types:
- `tournament`
- `scrimmage_weekend`

`public.live_games` gains:
- `series_id`
- `scrimmage_weekend_name`

New/updated RPCs:
- `live_save_game_day_v2`
- `live_game_series_archive_v1`
- `live_game_day_queue_v4` remains the same public name and remains chunked below PostgreSQL's 100-argument function ceiling.

A trigger automatically places tournament games under their tournament series, including later official-schedule sync/reconciliation updates.

## One-time reset
Migration ends with:
- `delete from public.live_games;`
- `delete from public.live_game_series;`

`live_games` child records cascade, so old test plays, deliveries, lineups, recaps, scorer-control records, and assignment audit disappear with the old games.

## Protected
No change to:
- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- scorer handoff / exactly-one-active-scorer contracts
- Final Whistle / multipart summary ordering

No Edge Function deploy or new secret is required.
