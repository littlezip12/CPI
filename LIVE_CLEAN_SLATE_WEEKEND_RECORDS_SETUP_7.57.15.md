# WPI Live 7.57.15 — Clean Slate & Tournament Weekend Records

This release intentionally resets all existing WPI Live **game records** so the pilot starts clean, while preserving the reusable team setup.

## Preserved
- Teams / team profiles
- Team members and roles
- Invitations
- Rosters / players
- Default lineup / goalie configuration
- GroupMe destination and permission setup
- OpenAI roster-extract configuration
- Scoring / handoff / GroupMe / Final Whistle reliability architecture

## Deleted by the migration
The one-time clean-slate migration deletes every existing row in `public.live_games`. Existing child records cascade with it, including game lineups, scoring events, GroupMe deliveries, recaps, scorer sessions / passes / audit, and scorer-assignment audit.

This is intentional for 7.57.15. Do not run the migration if old pilot game records need to be retained.

## New permanent record model
Every new game belongs to a durable weekend/event container:

- **Tournament** → stored under the selected WPI tournament (or manually named tournament when the official schedule is unavailable).
- **Friendly** → requires a **Scrimmage Weekend** name. Reuse the same weekend name for every friendly played in that weekend.

The dashboard no longer contains the flat `Permanent records / Game history` section. It now has a season archive called **Tournaments & weekends**, grouping completed games by event/weekend with record and final scores.

## Production records
From this clean slate forward, newly persisted WPI Live games use `environment='production'`. Historical internal file names such as `live-sandbox.js` remain intentionally untouched where renaming would create reliability risk.

## Supabase
Apply:

`supabase/migrations/202608090004_clean_slate_tournament_weekend_records.sql`

No Edge Function redeploy and no secret changes are required.
