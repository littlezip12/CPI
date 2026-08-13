-- WPI 7.58.4 — Event Archive & Game Recaps
-- Adds permanent read-only Game Recap detail, explicit event-series merge/reconciliation,
-- and a v3 season archive. Existing game IDs, scores, events, lineups, scorer history,
-- GroupMe delivery audit, roster associations, and official reconciliation identities are preserved.

create table if not exists public.live_game_series_merge_audit (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.live_teams(id) on delete cascade,
  source_series_id uuid references public.live_game_series(id) on delete set null,
  target_series_id uuid references public.live_game_series(id) on delete set null,
  source_series_name text not null,
  target_series_name text not null,
  moved_game_ids uuid[] not null default '{}',
  merged_by uuid not null references auth.users(id),
  merged_at timestamptz not null default now()
);

create index if not exists live_game_series_merge_audit_team_idx
  on public.live_game_series_merge_audit(team_id,merged_at desc);

alter table public.live_game_series_merge_audit enable row level security;

drop policy if exists live_game_series_merge_audit_manager_read on public.live_game_series_merge_audit;
create policy live_game_series_merge_audit_manager_read
  on public.live_game_series_merge_audit
  for select to authenticated
  using (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[]));

comment on table public.live_game_series_merge_audit is
  'Audit trail for explicit Owner/Admin event grouping. WPI never silently merges tournament or scrimmage-weekend records.';

