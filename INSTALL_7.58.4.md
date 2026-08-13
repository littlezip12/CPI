# WPI 7.58.4 — Event Archive & Game Recaps

## What this release changes

- Formalizes one durable **Tournament / Scrimmage Weekend → multiple games** archive structure.
- Adds permanent `live-game-recap.html?game=<uuid>` pages for completed games.
- Builds recaps only from structured game data: game metadata, event timeline, period score checkpoints, lineups, player stats, and approved/saved recap text.
- Keeps raw scorer resume state (`live_games.state_snapshot`) private and out of the recap experience.
- Adds a reusable Scrimmage Weekend selector when creating Friendly games so multiple games can intentionally attach to one weekend record.
- Adds an explicit Owner/Admin **Merge event** action for duplicate event containers. Games are moved to the chosen canonical event; canonical game IDs are never copied or replaced.
- Does **not** silently auto-merge historical tournaments/weekends.
- Preserves game IDs, scores, events, lineups, roster associations, scorer history, official tournament identity, and GroupMe delivery audit.
- Followers may view recap-safe game data where they already have read access. GroupMe delivery audit remains Owner/Admin-only.

## Infrastructure

**One Supabase migration is required:**

`supabase/migrations/202608130001_event_archive_game_recaps.sql`

**No Edge Function redeploy.**  
**No new secret.**

## Release workflow

1. Install the cumulative 7.58.4 patch and run `./release-check-live-7.58.4`.
2. Capture the pre-migration archive/game safety snapshot in Supabase.
3. Apply `202608130001_event_archive_game_recaps.sql` in Supabase.
4. Run the post-migration safety snapshot and confirm the original counts are unchanged.
5. Run the full `./release-check`.
6. If the final line is `CPI release check passed.`, commit and push normally.
7. Validate the live GitHub Pages dashboard and recap page before declaring 7.58.4 authoritative.

## Critical migration expectation

The migration intentionally does **not** consolidate the existing six Lamorinda event-series rows automatically. If two historical cards represent the same real weekend/tournament, an Owner/Admin can use **Merge event** after visually confirming the match.
