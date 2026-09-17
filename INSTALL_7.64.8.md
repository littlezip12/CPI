# WPI 7.64.8 — Game-Day Speed & Storytelling

## Scope

- Player roster identity accepts cap number, player name, or both.
- Game cap assignments can differ from the permanent roster cap.
- Event/series cap assignments can be saved once and inherited by later games in the same event.
- Scoring uses an event-first Quick Time Pad: choose the event/player, enter compact time (for example `632` -> `6:32`), then record.
- Quick Time Pad includes Same time and +/- 1 second shortcuts.
- Final recap separates Game Story from Game Stats and generates richer team narrative plus positive player highlights.
- Player-specific criticism is intentionally excluded; negative commentary remains team/game level.

## Supabase migration required

`supabase/migrations/202609160001_game_day_speed_storytelling.sql`

The migration:

- makes `live_players.cap_number` and `live_players.display_name` individually optional while requiring at least one;
- adds `live_game_series.player_cap_assignments` for reusable event cap defaults;
- updates `live_save_roster_version_v1` for cap-only/name-only/both roster rows;
- adds authenticated cap-context/save RPCs.

No Edge Function, secret, Stripe, hosting, GroupMe, or scorer-authority migration is included.

## Release validation

Run:

```bash
./release-check-live-7.64.8
```

Then apply the Supabase migration and run:

```bash
./release-check-clean
```

The protected legacy foundation remains byte-stable. WPI 7.64.8 uses derived successor scripts for the intentional game-day changes rather than rewriting the protected 7.56.8/7.58.6 files.
