# WPI 7.57.7 — Game-Day Identity & Launch Reliability

Built from pushed WPI 7.57.6 baseline `CPI-main - 2026-08-08T231759.194.zip`.

## User-reported issues fixed

1. Manual opponent entry on mobile did not load the known WPI logo unless a desktop datalist option was selected.
2. A pre-created Game-Day game could reach starter selection but the final **Start game** action did nothing because the database game existed before any scorer session had claimed control.
3. Scrimmage and Friendly were redundant user-facing game types.

## 7.57.7 behavior

- New manual game types shown: **Tournament** and **Friendly** only.
- Friendly covers scrimmage, practice, informal, and other non-tournament games.
- Legacy `scrimmage` records remain readable. Editing a pre-start legacy scrimmage maps it to Friendly; no historical row is deleted.
- Opponent identity is resolved on each `input` event, not only datalist selection.
- Known club aliases immediately load canonical WPI display/logo on mobile and desktop.
- `Stanford Black` → display **Stanford**, Stanford logo; source label remains `Stanford Black` for reconciliation.
- `CCU A` / `CCU Black` → display **CCU**, CC United canonical logo; source label remains intact.
- Alias overlay lives in `data/live/team-identity-aliases.json` so future family aliases can be extended without destructive global renaming.
- New planned-game start RPC `live_prepare_game_start_v1` uses the existing scorer-control authority before opening the unchanged scorer console.
- Existing exactly-one-active-scorer, handoff, GroupMe delivery, Final Whistle, and summary behavior remain authoritative.

## Supabase

Apply only:
`supabase/migrations/202608080006_game_day_identity_launch_reliability.sql`

No Edge Function redeploy. No new secret. Do not touch `groupme-post` or `roster-extract`.

## Protected files

Byte-for-byte unchanged:
- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- `supabase/migrations/202608080005_game_day_hub_universal_game_model.sql`

## Next planned release

After hosted validation, continue with Tournament Schedule Integration & Reconciliation. The future import should reconcile official games against manual tournament records using canonical club/team identity plus the preserved raw source label, then attach the official game ID to the same scored `live_games` row.
