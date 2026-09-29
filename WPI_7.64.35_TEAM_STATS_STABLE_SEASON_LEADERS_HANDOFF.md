# WPHQ 7.64.35 — Team Stats Stable Season Leaders

## Scope
- Team Stats Season Leaders now uses `live_team_player_insights_v2` season-scoped stable player identity.
- Immutable roster-version UUIDs no longer create duplicate season leader rows.
- The season player count reflects stable players, not roster-version records.
- Event/game Player Stats behavior remains unchanged.
- No scoring, GroupMe, auth, organization-insights, Supabase schema, or Edge Function changes.

## Expected Lamorinda 14U Boys A result after the four test games were removed
- 14 stable players in the current season data.
- William Andrews: 4 GP, 17 G.
- Collin Liu: 4 GP, 5 G.
- Cameron Lewis: 4 GP, 4 G.
- Brayden Hayes: 4 GP, 4 G.

The authoritative upstream baseline for this patch is pushed WPHQ 7.64.34. Tyler's local iOS icon correction is intentionally not touched by this patch.
