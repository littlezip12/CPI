-- WPI 7.63.3 — Player Analytics & Supporter Recap Simplification
-- Adds entitlement-protected player analytics at season, series, and game scope.
-- Player shooting metrics are derived from canonical active live_events so
-- shootout attempts do not distort field-shot shooting percentage.

create or replace function public.live_team_player_insights_v1(
  target_team_id uuid,
  requested_season text default null,
  requested_scope text default 'season',
  requested_scope_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  team_row public.live_teams%rowtype;
  member_role public.live_team_role;
  analytics_level text := 'none';
  can_view_detail boolean := false;
  selected_season text;
  scope_value text := lower(trim(coalesce(requested_scope,'season')));
  scope_label text;
  scope_series_id uuid;
  scope_game_id uuid;
  scope_game_date timestamptz;
  players_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into team_row
  from public.live_teams
  where id=target_team_id and active=true;
  if team_row.id is null then raise exception 'Team not found'; end if;

  select role into member_role
  from public.live_team_members
  where team_id=team_row.id and user_id=caller;

  analytics_level := public.live_analytics_access_level_v1(team_row.id);
  can_view_detail := coalesce(member_role in ('owner','admin','scorer'),false)
    or analytics_level in ('team_insights','organization_insights');
  if not can_view_detail then raise exception 'Detailed analytics access required'; end if;

  if scope_value not in ('season','series','game') then
    raise exception 'Unsupported analytics scope';
  end if;

  selected_season := nullif(trim(coalesce(requested_season,'')),'');
  if selected_season is null then
    select a.competitive_season into selected_season
    from public.live_game_analytics a
    where a.team_id=team_row.id and a.analytics_status='current'
    order by a.generated_at desc
    limit 1;
    selected_season := coalesce(selected_season,team_row.competitive_season);
  end if;

  if scope_value='season' then
    scope_label := coalesce(selected_season,'Season') || ' season';
  elsif scope_value='series' then
    if requested_scope_id is null then raise exception 'Series scope requires an event'; end if;
    select s.id,s.name
      into scope_series_id,scope_label
    from public.live_game_series s
    where s.id=requested_scope_id
      and exists(
        select 1 from public.live_game_analytics a
        where a.series_id=s.id
          and a.team_id=team_row.id
          and a.competitive_season=selected_season
          and a.analytics_status='current'
      );
    if scope_series_id is null then raise exception 'Event analytics not found'; end if;
  else
    if requested_scope_id is null then raise exception 'Game scope requires a game'; end if;
    select a.game_id,g.opponent_name,coalesce(g.ended_at,g.scheduled_at,a.generated_at),a.competitive_season
      into scope_game_id,scope_label,scope_game_date,selected_season
    from public.live_game_analytics a
    join public.live_games g on g.id=a.game_id
    where a.game_id=requested_scope_id
      and a.team_id=team_row.id
      and a.analytics_status='current';
    if scope_game_id is null then raise exception 'Game analytics not found'; end if;
    scope_label := 'vs ' || coalesce(scope_label,'Opponent');
  end if;

  with scope_games as (
    select a.game_id
    from public.live_game_analytics a
    where a.team_id=team_row.id
      and a.analytics_status='current'
      and (
        (scope_value='season' and a.competitive_season=selected_season)
        or (scope_value='series' and a.competitive_season=selected_season and a.series_id=scope_series_id)
        or (scope_value='game' and a.game_id=scope_game_id)
      )
  ),
  participants as (
    select
      p->>'playerId' as player_id,
      max(p->>'name') as player_name,
      max(p->>'cap') as cap,
      count(distinct a.game_id)::int as games
    from public.live_game_analytics a
    join scope_games sg on sg.game_id=a.game_id
    cross join lateral jsonb_array_elements(a.player_totals) p
    where nullif(p->>'playerId','') is not null
    group by p->>'playerId'
  ),
  primary_stats as (
    select
      e.player_id::text as player_id,
      count(*) filter (where e.event_type='goal')::int as goals,
      count(*) filter (where e.event_type in ('goal','shot_missed','shot_post','shot_blocked','shot_saved'))::int as shots,
      count(*) filter (where e.event_type='shot_missed')::int as shots_missed,
      count(*) filter (where e.event_type='shot_post')::int as shots_post,
      count(*) filter (where e.event_type='shot_blocked')::int as shots_blocked,
      count(*) filter (where e.event_type='shot_saved')::int as shots_saved,
      count(*) filter (where e.event_type='shootout_goal')::int as shootout_goals,
      count(*) filter (where e.event_type='shootout_miss')::int as shootout_misses,
      count(*) filter (where e.event_type='save')::int as saves,
      count(*) filter (where e.event_type='field_block')::int as field_blocks,
      count(*) filter (where e.event_type='steal')::int as steals,
      count(*) filter (where e.event_type='turnover')::int as turnovers,
      count(*) filter (where e.event_type='exclusion_drawn')::int as exclusions_drawn,
      count(*) filter (where e.event_type='exclusion_committed')::int as exclusions_committed,
      count(*) filter (where e.event_type='five_meter_drawn')::int as five_meters_drawn,
      count(*) filter (where e.event_type='five_meter_committed')::int as five_meters_committed
    from public.live_events e
    join scope_games sg on sg.game_id=e.game_id
    where e.status='active' and e.player_id is not null
    group by e.player_id
  ),
  assist_stats as (
    select
      e.secondary_player_id::text as player_id,
      count(*) filter (where e.event_type='goal')::int as assists
    from public.live_events e
    join scope_games sg on sg.game_id=e.game_id
    where e.status='active' and e.secondary_player_id is not null
    group by e.secondary_player_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'playerId',p.player_id,
    'name',p.player_name,
    'cap',p.cap,
    'games',p.games,
    'goals',coalesce(ps.goals,0),
    'assists',coalesce(ast.assists,0),
    'shots',coalesce(ps.shots,0),
    'shotsMissed',coalesce(ps.shots_missed,0),
    'shotsPost',coalesce(ps.shots_post,0),
    'shotsBlocked',coalesce(ps.shots_blocked,0),
    'shotsSaved',coalesce(ps.shots_saved,0),
    'shootoutGoals',coalesce(ps.shootout_goals,0),
    'shootoutMisses',coalesce(ps.shootout_misses,0),
    'saves',coalesce(ps.saves,0),
    'fieldBlocks',coalesce(ps.field_blocks,0),
    'steals',coalesce(ps.steals,0),
    'turnovers',coalesce(ps.turnovers,0),
    'exclusionsDrawn',coalesce(ps.exclusions_drawn,0),
    'exclusionsCommitted',coalesce(ps.exclusions_committed,0),
    'fiveMetersDrawn',coalesce(ps.five_meters_drawn,0),
    'fiveMetersCommitted',coalesce(ps.five_meters_committed,0)
  ) order by coalesce(nullif(p.cap,''),'999'),p.player_name),'[]'::jsonb)
  into players_json
  from participants p
  left join primary_stats ps on ps.player_id=p.player_id
  left join assist_stats ast on ast.player_id=p.player_id;

  return jsonb_build_object(
    'teamId',team_row.id,
    'selectedSeason',selected_season,
    'scope',jsonb_build_object(
      'type',scope_value,
      'id',case when scope_value='series' then scope_series_id when scope_value='game' then scope_game_id else null end,
      'label',scope_label,
      'gameDate',scope_game_date
    ),
    'players',players_json
  );
end;
$$;

revoke all on function public.live_team_player_insights_v1(uuid,text,text,uuid) from public,anon;
grant execute on function public.live_team_player_insights_v1(uuid,text,text,uuid) to authenticated;

comment on function public.live_team_player_insights_v1(uuid,text,text,uuid) is
  '7.63.3 entitlement-protected player comparison analytics for one team at season, tournament/weekend, or game scope. Field shooting metrics come from canonical active live_events; shootout results are reported separately.';
