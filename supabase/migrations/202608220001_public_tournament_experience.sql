-- WPI 7.64.1 — Tournament Experience
-- Public, score-only tournament destinations built from games explicitly published
-- as public_team. This migration does not expose rosters, player events, scorer
-- identity, GroupMe delivery data, membership data, or private games.

create or replace function public.live_public_tournament_catalog_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  tournaments_json jsonb := '[]'::jsonb;
begin
  select coalesce(jsonb_agg(row_data order by sort_rank, sort_time desc nulls last, tournament_name),'[]'::jsonb)
  into tournaments_json
  from (
    select
      case
        when count(*) filter (where g.status='live') > 0 then 0
        when count(*) filter (where g.status in ('scheduled','setup') and g.scheduled_at >= now()) > 0 then 1
        else 2
      end as sort_rank,
      max(coalesce(g.scheduled_at,g.ended_at,g.updated_at,g.created_at)) as sort_time,
      min(g.tournament_name) as tournament_name,
      jsonb_build_object(
        'name',min(g.tournament_name),
        'tournamentPublicId',nullif(trim(g.tournament_public_id),''),
        'competitiveSeason',g.competitive_season,
        'liveGames',count(*) filter (where g.status='live'),
        'upcomingGames',count(*) filter (where g.status in ('scheduled','setup') and (g.scheduled_at is null or g.scheduled_at >= now()-interval '6 hours')),
        'finalGames',count(*) filter (where g.status='final'),
        'wpiTeams',count(distinct g.team_id),
        'firstGameAt',min(g.scheduled_at),
        'lastGameAt',max(coalesce(g.scheduled_at,g.ended_at,g.updated_at,g.created_at)),
        'venues',coalesce(jsonb_agg(distinct nullif(trim(g.venue),'')) filter (where nullif(trim(g.venue),'') is not null),'[]'::jsonb),
        'divisions',coalesce(jsonb_agg(distinct nullif(trim(g.official_division_label),'')) filter (where nullif(trim(g.official_division_label),'') is not null),'[]'::jsonb),
        'representativeSeriesId',(array_agg(g.series_id order by g.created_at) filter (where g.series_id is not null))[1]
      ) as row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id and t.active=true
    join public.live_clubs c on c.id=t.club_id and c.active=true
    where g.visibility='public_team'
      and g.game_kind='tournament'
      and g.status<>'cancelled'
      and nullif(trim(g.tournament_name),'') is not null
      and coalesce(g.scheduled_at,g.ended_at,g.updated_at,g.created_at) >= now()-interval '180 days'
      and coalesce(g.scheduled_at,g.created_at) <= now()+interval '90 days'
    group by coalesce(nullif(trim(g.tournament_public_id),''),lower(trim(g.tournament_name))),g.tournament_public_id,g.competitive_season
    order by sort_rank,sort_time desc nulls last,tournament_name
    limit 36
  ) rows;

  return jsonb_build_object(
    'tournaments',tournaments_json,
    'policy','public_team_tournament_summary_only',
    'generatedAt',now()
  );
end;
$$;

revoke all on function public.live_public_tournament_catalog_v1() from public;
grant execute on function public.live_public_tournament_catalog_v1() to anon,authenticated;

comment on function public.live_public_tournament_catalog_v1() is
  'Public tournament discovery derived only from public_team WPI Live game summaries. No player, roster, scorer, membership, delivery, or private-game data.';

