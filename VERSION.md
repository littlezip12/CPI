# WPI 7.56.4 — Manual Game Schema Integrity

- Makes the successful hosted Supabase manual-game correction permanent in source control.
- Removes the legacy `UNIQUE NULLS NOT DISTINCT` definition that limited a team to one manual game.
- Handles both PostgreSQL's truncated constraint name and the originally expected long name.
- Adds an idempotent migration that removes any matching legacy constraint by structure, not only by name.
- Preserves official-source uniqueness through `live_games_official_source_idx`.
- Preserves manual-game identity through `live_games_team_client_id_idx`.
- Adds regression coverage proving the fresh-install SQL cannot recreate the 409 conflict.
- Requires no GroupMe bot, Supabase secret, Edge Function, browser-asset, ranking, club, season, or tournament change.
