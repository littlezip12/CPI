# WPI 7.58.6 — Pilot UX + Recap Correction

Correction built from pushed/validated WPI 7.58.6 during real multi-team pilot usage.

## Fixes
- Repairs `live_game_recap_detail_v1` PostgreSQL `COALESCE` text/integer failure so permanent recaps can load structured events, lineups, period scores and player stats.
- Replaces the growing Following list with Search + Age + Boys/Girls/Coed filters.
- Shows current followed teams as compact removable chips.
- Adds All teams / team-specific filter chips to the Supporter game feed when multiple teams are visible.
- Adds explicit team context to every Live/Upcoming/Recent Final card so mixed-age feeds are immediately distinguishable.

## Infrastructure
- One additive Supabase migration: `202608130002_recap_following_pilot_ux_correction.sql`.
- No Edge Function redeploy.
- No new secrets.
- No destructive data migration.