create or replace function public.live_public_tournament_v1(
  requested_tournament_public_id text default null,
  requested_tournament_name text default null,
  requested_competitive_season text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  public_id text := nullif(trim(coalesce(requested_tournament_public_id,'')),'');
  tournament_name text := nullif(trim(coalesce(requested_tournament_name,'')),'');
  season_name text := nullif(trim(coalesce(requested_competitive_season,'')),'');
  selected_name text;
  selected_public_id text;
  selected_season text;
  representative_series uuid;
  games_json jsonb := '[]'::jsonb;
  teams_json jsonb := '[]'::jsonb;
  divisions_json jsonb := '[]'::jsonb;
  venues_json jsonb := '[]'::jsonb;
  first_game timestamptz;
  last_game timestamptz;
  live_games integer := 0;
  upcoming_games integer := 0;
  final_games integer := 0;
  wpi_teams integer := 0;
begin
  if public_id is null and tournament_name is null then
    return jsonb_build_object('found',false,'reason','missing_tournament','policy','public_team_tournament_summary_only');
  end if;

  select
    g.tournament_name,
    nullif(trim(g.tournament_public_id),''),
    g.competitive_season,
    g.series_id
  into selected_name,selected_public_id,selected_season,representative_series
  from public.live_games g
  join public.live_teams t on t.id=g.team_id and t.active=true
  join public.live_clubs c on c.id=t.club_id and c.active=true
  where g.visibility='public_team'
    and g.game_kind='tournament'
    and g.status<>'cancelled'
    and (
      (public_id is not null and nullif(trim(g.tournament_public_id),'')=public_id)
      or (
        public_id is null
        and tournament_name is not null
        and lower(trim(g.tournament_name))=lower(tournament_name)
        and (season_name is null or g.competitive_season=season_name)
      )
    )
  order by case when g.status='live' then 0 when g.status in ('scheduled','setup') then 1 else 2 end,
           coalesce(g.scheduled_at,g.updated_at,g.created_at) desc
  limit 1;

  if selected_name is null then
    return jsonb_build_object('found',false,'reason','tournament_not_public_or_not_found','policy','public_team_tournament_summary_only');
  end if;

  -- Public game rows. Keep the same privacy boundary as live_public_scoreboard_v1.
  select coalesce(jsonb_agg(row_data order by sort_rank, sort_time asc nulls last, sort_updated desc),'[]'::jsonb)
  into games_json
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end as sort_rank,
      g.scheduled_at as sort_time,
      g.updated_at as sort_updated,
      jsonb_build_object(
        'id',g.id,
        'teamId',g.team_id,
        'teamFamilyKey',t.canonical_wpi_team_family_key,
        'teamName',g.team_name_snapshot,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,
        'gender',t.gender,
        'squadLabel',t.squad_label,
        'organizationId',coalesce(c.canonical_wpi_club_id,c.canonical_slug,c.id::text),
        'organizationName',coalesce(nullif(trim(c.display_name),''),c.name),
        'organizationType',c.organization_type,
        'opponentName',g.opponent_name,
        'scheduledAt',g.scheduled_at,
        'startedAt',g.started_at,
        'endedAt',g.ended_at,
        'venue',g.venue,
        'status',g.status,
        'currentQuarter',g.current_quarter,
        'currentTimeRemainingSeconds',g.current_time_remaining_seconds,
        'teamScore',g.team_score,
        'opponentScore',g.opponent_score,
        'updatedAt',g.updated_at,
        'gameKind',g.game_kind,
        'tournamentName',g.tournament_name,
        'tournamentPublicId',nullif(trim(g.tournament_public_id),''),
        'competitiveSeason',g.competitive_season,
        'seriesId',g.series_id,
        'officialDivisionLabel',g.official_division_label,
        'officialStage',g.official_stage,
        'officialGameNumber',g.official_game_number,
        'teamLogoUrl',coalesce(g.team_logo_url,c.logo_url),
        'opponentLogoUrl',g.opponent_logo_url
      ) as row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id and t.active=true
    join public.live_clubs c on c.id=t.club_id and c.active=true
    where g.visibility='public_team'
      and g.game_kind='tournament'
      and g.status<>'cancelled'
      and (
        (selected_public_id is not null and nullif(trim(g.tournament_public_id),'')=selected_public_id)
        or (
          selected_public_id is null
          and lower(trim(g.tournament_name))=lower(selected_name)
          and g.competitive_season=selected_season
        )
      )
    order by sort_rank,sort_time asc nulls last,sort_updated desc
    limit 2000
  ) game_rows;

  select
    count(*) filter (where g.status='live')::int,
    count(*) filter (where g.status in ('scheduled','setup'))::int,
    count(*) filter (where g.status='final')::int,
    count(distinct g.team_id)::int,
    min(g.scheduled_at),
    max(coalesce(g.scheduled_at,g.ended_at,g.updated_at,g.created_at)),
    coalesce(jsonb_agg(distinct nullif(trim(g.official_division_label),'')) filter (where nullif(trim(g.official_division_label),'') is not null),'[]'::jsonb),
    coalesce(jsonb_agg(distinct nullif(trim(g.venue),'')) filter (where nullif(trim(g.venue),'') is not null),'[]'::jsonb),
    coalesce((array_agg(g.series_id order by g.created_at) filter (where g.series_id is not null))[1],representative_series)
  into live_games,upcoming_games,final_games,wpi_teams,first_game,last_game,divisions_json,venues_json,representative_series
  from public.live_games g
  join public.live_teams t on t.id=g.team_id and t.active=true
  join public.live_clubs c on c.id=t.club_id and c.active=true
  where g.visibility='public_team'
    and g.game_kind='tournament'
    and g.status<>'cancelled'
    and (
      (selected_public_id is not null and nullif(trim(g.tournament_public_id),'')=selected_public_id)
      or (
        selected_public_id is null
        and lower(trim(g.tournament_name))=lower(selected_name)
        and g.competitive_season=selected_season
      )
    );

  -- These are WPI team records from finalized public games, not official standings.
  select coalesce(jsonb_agg(team_data order by wins desc, goal_diff desc, final_count desc, team_label),'[]'::jsonb)
  into teams_json
  from (
    select
      coalesce(nullif(trim(t.display_label),''),t.name) as team_label,
      count(*) filter (where g.status='final')::int as final_count,
      count(*) filter (where g.status='final' and coalesce(g.team_score,0)>coalesce(g.opponent_score,0))::int as wins,
      (coalesce(sum(g.team_score) filter (where g.status='final'),0)-coalesce(sum(g.opponent_score) filter (where g.status='final'),0))::int as goal_diff,
      jsonb_build_object(
        'teamId',t.id,
        'teamFamilyKey',t.canonical_wpi_team_family_key,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,
        'gender',t.gender,
        'squadLabel',t.squad_label,
        'organizationId',coalesce(c.canonical_wpi_club_id,c.canonical_slug,c.id::text),
        'organizationName',coalesce(nullif(trim(c.display_name),''),c.name),
        'logoUrl',c.logo_url,
        'games',count(*) filter (where g.status='final'),
        'wins',count(*) filter (where g.status='final' and coalesce(g.team_score,0)>coalesce(g.opponent_score,0)),
        'losses',count(*) filter (where g.status='final' and coalesce(g.team_score,0)<coalesce(g.opponent_score,0)),
        'ties',count(*) filter (where g.status='final' and coalesce(g.team_score,0)=coalesce(g.opponent_score,0)),
        'goalsFor',coalesce(sum(g.team_score) filter (where g.status='final'),0),
        'goalsAgainst',coalesce(sum(g.opponent_score) filter (where g.status='final'),0),
        'goalDifferential',coalesce(sum(g.team_score) filter (where g.status='final'),0)-coalesce(sum(g.opponent_score) filter (where g.status='final'),0),
        'liveGames',count(*) filter (where g.status='live'),
        'upcomingGames',count(*) filter (where g.status in ('scheduled','setup'))
      ) as team_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id and t.active=true
    join public.live_clubs c on c.id=t.club_id and c.active=true
    where g.visibility='public_team'
      and g.game_kind='tournament'
      and g.status<>'cancelled'
      and (
        (selected_public_id is not null and nullif(trim(g.tournament_public_id),'')=selected_public_id)
        or (
          selected_public_id is null
          and lower(trim(g.tournament_name))=lower(selected_name)
          and g.competitive_season=selected_season
        )
      )
    group by t.id,t.canonical_wpi_team_family_key,t.name,t.display_label,t.age_group,t.gender,t.squad_label,
             c.id,c.canonical_wpi_club_id,c.canonical_slug,c.display_name,c.name,c.logo_url
  ) team_rows;

  return jsonb_build_object(
    'found',true,
    'tournament',jsonb_build_object(
      'name',selected_name,
      'tournamentPublicId',selected_public_id,
      'competitiveSeason',selected_season,
      'firstGameAt',first_game,
      'lastGameAt',last_game,
      'venues',venues_json,
      'divisions',divisions_json,
      'representativeSeriesId',representative_series
    ),
    'summary',jsonb_build_object(
      'liveGames',live_games,
      'upcomingGames',upcoming_games,
      'finalGames',final_games,
      'wpiTeams',wpi_teams
    ),
    'games',games_json,
    'teams',teams_json,
    'recordPolicy','WPI team records are derived only from finalized public WPI Live games and are not official tournament standings.',
    'schedulePolicy','The schedule contains only games published through WPI Live and may not represent the complete official tournament schedule.',
    'policy','public_team_tournament_summary_only',
    'generatedAt',now()
  );
