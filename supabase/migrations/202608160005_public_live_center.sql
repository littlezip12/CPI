-- WPI 7.62.3 — Public Live Center & Scoreboard
-- Read-only public score summaries for games explicitly marked public_team.
-- No player, roster, lineup, scorer, membership, delivery, or secret data is exposed.

create or replace function public.live_public_scoreboard_v1()
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
        'organizationLogoUrl',c.logo_url,
        'opponentName',g.opponent_name,
        'scheduledAt',g.scheduled_at,
        'venue',g.venue,
        'status',g.status,
        'currentQuarter',g.current_quarter,
        'currentTimeRemainingSeconds',g.current_time_remaining_seconds,
        'teamScore',g.team_score,
        'opponentScore',g.opponent_score,
        'updatedAt',g.updated_at,
        'endedAt',g.ended_at,
        'gameKind',g.game_kind,
        'tournamentName',g.tournament_name,
        'teamLogoUrl',coalesce(g.team_logo_url,c.logo_url),
        'opponentLogoUrl',g.opponent_logo_url
      ) as row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id and t.active=true
    join public.live_clubs c on c.id=t.club_id and c.active=true
    where g.visibility='public_team'
      and g.status<>'cancelled'
      and (
        g.status='live'
        or (g.status in ('scheduled','setup') and g.scheduled_at is not null and g.scheduled_at between now()-interval '6 hours' and now()+interval '14 days')
        or (g.status='final' and coalesce(g.ended_at,g.updated_at,g.created_at)>=now()-interval '30 days')
      )
    order by sort_rank, sort_time asc nulls last, sort_updated desc
    limit 250
  ) rows;

  return jsonb_build_object(
    'games',games_json,
    'policy','public_team_summary_only',
    'generatedAt',now()
  );
end;
$$;

revoke all on function public.live_public_scoreboard_v1() from public;
grant execute on function public.live_public_scoreboard_v1() to anon,authenticated;

comment on function public.live_public_scoreboard_v1() is
  'Public WPI Live center. Returns score/state summaries only for games explicitly marked public_team; never returns roster/player/scorer/delivery data.';

create or replace function public.live_public_game_score_v1(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'visible',true,
    'game',jsonb_build_object(
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
      'organizationLogoUrl',c.logo_url,
      'opponentName',g.opponent_name,
      'scheduledAt',g.scheduled_at,
      'startedAt',g.started_at,
      'endedAt',g.ended_at,
      'venue',g.venue,
      'status',g.status,
      'currentQuarter',g.current_quarter,
      'currentTimeRemainingSeconds',g.current_time_remaining_seconds,
      'quarterLengthSeconds',g.quarter_length_seconds,
      'teamScore',g.team_score,
      'opponentScore',g.opponent_score,
      'updatedAt',g.updated_at,
      'gameKind',g.game_kind,
      'tournamentName',g.tournament_name,
      'teamLogoUrl',coalesce(g.team_logo_url,c.logo_url),
      'opponentLogoUrl',g.opponent_logo_url
    ),
    'policy','public_team_score_summary_only'
  )
  into result
  from public.live_games g
  join public.live_teams t on t.id=g.team_id and t.active=true
  join public.live_clubs c on c.id=t.club_id and c.active=true
  where g.id=target_game_id and g.visibility='public_team' and g.status<>'cancelled';

  return coalesce(result,jsonb_build_object('visible',false,'game',null,'policy','public_team_score_summary_only'));
end;
$$;

revoke all on function public.live_public_game_score_v1(uuid) from public;
grant execute on function public.live_public_game_score_v1(uuid) to anon,authenticated;

comment on function public.live_public_game_score_v1(uuid) is
  'Public score-only game view for public_team games. Intentionally excludes player, roster, lineup, scorer, membership, message and delivery data.';
