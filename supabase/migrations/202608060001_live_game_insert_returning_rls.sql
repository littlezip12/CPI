-- WPI 7.56.6 hotfix — allow authorized team managers to receive the
-- newly inserted live_games row from PostgREST INSERT ... RETURNING.
--
-- The original 7.56.6 SELECT policy delegated all checks to the STABLE
-- live_can_read_game(uuid) helper. During the same INSERT statement that helper
-- re-queries live_games using the statement-start snapshot and cannot see the
-- candidate row yet. PostgreSQL therefore rejects the RETURNING row with an RLS
-- error even though the Owner/Admin INSERT policy itself is satisfied.

begin;

drop policy if exists "game participants read games" on public.live_games;
create policy "game participants read games" on public.live_games
for select to authenticated using (
  public.live_is_team_member(live_games.team_id)
  or public.live_can_read_game(live_games.id)
);

commit;
