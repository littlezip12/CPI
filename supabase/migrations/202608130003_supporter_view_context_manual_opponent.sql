-- WPI 7.58.6 pilot correction: unify Supporter viewing context across game feed and archive.
-- Followers receive read-only archive visibility for teams they legitimately follow.
-- This does not create membership or grant scoring, roster, access, GroupMe, merge, or admin authority.

create or replace function public.live_game_series_archive_v4(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  member_role public.live_team_role;
  selected_team public.live_teams%rowtype;
  is_follower boolean := false;
  series_json jsonb := '[]'::jsonb;
  seasons_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into selected_team from public.live_teams where id=target_team_id and active=true;
  if selected_team.id is null then raise exception 'Team is unavailable'; end if;

  select role into member_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;
  is_follower := member_role is null and public.live_is_team_follower(target_team_id);
  if member_role is null and not is_follower then raise exception 'Team membership or Following required'; end if;

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
        'canManage',coalesce(member_role in ('owner','admin'),false),
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
          'teamId',g.team_id,
          'teamName',g.team_name_snapshot,
          'teamDisplayLabel',coalesce(nullif(trim(selected_team.display_label),''),selected_team.name),
          'ageGroup',coalesce(g.age_group,selected_team.age_group),
          'gender',selected_team.gender,
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
    'relationship',case when member_role is null then 'following' else 'member' end,
    'isFollower',is_follower,
    'canManage',coalesce(member_role in ('owner','admin'),false),
    'team',jsonb_build_object(
      'teamId',selected_team.id,
      'teamName',selected_team.name,
      'teamDisplayLabel',coalesce(nullif(trim(selected_team.display_label),''),selected_team.name),
      'ageGroup',selected_team.age_group,
      'gender',selected_team.gender,
      'squadLabel',selected_team.squad_label,
      'competitiveSeason',selected_team.competitive_season
    ),
    'seasons',seasons_json,
    'series',series_json
  );
end;
$$;

grant execute on function public.live_game_series_archive_v4(uuid) to authenticated;