-- Explicitly merge one event container into another. This is intentionally a
-- manager action rather than a migration heuristic so ambiguous historical
-- weekend names are never silently combined.
create or replace function public.live_merge_game_series_v1(
  source_series_id uuid,
  target_series_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  source_row public.live_game_series%rowtype;
  target_row public.live_game_series%rowtype;
  moved_ids uuid[] := '{}';
  moved_count integer := 0;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if source_series_id is null or target_series_id is null or source_series_id=target_series_id then
    raise exception 'Choose two different event records';
  end if;

  select * into source_row from public.live_game_series where id=source_series_id for update;
  select * into target_row from public.live_game_series where id=target_series_id for update;
  if source_row.id is null or target_row.id is null then raise exception 'Event record not found'; end if;
  if source_row.team_id<>target_row.team_id then raise exception 'Events must belong to the same team'; end if;
  if source_row.series_type<>target_row.series_type then raise exception 'Tournament and Scrimmage Weekend records cannot be merged'; end if;
  if source_row.competitive_season<>target_row.competitive_season then raise exception 'Events must belong to the same competitive season'; end if;
  if not public.live_has_team_role(source_row.team_id,array['owner','admin']::public.live_team_role[]) then
    raise exception 'Owner or Admin role required';
  end if;

  -- Two different official tournament identities must never be collapsed.
  if source_row.series_type='tournament'
     and source_row.tournament_public_id is not null
     and target_row.tournament_public_id is not null
     and source_row.tournament_public_id<>target_row.tournament_public_id then
    raise exception 'Different official tournaments cannot be merged';
  end if;

  select coalesce(array_agg(id order by created_at),'{}'::uuid[])
    into moved_ids
  from public.live_games
  where series_id=source_row.id;
  moved_count := cardinality(moved_ids);
  if moved_count=0 then raise exception 'The source event has no games to move'; end if;

  update public.live_games
  set series_id=target_row.id,
      tournament_name=case when target_row.series_type='tournament' then target_row.name else tournament_name end,
      tournament_public_id=case when target_row.series_type='tournament' then coalesce(target_row.tournament_public_id,tournament_public_id) else tournament_public_id end,
      scrimmage_weekend_name=case when target_row.series_type='scrimmage_weekend' then target_row.name else scrimmage_weekend_name end,
      updated_at=now()
  where series_id=source_row.id;

  update public.live_game_series
  set updated_at=now(),
      tournament_public_id=case
        when series_type='tournament' then coalesce(tournament_public_id,source_row.tournament_public_id)
        else tournament_public_id
      end
  where id=target_row.id;

  insert into public.live_game_series_merge_audit(
    team_id,source_series_id,target_series_id,source_series_name,target_series_name,moved_game_ids,merged_by
  ) values (
    source_row.team_id,source_row.id,target_row.id,source_row.name,target_row.name,moved_ids,caller
  );

  delete from public.live_game_series where id=source_row.id;

  return jsonb_build_object(
    'teamId',source_row.team_id,
    'targetSeriesId',target_row.id,
    'targetSeriesName',target_row.name,
    'movedGameCount',moved_count,
    'movedGameIds',to_jsonb(moved_ids)
  );
end;
$$;

grant execute on function public.live_merge_game_series_v1(uuid,uuid) to authenticated;

-- Permanent recap detail. The RPC returns only recap-safe structured game data;
-- it does not expose the raw private scorer state snapshot. Followers may view
-- the same recap-safe surface through live_can_view_game, while write authority
-- remains unchanged.
create or replace function public.live_game_recap_detail_v1(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  series_row public.live_game_series%rowtype;
  member_role public.live_team_role;
  recap_row public.live_game_recaps%rowtype;
  events_json jsonb := '[]'::jsonb;
  lineups_json jsonb := '[]'::jsonb;
  periods_json jsonb := '[]'::jsonb;
  stats_json jsonb := '[]'::jsonb;
  delivery_json jsonb := null;
  is_manager boolean := false;
  is_follower boolean := false;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into game_row from public.live_games where id=target_game_id;
  if game_row.id is null then raise exception 'Game not found'; end if;
  if not public.live_can_view_game(game_row.id) then raise exception 'Game access required'; end if;

  select role into member_role from public.live_team_members where team_id=game_row.team_id and user_id=caller;
  is_manager := member_role in ('owner','admin');
  is_follower := member_role is null and public.live_is_team_follower(game_row.team_id);
  if game_row.series_id is not null then
    select * into series_row from public.live_game_series where id=game_row.series_id;
  end if;
  select * into recap_row from public.live_game_recaps where game_id=game_row.id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,
      'sequence',e.sequence,
      'eventType',e.event_type,
      'eventLabel',e.event_label,
      'quarter',e.quarter,
      'phase',e.phase,
      'timeRemainingSeconds',e.time_remaining_seconds,
      'teamScoreAfter',e.team_score_after,
      'opponentScoreAfter',e.opponent_score_after,
      'playerId',e.player_id,
      'playerName',p.display_name,
      'playerCap',p.cap_number,
      'secondaryPlayerId',e.secondary_player_id,
      'secondaryPlayerName',sp.display_name,
      'secondaryPlayerCap',sp.cap_number,
      'note',e.note,
      'metrics',e.metrics,
      'createdAt',e.created_at
    ) order by e.sequence),'[]'::jsonb)
  into events_json
  from public.live_events e
  left join public.live_players p on p.id=e.player_id
  left join public.live_players sp on sp.id=e.secondary_player_id
  where e.game_id=game_row.id and e.status='active';

  select coalesce(jsonb_agg(jsonb_build_object(
      'quarter',l.quarter,
      'periodLabel',coalesce(l.period_label,'Q' || l.quarter::text),
      'goalieId',l.goalie_id,
      'goalieName',gp.display_name,
      'goalieCap',gp.cap_number,
      'players',coalesce(players.player_rows,'[]'::jsonb)
    ) order by l.quarter),'[]'::jsonb)
  into lineups_json
  from public.live_lineups l
  left join public.live_players gp on gp.id=l.goalie_id
  left join lateral (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',lp.id,'name',lp.display_name,'cap',lp.cap_number
    ) order by ids.ordinality),'[]'::jsonb) as player_rows
    from unnest(l.player_ids) with ordinality ids(player_id,ordinality)
    join public.live_players lp on lp.id=ids.player_id
  ) players on true
  where l.game_id=game_row.id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'quarter',period_row.quarter,
      'periodLabel',coalesce(period_row.period_label,'Q' || period_row.quarter::text),
      'teamScore',period_row.team_score_after,
      'opponentScore',period_row.opponent_score_after
    ) order by period_row.quarter),'[]'::jsonb)
  into periods_json
  from (
    select distinct on (e.quarter)
      e.quarter,
      l.period_label,
      e.team_score_after,
      e.opponent_score_after
    from public.live_events e
    left join public.live_lineups l on l.game_id=e.game_id and l.quarter=e.quarter
    where e.game_id=game_row.id and e.status='active'
    order by e.quarter,e.sequence desc
  ) period_row;

  select coalesce(jsonb_agg(jsonb_build_object(
      'playerId',p.id,
      'name',p.display_name,
      'cap',p.cap_number,
      'goals',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type in ('goal','shootout_goal')),
      'assists',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.secondary_player_id=p.id and e.event_type='goal'),
      'saves',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='save'),
      'steals',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='steal'),
      'turnovers',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='turnover'),
      'exclusionsDrawn',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='exclusion_drawn'),
      'exclusionsCommitted',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='exclusion_committed'),
      'fiveMetersDrawn',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='five_meter_drawn'),
      'fiveMetersCommitted',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='five_meter_committed')
    ) order by coalesce(p.cap_number,999),p.display_name),'[]'::jsonb)
  into stats_json
  from public.live_players p
  where p.id in (
    select e.player_id from public.live_events e where e.game_id=game_row.id and e.player_id is not null
    union
    select e.secondary_player_id from public.live_events e where e.game_id=game_row.id and e.secondary_player_id is not null
    union
    select unnest(l.player_ids) from public.live_lineups l where l.game_id=game_row.id
    union
    select l.goalie_id from public.live_lineups l where l.game_id=game_row.id and l.goalie_id is not null
  );

  if is_manager then
    select jsonb_build_object(
      'sent',count(*) filter (where d.status='sent'),
      'failed',count(*) filter (where d.status='failed'),
      'pending',count(*) filter (where d.status='pending'),
      'suppressed',count(*) filter (where d.status='suppressed')
    )
    into delivery_json
    from public.live_deliveries d
    join public.live_events e on e.id=d.event_id
    where e.game_id=game_row.id;
  end if;

  return jsonb_build_object(
    'game',jsonb_build_object(
      'id',game_row.id,
      'teamId',game_row.team_id,
      'rosterId',game_row.roster_id,
      'teamName',game_row.team_name_snapshot,
      'opponentName',game_row.opponent_name,
      'scheduledAt',game_row.scheduled_at,
      'startedAt',game_row.started_at,
      'endedAt',game_row.ended_at,
      'venue',game_row.venue,
      'status',game_row.status,
      'teamScore',game_row.team_score,
      'opponentScore',game_row.opponent_score,
      'competitiveSeason',game_row.competitive_season,
      'gameKind',game_row.game_kind,
      'teamLogoUrl',game_row.team_logo_url,
      'opponentLogoUrl',game_row.opponent_logo_url,
      'officialDivisionLabel',game_row.official_division_label,
      'officialStage',game_row.official_stage,
      'officialGameNumber',game_row.official_game_number,
      'reconciliationStatus',game_row.reconciliation_status
    ),
    'series',case when series_row.id is null then null else jsonb_build_object(
      'id',series_row.id,
      'seriesType',series_row.series_type,
      'name',series_row.name,
      'competitiveSeason',series_row.competitive_season,
      'tournamentPublicId',series_row.tournament_public_id,
      'creationSource',series_row.creation_source
    ) end,
    'recap',case when recap_row.game_id is null then null else jsonb_build_object(
      'selectedStyle',recap_row.selected_style,
      'approvedText',recap_row.approved_text,
      'straightText',recap_row.straight_text,
      'analyticsSnapshot',recap_row.analytics_snapshot,
      'approvedAt',recap_row.approved_at,
      'updatedAt',recap_row.updated_at
    ) end,
    'periods',periods_json,
    'lineups',lineups_json,
    'events',events_json,
    'playerStats',stats_json,
    'deliveryAudit',delivery_json,
    'viewer',jsonb_build_object(
      'role',member_role,
      'isFollower',is_follower,
      'canManage',is_manager
    )
  );
