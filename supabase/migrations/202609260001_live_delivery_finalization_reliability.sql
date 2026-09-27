-- WPHQ 7.64.31 — Live Delivery & Finalization Reliability
-- Restores game-scoped operational reads for active/recent scorer handoff sessions
-- without exposing detailed player/event data to ordinary Supporters.
--
-- Production evidence from 2026-09-26 showed guest scorer writes were repeatedly
-- rejected because INSERT ... RETURNING on live_events also needs SELECT visibility.
-- The scorer session itself was valid; the 7.63.1 privacy policy had narrowed raw
-- event reads to permanent Owner/Admin/Scorer memberships only.

create or replace function public.live_has_recent_scorer_session_access(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.live_game_scorer_sessions s
    where s.game_id=target_game_id
      and s.user_id=(select auth.uid())
      and (
        s.status in ('active','read_only')
        or (
          s.status='ended'
          and s.ended_at is not null
          and s.ended_at >= now()-interval '30 minutes'
        )
      )
  );
$$;

revoke all on function public.live_has_recent_scorer_session_access(uuid) from public,anon;
grant execute on function public.live_has_recent_scorer_session_access(uuid) to authenticated;

-- Keep game/delivery reads available to the legitimate scorer through the same
-- 30-minute final-recovery window used by live_reopen_game_eligibility_v1.
create or replace function public.live_can_read_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.live_games g
    where g.id=target_game_id
      and (
        public.live_is_team_member(g.team_id)
        or public.live_has_recent_scorer_session_access(g.id)
      )
  );
$$;

revoke all on function public.live_can_read_game(uuid) from public,anon;
grant execute on function public.live_can_read_game(uuid) to authenticated;

-- 7.63.1 correctly removed raw analytics access for ordinary Supporters, but it
-- unintentionally removed guest scorer visibility too. Preserve the privacy
-- boundary while restoring only permanent operational roles or a game-scoped
-- scorer session.
drop policy if exists live_events_operational_read on public.live_events;
create policy live_events_operational_read
  on public.live_events
  for select to authenticated
  using (
    exists(
      select 1 from public.live_games g
      where g.id=live_events.game_id
        and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[])
    )
    or public.live_has_recent_scorer_session_access(live_events.game_id)
  );

drop policy if exists live_lineups_operational_read on public.live_lineups;
create policy live_lineups_operational_read
  on public.live_lineups
  for select to authenticated
  using (
    exists(
      select 1 from public.live_games g
      where g.id=live_lineups.game_id
        and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[])
    )
    or public.live_has_recent_scorer_session_access(live_lineups.game_id)
  );

drop policy if exists live_game_recaps_operational_read on public.live_game_recaps;
create policy live_game_recaps_operational_read
  on public.live_game_recaps
  for select to authenticated
  using (
    exists(
      select 1 from public.live_games g
      where g.id=live_game_recaps.game_id
        and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[])
    )
    or public.live_has_recent_scorer_session_access(live_game_recaps.game_id)
  );

comment on function public.live_has_recent_scorer_session_access(uuid) is
  '7.64.31: game-scoped detailed read access for the active/read-only scorer and the recently ended scorer during the 30-minute final recovery window.';
comment on function public.live_can_read_game(uuid) is
  '7.64.31: team membership or legitimate game-scoped scorer-session read access; ordinary Supporter detail remains governed by follower/analytics RPC boundaries.';