end;
$$;

revoke all on function public.live_public_tournament_v1(text,text,text) from public;
grant execute on function public.live_public_tournament_v1(text,text,text) to anon,authenticated;

comment on function public.live_public_tournament_v1(text,text,text) is
  'Public tournament center derived only from public_team WPI Live game summaries. Team records are informational and are not official tournament standings.';

-- 7.64.1 additive public score v2 contracts include tournament identity so
-- public score/game cards can navigate to the tournament center. V1 remains
-- unchanged for compatibility.
create or replace function public.live_public_scoreboard_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  games_json jsonb := '[]'::jsonb;
begin
  select coalesce(jsonb_agg(row_data order by sort_rank, sort_time asc nulls last, sort_updated desc),'[]'::jsonb)
  into games_json
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end as sort_rank,
      g.scheduled_at as sort_time,
      g.updated_at as sort_updated,
      jsonb_build_object(
        'id',g.id,'teamId',g.team_id,'teamFamilyKey',t.canonical_wpi_team_family_key,
        'teamName',g.team_name_snapshot,'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,'gender',t.gender,'squadLabel',t.squad_label,
        'organizationId',coalesce(c.canonical_wpi_club_id,c.canonical_slug,c.id::text),
        'organizationName',coalesce(nullif(trim(c.display_name),''),c.name),'organizationType',c.organization_type,
        'organizationLogoUrl',c.logo_url,'opponentName',g.opponent_name,'scheduledAt',g.scheduled_at,'venue',g.venue,
        'status',g.status,'currentQuarter',g.current_quarter,'currentTimeRemainingSeconds',g.current_time_remaining_seconds,
        'teamScore',g.team_score,'opponentScore',g.opponent_score,'updatedAt',g.updated_at,'endedAt',g.ended_at,
        'gameKind',g.game_kind,'tournamentName',g.tournament_name,'tournamentPublicId',nullif(trim(g.tournament_public_id),''),
        'competitiveSeason',g.competitive_season,'teamLogoUrl',coalesce(g.team_logo_url,c.logo_url),'opponentLogoUrl',g.opponent_logo_url
      ) as row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id and t.active=true
    join public.live_clubs c on c.id=t.club_id and c.active=true
    where g.visibility='public_team' and g.status<>'cancelled'
      and (
        g.status='live'
        or (g.status in ('scheduled','setup') and g.scheduled_at is not null and g.scheduled_at between now()-interval '6 hours' and now()+interval '14 days')
        or (g.status='final' and coalesce(g.ended_at,g.updated_at,g.created_at)>=now()-interval '30 days')
      )
    order by sort_rank,sort_time asc nulls last,sort_updated desc
    limit 250
  ) rows;
  return jsonb_build_object('games',games_json,'policy','public_team_summary_only','generatedAt',now());