end;
$$;

grant execute on function public.live_game_recap_detail_v1(uuid) to authenticated;

-- Archive v3 keeps the proven season/event summary while adding manager metadata
-- used for explicit event grouping and permanent recap routes.
create or replace function public.live_game_series_archive_v3(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  member_role public.live_team_role;
  series_json jsonb := '[]'::jsonb;
  seasons_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role into member_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;
  if member_role is null then raise exception 'Team membership required'; end if;

  select coalesce(jsonb_agg(season_name order by season_name desc),'[]'::jsonb)
  into seasons_json
  from (
    select distinct s.competitive_season as season_name
    from public.live_game_series s
    where s.team_id=target_team_id
  ) seasons;

  select coalesce(jsonb_agg(series_row order by competitive_season desc,sort_date desc nulls last,created_at desc),'[]'::jsonb)
  into series_json
  from (
    select
      s.created_at,
      s.competitive_season,
      summary.last_game_at as sort_date,
      jsonb_build_object(
        'id',s.id,
        'seriesType',s.series_type,
        'name',s.name,
        'competitiveSeason',s.competitive_season,
        'tournamentPublicId',s.tournament_public_id,
        'creationSource',s.creation_source,
        'gameCount',summary.game_count,
        'finalCount',summary.final_count,
        'wins',summary.wins,
        'losses',summary.losses,
        'ties',summary.ties,
        'firstGameAt',summary.first_game_at,
        'lastGameAt',summary.last_game_at,
        'venues',summary.venues,
        'canManage',member_role in ('owner','admin'),
        'games',summary.games
      ) as series_row
    from public.live_game_series s
    cross join lateral (
      select
        count(g.id)::int as game_count,
        count(g.id) filter (where g.status='final')::int as final_count,
        count(g.id) filter (where g.status='final' and g.team_score>g.opponent_score)::int as wins,
        count(g.id) filter (where g.status='final' and g.team_score<g.opponent_score)::int as losses,
        count(g.id) filter (where g.status='final' and g.team_score=g.opponent_score)::int as ties,
        min(g.scheduled_at) as first_game_at,
        max(coalesce(g.scheduled_at,g.ended_at,g.created_at)) as last_game_at,
        coalesce(jsonb_agg(distinct nullif(trim(g.venue),'')) filter (where nullif(trim(g.venue),'') is not null),'[]'::jsonb) as venues,
        coalesce(jsonb_agg(jsonb_build_object(
          'id',g.id,
          'teamName',g.team_name_snapshot,
          'opponentName',g.opponent_name,
          'opponentSourceName',g.opponent_source_name,
          'scheduledAt',g.scheduled_at,
          'startedAt',g.started_at,
          'endedAt',g.ended_at,
          'venue',g.venue,
          'status',g.status,
          'teamScore',g.team_score,
          'opponentScore',g.opponent_score,
          'teamLogoUrl',g.team_logo_url,
          'opponentLogoUrl',g.opponent_logo_url,
          'officialDivisionLabel',g.official_division_label,
          'officialStage',g.official_stage,
          'officialGameNumber',g.official_game_number,
          'reconciliationStatus',g.reconciliation_status,
          'recapAvailable',(r.game_id is not null)
        ) order by coalesce(g.scheduled_at,g.ended_at,g.created_at)) filter (where g.status='final'),'[]'::jsonb) as games
      from public.live_games g
      left join public.live_game_recaps r on r.game_id=g.id
      where g.series_id=s.id
    ) summary
    where s.team_id=target_team_id and summary.game_count>0
  ) rows;

  return jsonb_build_object(
    'role',member_role,
    'canManage',member_role in ('owner','admin'),
    'seasons',seasons_json,
    'series',series_json
  );
end;
$$;

grant execute on function public.live_game_series_archive_v3(uuid) to authenticated;
