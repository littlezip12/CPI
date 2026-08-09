# WPI 7.57.6 — Game-Day Hub & Universal Game Model

## Purpose

7.57.6 establishes one canonical WPI Live game model before automatic tournament schedule ingestion is connected in 7.57.7.

The dashboard now has a **Game-Day Hub** with two first-class creation paths:

1. **Tournament game** — use this even when the official WPI tournament schedule is missing or stale.
2. **Scrimmage / Friendly** — manual games that may never have an official WPI tournament record.

A manually added tournament game is **not a throwaway duplicate**. It is created as a provisional canonical `live_games` record. Future tournament reconciliation must attach official tournament/source identifiers to that same record so the score, events, lineups, delivery history, and recap remain together.

## Database migration required

Run this migration in the WPI Supabase project before pushing the browser release:

`supabase/migrations/202608080005_game_day_hub_universal_game_model.sql`

The migration:

- adds game kind, provenance, tournament metadata, WPI logo/team references, and reconciliation state to `live_games`;
- adds the team-scoped Game-Day queue RPC;
- adds Owner/Admin manual game create/edit/cancel RPCs;
- adds the protected same-row tournament-link RPC for the future reconciliation layer;
- never deletes a scored game;
- never overwrites score/event state during reconciliation.

Expected Supabase SQL Editor result:

`Success. No rows returned`

## No Edge Function deployment

7.57.6 does **not** change or redeploy:

- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`

There are no new secrets.

## Important product rules

### Manual tournament fallback

If a tournament game is not available from WPI, an Owner/Admin can add it manually and score it immediately.

It starts with:

- `game_kind = tournament`
- `creation_source = manual`
- `reconciliation_status = provisional`

7.57.7 will compare official schedule data with provisional tournament games. A confirmed match will attach the official identifiers to the same `live_games` row instead of creating a second record.

### Duplicate protection

The browser warns when an Owner/Admin tries to add the same kind of game against the same opponent within roughly 90 minutes (and, for tournament games, within the same tournament). This is a guardrail, not a hard block, because teams can legitimately play the same opponent twice.

The database also prevents one official tournament source game from being linked to two WPI Live records.

### Completed scoring is authoritative WPI Live evidence

Future reconciliation must not silently replace a completed WPI Live score, event stream, stats, or GroupMe history. If an official source later disagrees with a scored result, that becomes a review/conflict workflow rather than a destructive overwrite.

### Current History remains temporary

The existing **History** area intentionally remains during development so prior scoring tests and completed games stay available for regression work.

Do not clean up test games in 7.57.6.

The planned 7.57.9 **Games & Results** release will replace raw History and include deliberate test-data cleanup / exclusion.

## Hosted acceptance

After migration + push:

1. Open Team Administration and confirm **Game day** appears in the left navigation.
2. Open **Game-Day Hub**.
3. Add a **Tournament game** manually.
4. Choose a known WPI opponent and confirm team logos appear when WPI can match both teams.
5. Choose an existing tournament or **Other / Unlisted tournament**.
6. Save it and confirm the card reads **Manual tournament · official link pending**.
7. Open/edit it before starting and confirm changes save.
8. Use **Save & start** or **Start game** and confirm the existing scoring setup opens with opponent, date/time, venue, roster, and active GroupMe destination inherited.
9. Score a short test game and confirm normal GroupMe delivery, End Quarter, Final Whistle, and Game Summary remain intact.
10. Confirm the Final game leaves the active Game-Day deck and remains available under History.
11. Add and open a **Scrimmage** or **Friendly**.
12. Confirm a planned game can be cancelled, but a live/final game cannot be edited or cancelled from Game-Day Hub.

Do not manually call the reconciliation RPC during 7.57.6 acceptance. 7.57.7 will wire it to the WPI tournament schedule integration and match-review workflow.
