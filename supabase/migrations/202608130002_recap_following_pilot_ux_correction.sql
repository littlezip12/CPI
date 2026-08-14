-- WPI 7.58.6 pilot correction: repair permanent recap stats ordering.
-- cap_number is text; the prior integer fallback caused PostgreSQL 42804/COALESCE type errors.

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
    ) order by coalesce(nullif(trim(p.cap_number),''),'999'),p.display_name),'[]'::jsonb)
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

