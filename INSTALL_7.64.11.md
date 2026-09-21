# Install WPI 7.64.11 — Game-Day Accuracy & Final Whistle

1. Install the patch at the repository root.
2. Run `./release-check-live-7.64.11`.
3. Apply `supabase/migrations/202609210001_game_day_accuracy_final_whistle.sql` in the Supabase SQL Editor.
   - Supabase may show its generic destructive-operation warning because the migration replaces policies/triggers. It does not delete WPI games, rosters, players, or historical analytics.
4. Deploy the new Edge Function:
   `npx supabase functions deploy groupme-post-v7-64-11 --project-ref jmdamtxspyshjxgmunda`
   - Do not use `--no-verify-jwt`.
   - The existing project secret `GROUPME_ACCESS_TOKEN_WPI_LIVE` is reused automatically.
5. Run `./release-check-clean`.
6. Commit/push after the gate passes.

## Live validation

- A routine stat such as Steal or Missed Shot should record without opening Quick Time.
- Goal, Opponent Goal, Exclusion and 5M actions should still open Quick Time.
- End a quarter and verify `Undo end quarter` restores the period/clock.
- Record a play, use `Edit`, change its outcome, and verify the game/player totals refresh.
- At Final Whistle, zero-stat game-roster players must be confirmed as Played or DNP.
- GroupMe should receive Game Story + team stats and a team-stats image card; no player-stat dump should be posted.