end;
$$;
revoke all on function public.live_public_scoreboard_v2() from public;
grant execute on function public.live_public_scoreboard_v2() to anon,authenticated;

create or replace function public.live_public_game_score_v2(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'visible',true,
    'game',jsonb_build_object(
      'id',g.id,'teamId',g.team_id,'teamFamilyKey',t.canonical_wpi_team_family_key,
      'teamName',g.team_name_snapshot,'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
      'ageGroup',t.age_group,'gender',t.gender,'squadLabel',t.squad_label,
      'organizationId',coalesce(c.canonical_wpi_club_id,c.canonical_slug,c.id::text),
      'organizationName',coalesce(nullif(trim(c.display_name),''),c.name),'organizationType',c.organization_type,
      'organizationLogoUrl',c.logo_url,'opponentName',g.opponent_name,'scheduledAt',g.scheduled_at,'startedAt',g.started_at,
      'endedAt',g.ended_at,'venue',g.venue,'status',g.status,'currentQuarter',g.current_quarter,
      'currentTimeRemainingSeconds',g.current_time_remaining_seconds,'quarterLengthSeconds',g.quarter_length_seconds,
      'teamScore',g.team_score,'opponentScore',g.opponent_score,'updatedAt',g.updated_at,'gameKind',g.game_kind,
      'tournamentName',g.tournament_name,'tournamentPublicId',nullif(trim(g.tournament_public_id),''),
      'competitiveSeason',g.competitive_season,'teamLogoUrl',coalesce(g.team_logo_url,c.logo_url),'opponentLogoUrl',g.opponent_logo_url
    ),'policy','public_team_score_summary_only')
  into result
  from public.live_games g
  join public.live_teams t on t.id=g.team_id and t.active=true
  join public.live_clubs c on c.id=t.club_id and c.active=true
  where g.id=target_game_id and g.visibility='public_team' and g.status<>'cancelled';
  return coalesce(result,jsonb_build_object('visible',false,'game',null,'policy','public_team_score_summary_only'));
end;
$$;
revoke all on function public.live_public_game_score_v2(uuid) from public;
grant execute on function public.live_public_game_score_v2(uuid) to anon,authenticated;
