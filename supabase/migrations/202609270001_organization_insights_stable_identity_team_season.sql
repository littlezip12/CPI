-- WPHQ 7.64.34 — Organization Insights Identity & Team-Scoped Season Stats
-- Keeps Organization Insights private/entitled while resolving historical roster-version
-- UUIDs to the browser-stable client_player_id. Aggregation is intentionally scoped by
-- team_id + stable player identity so the same child on A/B teams remains separate.

create or replace function public.live_organization_insights_overview_v2(
  target_organization_id uuid,
  requested_season text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  org_row public.live_clubs%rowtype;
  selected_season text;
  available_seasons jsonb := '[]'::jsonb;
  org_summary jsonb := '{}'::jsonb;
  org_totals jsonb := '{}'::jsonb;
  team_summaries jsonb := '[]'::jsonb;
  event_summaries jsonb := '[]'::jsonb;
  player_leaders jsonb := '[]'::jsonb;
  recent_games jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into org_row from public.live_clubs where id=target_organization_id and active=true;
  if org_row.id is null then raise exception 'Organization not found'; end if;
  if not public.live_has_organization_insights_access_v1(org_row.id) then
    raise exception 'Organization Insights access required';
  end if;

  select coalesce(jsonb_agg(season_value order by season_value desc),'[]'::jsonb)
  into available_seasons
  from (
    select distinct a.competitive_season as season_value
    from public.live_game_analytics a
    where a.organization_id=org_row.id and a.analytics_status='current'
    union
    select distinct t.competitive_season
    from public.live_teams t
    where t.club_id=org_row.id and t.active=true
  ) seasons
  where season_value is not null and trim(season_value)<>'';

  selected_season := nullif(trim(coalesce(requested_season,'')),'');
  if selected_season is null then
    select a.competitive_season into selected_season
    from public.live_game_analytics a
    where a.organization_id=org_row.id and a.analytics_status='current'
    order by a.generated_at desc limit 1;
    if selected_season is null then
      select t.competitive_season into selected_season
      from public.live_teams t where t.club_id=org_row.id and t.active=true
      order by t.updated_at desc limit 1;
    end if;
  end if;

  select jsonb_build_object(
    'teams',(select count(*)::int from public.live_teams t where t.club_id=org_row.id and t.active=true),
    'teamsWithFinals',count(distinct a.team_id)::int,
    'games',count(*)::int,
    'wins',count(*) filter (where a.result='win')::int,
    'losses',count(*) filter (where a.result='loss')::int,
    'ties',count(*) filter (where a.result='tie')::int,
    'goalsFor',coalesce(sum(a.final_team_score),0),
    'goalsAgainst',coalesce(sum(a.final_opponent_score),0),
    'goalDifferential',coalesce(sum(a.final_team_score-a.final_opponent_score),0)
  ) into org_summary
  from public.live_game_analytics a
  where a.organization_id=org_row.id
    and a.analytics_status='current'
    and (selected_season is null or a.competitive_season=selected_season);

  select jsonb_build_object(
    'goals',coalesce(sum(coalesce((a.team_totals->>'goals')::int,0)),0),
    'shots',coalesce(sum(coalesce((a.team_totals->>'shots')::int,0)),0),
    'saves',coalesce(sum(coalesce((a.team_totals->>'saves')::int,0)),0),
    'fieldBlocks',coalesce(sum(coalesce((a.team_totals->>'fieldBlocks')::int,0)),0),
    'steals',coalesce(sum(coalesce((a.team_totals->>'steals')::int,0)),0),
    'turnovers',coalesce(sum(coalesce((a.team_totals->>'turnovers')::int,0)),0),
    'exclusionsDrawn',coalesce(sum(coalesce((a.team_totals->>'exclusionsDrawn')::int,0)),0),
    'exclusionsCommitted',coalesce(sum(coalesce((a.team_totals->>'exclusionsCommitted')::int,0)),0),
    'fiveMetersDrawn',coalesce(sum(coalesce((a.team_totals->>'fiveMetersDrawn')::int,0)),0),
    'fiveMetersCommitted',coalesce(sum(coalesce((a.team_totals->>'fiveMetersCommitted')::int,0)),0)
  ) into org_totals
  from public.live_game_analytics a
  where a.organization_id=org_row.id
    and a.analytics_status='current'
    and (selected_season is null or a.competitive_season=selected_season);

  select coalesce(jsonb_agg(jsonb_build_object(
    'teamId',x.team_id,
    'name',x.team_name,
    'ageGroup',x.age_group,
    'gender',x.gender,
    'squadLabel',x.squad_label,
    'games',x.games,
    'wins',x.wins,
    'losses',x.losses,
    'ties',x.ties,
    'goalsFor',x.goals_for,
    'goalsAgainst',x.goals_against,
    'goalDifferential',x.goal_differential,
    'goals',x.goals,
    'shots',x.shots,
    'shootingPct',case when x.shots>0 then round((x.goals::numeric/x.shots::numeric)*100,1) else null end
  ) order by x.wins desc,x.goal_differential desc,x.team_name),'[]'::jsonb)
  into team_summaries
  from (
    select t.id as team_id,coalesce(t.display_label,t.name) as team_name,t.age_group,t.gender,t.squad_label,
      count(a.game_id)::int as games,
      count(*) filter (where a.result='win')::int as wins,
      count(*) filter (where a.result='loss')::int as losses,
      count(*) filter (where a.result='tie')::int as ties,
      coalesce(sum(a.final_team_score),0) as goals_for,
      coalesce(sum(a.final_opponent_score),0) as goals_against,
      coalesce(sum(a.final_team_score-a.final_opponent_score),0) as goal_differential,
      coalesce(sum(coalesce((a.team_totals->>'goals')::int,0)),0)::int as goals,
      coalesce(sum(coalesce((a.team_totals->>'shots')::int,0)),0)::int as shots
    from public.live_teams t
    left join public.live_game_analytics a on a.team_id=t.id and a.analytics_status='current'
      and (selected_season is null or a.competitive_season=selected_season)
    where t.club_id=org_row.id and t.active=true
    group by t.id,t.display_label,t.name,t.age_group,t.gender,t.squad_label
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'seriesId',x.series_id,
    'name',x.series_name,
    'seriesType',x.series_type,
    'tournamentPublicId',x.tournament_public_id,
    'teams',x.teams,
    'games',x.games,
    'wins',x.wins,
    'losses',x.losses,
    'ties',x.ties,
    'goalsFor',x.goals_for,
    'goalsAgainst',x.goals_against,
    'goalDifferential',x.goal_differential,
    'lastGameAt',x.last_game_at
  ) order by x.last_game_at desc nulls last,x.series_name),'[]'::jsonb)
  into event_summaries
  from (
    select a.series_id,max(s.name) as series_name,max(s.series_type) as series_type,max(s.tournament_public_id) as tournament_public_id,
      count(distinct a.team_id)::int as teams,count(*)::int as games,
      count(*) filter (where a.result='win')::int as wins,
      count(*) filter (where a.result='loss')::int as losses,
      count(*) filter (where a.result='tie')::int as ties,
      coalesce(sum(a.final_team_score),0) as goals_for,coalesce(sum(a.final_opponent_score),0) as goals_against,
      coalesce(sum(a.final_team_score-a.final_opponent_score),0) as goal_differential,
      max(g.ended_at) as last_game_at
    from public.live_game_analytics a
    join public.live_game_series s on s.id=a.series_id
    join public.live_games g on g.id=a.game_id
    where a.organization_id=org_row.id and a.analytics_status='current' and a.series_id is not null
      and (selected_season is null or a.competitive_season=selected_season)
    group by a.series_id
  ) x;

  -- Stable player identity + team scope. Historical analytics store the concrete
  -- live_players.id used by each game's roster version. Resolve that ID back to
  -- client_player_id, then aggregate within team_id so roster versions collapse
  -- but A/B/C team assignments never do.
  with latest_player_names as (
    select distinct on (r.team_id,stable_key)
      r.team_id,
      stable_key,
      p.display_name
    from (
      select p.*,coalesce(nullif(trim(p.client_player_id),''),p.id::text) as stable_key
      from public.live_players p
    ) p
    join public.live_rosters r on r.id=p.roster_id
    join public.live_teams t on t.id=r.team_id
    where t.club_id=org_row.id
      and (selected_season is null or r.competitive_season=selected_season)
    order by r.team_id,stable_key,r.version_number desc,p.updated_at desc,p.created_at desc,p.id desc
  ), aggregated_players as (
    select
      a.team_id,
      max(coalesce(t.display_label,t.name)) as team_name,
      coalesce(nullif(trim(lp.client_player_id),''),p->>'playerId') as stable_player_id,
      max(p->>'name') as analytics_name,
      count(distinct a.game_id)::int as games,
      sum(coalesce((p->>'goals')::int,0))::int as goals,
      sum(coalesce((p->>'shots')::int,0))::int as shots,
      sum(coalesce((p->>'assists')::int,0))::int as assists,
      sum(coalesce((p->>'steals')::int,0))::int as steals,
      sum(coalesce((p->>'turnovers')::int,0))::int as turnovers,
      sum(coalesce((p->>'saves')::int,0))::int as saves,
      count(distinct (p->>'playerId'))::int as roster_identity_count
    from public.live_game_analytics a
    join public.live_teams t on t.id=a.team_id
    cross join lateral jsonb_array_elements(a.player_totals) p
    left join public.live_players lp on lp.id::text=p->>'playerId'
    where a.organization_id=org_row.id and a.analytics_status='current'
      and (selected_season is null or a.competitive_season=selected_season)
    group by a.team_id,coalesce(nullif(trim(lp.client_player_id),''),p->>'playerId')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'teamId',x.team_id,
    'teamName',x.team_name,
    'playerId',x.stable_player_id,
    'name',coalesce(n.display_name,x.analytics_name,'Player'),
    'games',x.games,
    'goals',x.goals,
    'shots',x.shots,
    'shootingPct',case when x.shots>0 then round((x.goals::numeric/x.shots::numeric)*100,1) else null end,
    'assists',x.assists,
    'steals',x.steals,
    'turnovers',x.turnovers,
    'saves',x.saves,
    'rosterIdentityCount',x.roster_identity_count
  ) order by x.team_name,coalesce(n.display_name,x.analytics_name),x.stable_player_id),'[]'::jsonb)
  into player_leaders
  from aggregated_players x
  left join latest_player_names n on n.team_id=x.team_id and n.stable_key=x.stable_player_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'gameId',x.game_id,'teamId',x.team_id,'teamName',x.team_name,'opponentName',x.opponent_name,
    'teamScore',x.team_score,'opponentScore',x.opponent_score,'result',x.result,
    'seriesName',x.series_name,'scheduledAt',x.scheduled_at,'endedAt',x.ended_at
  ) order by x.ended_at desc nulls last,x.scheduled_at desc),'[]'::jsonb)
  into recent_games
  from (
    select a.game_id,a.team_id,coalesce(t.display_label,t.name) as team_name,g.opponent_name,
      a.final_team_score as team_score,a.final_opponent_score as opponent_score,a.result,s.name as series_name,g.scheduled_at,g.ended_at
    from public.live_game_analytics a
    join public.live_teams t on t.id=a.team_id
    join public.live_games g on g.id=a.game_id
    left join public.live_game_series s on s.id=a.series_id
    where a.organization_id=org_row.id and a.analytics_status='current'
      and (selected_season is null or a.competitive_season=selected_season)
    order by g.ended_at desc nulls last,g.scheduled_at desc
    limit 50
  ) x;

  return jsonb_build_object(
    'organization',jsonb_build_object(
      'id',org_row.id,'name',coalesce(org_row.display_name,org_row.name),'organizationType',org_row.organization_type,
      'region',org_row.region,'logoUrl',org_row.logo_url
    ),
    'selectedSeason',selected_season,
    'availableSeasons',available_seasons,
    'summary',org_summary,
    'teamTotals',org_totals,
    'teams',team_summaries,
    'events',event_summaries,
    'playerLeaders',player_leaders,
    'playerAggregation','team_stable_identity_season',
    'recentGames',recent_games
  );
end;
$$;

revoke all on function public.live_organization_insights_overview_v2(uuid,text) from public,anon;
grant execute on function public.live_organization_insights_overview_v2(uuid,text) to authenticated;

comment on function public.live_organization_insights_overview_v2(uuid,text) is
  'Organization Insights overview using team-scoped stable player identity. Roster-version UUIDs collapse within one team/season; the same player on another team remains a separate row.';
