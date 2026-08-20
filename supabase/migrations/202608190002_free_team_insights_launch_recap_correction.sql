-- WPI 7.63.8 correction — Free Team Insights Launch Access
-- Free-launch mode is intentionally available to any authenticated WPI account
-- for active teams. Anonymous/public viewers still do not receive player analytics.
-- Reinstalls all affected analytics RPCs so the correction is safe even if the
-- original 7.63.8 migration was missed or partially applied.

alter table public.live_subscription_products
  add column if not exists access_mode text not null default 'paywalled'
  check (access_mode in ('free_launch','paywalled'));

update public.live_subscription_products
set access_mode='free_launch', checkout_status='preview', updated_at=now()
where product_code='team_insights';

create or replace function public.live_team_insights_launch_free_access_v1(target_team_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  free_mode boolean := false;
begin
  if caller is null then return false; end if;

  select (p.access_mode='free_launch') into free_mode
  from public.live_subscription_products p
  where p.product_code='team_insights';

  if not coalesce(free_mode,false) then return false; end if;

  -- During launch, any authenticated WPI account may explore Team Insights
  -- for an active team. This keeps anonymous/public browsing team-level only
  -- while removing the paid/follower gate until monetization is intentionally enabled.
  return exists(
    select 1 from public.live_teams t
    where t.id=target_team_id and t.active=true
  );
end;
$$;

revoke all on function public.live_team_insights_launch_free_access_v1(uuid) from public,anon;
grant execute on function public.live_team_insights_launch_free_access_v1(uuid) to authenticated;

create or replace function public.live_has_detailed_analytics_access(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.live_analytics_access_level_v1(target_team_id) in ('team_insights','organization_insights')
    or public.live_team_insights_launch_free_access_v1(target_team_id);
$$;

revoke all on function public.live_has_detailed_analytics_access(uuid) from public,anon;
grant execute on function public.live_has_detailed_analytics_access(uuid) to authenticated;

create or replace function public.live_game_analytics_detail_v1(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  analytics_row public.live_game_analytics%rowtype;
  game_team_id uuid;
  access_level text;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select team_id into game_team_id from public.live_games where id=target_game_id;
  if game_team_id is null then raise exception 'Game not found'; end if;

  access_level := public.live_analytics_access_level_v1(game_team_id);
  if not public.live_has_team_role(game_team_id,array['owner','admin','scorer']::public.live_team_role[]) and not public.live_has_detailed_analytics_access(game_team_id) then
    raise exception 'Team Insights or Organization Insights access required';
  end if;

  select * into analytics_row from public.live_game_analytics where game_id=target_game_id;
  if analytics_row.game_id is null then
    return jsonb_build_object('gameId',target_game_id,'status','not_generated','accessLevel',access_level);
  end if;

  return jsonb_build_object(
    'gameId',analytics_row.game_id,
    'teamId',analytics_row.team_id,
    'organizationId',analytics_row.organization_id,
    'seriesId',analytics_row.series_id,
    'competitiveSeason',analytics_row.competitive_season,
    'analyticsVersion',analytics_row.analytics_version,
    'revision',analytics_row.revision,
    'status',analytics_row.analytics_status,
    'sourceEventCount',analytics_row.source_event_count,
    'sourceLastEventAt',analytics_row.source_last_event_at,
    'teamScore',analytics_row.final_team_score,
    'opponentScore',analytics_row.final_opponent_score,
    'result',analytics_row.result,
    'teamTotals',analytics_row.team_totals,
    'periodTotals',analytics_row.period_totals,
    'playerTotals',analytics_row.player_totals,
    'generatedAt',analytics_row.generated_at,
    'invalidatedAt',analytics_row.invalidated_at,
    'accessLevel',access_level
  );
end;
$$;

revoke all on function public.live_game_analytics_detail_v1(uuid) from public,anon;
grant execute on function public.live_game_analytics_detail_v1(uuid) to authenticated;

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
  entitlement_level text := 'none';
  can_view_detail boolean := false;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into game_row from public.live_games where id=target_game_id;
  if game_row.id is null then raise exception 'Game not found'; end if;
  if not public.live_can_view_game(game_row.id) then raise exception 'Game access required'; end if;

  select role into member_role from public.live_team_members where team_id=game_row.team_id and user_id=caller;
  is_manager := member_role in ('owner','admin');
  is_follower := member_role='viewer' or (member_role is null and public.live_is_team_follower(game_row.team_id));
  entitlement_level := public.live_analytics_access_level_v1(game_row.team_id);
  can_view_detail := member_role in ('owner','admin','scorer') or public.live_has_detailed_analytics_access(game_row.team_id);

  if game_row.series_id is not null then
    select * into series_row from public.live_game_series where id=game_row.series_id;
  end if;
  select * into recap_row from public.live_game_recaps where game_id=game_row.id;

  if can_view_detail then
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
  end if;

  -- Team-only period score progression is safe for free followers.
  select coalesce(jsonb_agg(jsonb_build_object(
      'quarter',period_row.quarter,
      'periodLabel',coalesce(period_row.period_label,'Q' || period_row.quarter::text),
      'teamScore',period_row.team_score_after,
      'opponentScore',period_row.opponent_score_after
    ) order by period_row.quarter),'[]'::jsonb)
  into periods_json
  from (
    select distinct on (e.quarter)
      e.quarter,l.period_label,e.team_score_after,e.opponent_score_after
    from public.live_events e
    left join public.live_lineups l on l.game_id=e.game_id and l.quarter=e.quarter
    where e.game_id=game_row.id and e.status='active'
    order by e.quarter,e.sequence desc,e.created_at desc
  ) period_row;

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
      'rosterId',case when can_view_detail then game_row.roster_id else null end,
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
      'selectedStyle',case when can_view_detail then recap_row.selected_style else null end,
      'approvedText',case when can_view_detail then recap_row.approved_text else null end,
      'straightText',case when can_view_detail then recap_row.straight_text else null end,
      'analyticsSnapshot',case when can_view_detail then recap_row.analytics_snapshot else '{}'::jsonb end,
      'approvedAt',case when can_view_detail then recap_row.approved_at else null end,
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
      'canManage',is_manager,
      'analyticsLevel',entitlement_level,
      'hasDetailedAnalytics',can_view_detail,
      'detailAccessReason',case
        when member_role in ('owner','admin','scorer') then 'team_role'
        when entitlement_level <> 'none' then 'entitlement'
        when public.live_team_insights_launch_free_access_v1(game_row.team_id) then 'launch_free'
        else 'supporter_free'
      end
    )
  );
end;
$$;

revoke all on function public.live_game_recap_detail_v1(uuid) from public,anon;
grant execute on function public.live_game_recap_detail_v1(uuid) to authenticated;

create or replace function public.live_team_insights_overview_v1(
  target_team_id uuid,
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
  team_row public.live_teams%rowtype;
  club_row public.live_clubs%rowtype;
  member_role public.live_team_role;
  analytics_level text := 'none';
  can_view_detail boolean := false;
  can_view_team boolean := false;
  selected_season text;
  product_row public.live_subscription_products%rowtype;
  available_seasons jsonb := '[]'::jsonb;
  season_summary jsonb := '{}'::jsonb;
  season_totals jsonb := '{}'::jsonb;
  player_totals jsonb := '[]'::jsonb;
  series_summaries jsonb := '[]'::jsonb;
  game_summaries jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into team_row from public.live_teams where id=target_team_id and active=true;
  if team_row.id is null then raise exception 'Team not found'; end if;
  if team_row.club_id is not null then select * into club_row from public.live_clubs where id=team_row.club_id; end if;

  select role into member_role
  from public.live_team_members
  where team_id=team_row.id and user_id=caller;

  analytics_level := public.live_analytics_access_level_v1(team_row.id);
  can_view_detail := coalesce(member_role in ('owner','admin','scorer'),false)
    or public.live_has_detailed_analytics_access(team_row.id);
  can_view_team := member_role is not null
    or public.live_is_team_follower(team_row.id)
    or can_view_detail
    or public.live_is_platform_owner();

  if not can_view_team then raise exception 'Team access required'; end if;

  select * into product_row
  from public.live_subscription_products
  where product_code='team_insights';

  select coalesce(jsonb_agg(season_value order by season_value desc),'[]'::jsonb)
  into available_seasons
  from (
    select distinct competitive_season as season_value
    from public.live_game_analytics
    where team_id=team_row.id and analytics_status='current'
    union
    select team_row.competitive_season
  ) seasons
  where season_value is not null and trim(season_value) <> '';

  if can_view_detail then
    selected_season := nullif(trim(coalesce(requested_season,'')),'');
    if selected_season is null then
      select a.competitive_season into selected_season
      from public.live_game_analytics a
      where a.team_id=team_row.id and a.analytics_status='current'
      order by a.generated_at desc
      limit 1;
      selected_season := coalesce(selected_season,team_row.competitive_season);
    end if;

    select jsonb_build_object(
      'games',count(*)::int,
      'wins',count(*) filter (where result='win')::int,
      'losses',count(*) filter (where result='loss')::int,
      'ties',count(*) filter (where result='tie')::int,
      'goalsFor',coalesce(sum(final_team_score),0),
      'goalsAgainst',coalesce(sum(final_opponent_score),0),
      'goalDifferential',coalesce(sum(final_team_score-final_opponent_score),0)
    ) into season_summary
    from public.live_game_analytics
    where team_id=team_row.id
      and competitive_season=selected_season
      and analytics_status='current';

    select jsonb_build_object(
      'goals',coalesce(sum(coalesce((team_totals->>'goals')::int,0)),0),
      'shootoutGoals',coalesce(sum(coalesce((team_totals->>'shootoutGoals')::int,0)),0),
      'shots',coalesce(sum(coalesce((team_totals->>'shots')::int,0)),0),
      'saves',coalesce(sum(coalesce((team_totals->>'saves')::int,0)),0),
      'fieldBlocks',coalesce(sum(coalesce((team_totals->>'fieldBlocks')::int,0)),0),
      'steals',coalesce(sum(coalesce((team_totals->>'steals')::int,0)),0),
      'turnovers',coalesce(sum(coalesce((team_totals->>'turnovers')::int,0)),0),
      'exclusionsDrawn',coalesce(sum(coalesce((team_totals->>'exclusionsDrawn')::int,0)),0),
      'exclusionsCommitted',coalesce(sum(coalesce((team_totals->>'exclusionsCommitted')::int,0)),0),
      'fiveMetersDrawn',coalesce(sum(coalesce((team_totals->>'fiveMetersDrawn')::int,0)),0),
      'fiveMetersCommitted',coalesce(sum(coalesce((team_totals->>'fiveMetersCommitted')::int,0)),0)
    ) into season_totals
    from public.live_game_analytics
    where team_id=team_row.id
      and competitive_season=selected_season
      and analytics_status='current';

    select coalesce(jsonb_agg(jsonb_build_object(
      'playerId',row_data.player_id,
      'name',row_data.player_name,
      'cap',row_data.cap,
      'games',row_data.games,
      'goals',row_data.goals,
      'assists',row_data.assists,
      'shots',row_data.shots,
      'saves',row_data.saves,
      'fieldBlocks',row_data.field_blocks,
      'steals',row_data.steals,
      'turnovers',row_data.turnovers,
      'exclusionsDrawn',row_data.exclusions_drawn,
      'exclusionsCommitted',row_data.exclusions_committed,
      'fiveMetersDrawn',row_data.five_meters_drawn,
      'fiveMetersCommitted',row_data.five_meters_committed
    ) order by row_data.goals desc,row_data.assists desc,row_data.player_name),'[]'::jsonb)
    into player_totals
    from (
      select
        p->>'playerId' as player_id,
        max(p->>'name') as player_name,
        max(p->>'cap') as cap,
        count(distinct a.game_id)::int as games,
        sum(coalesce((p->>'goals')::int,0))::int as goals,
        sum(coalesce((p->>'assists')::int,0))::int as assists,
        sum(coalesce((p->>'shots')::int,0))::int as shots,
        sum(coalesce((p->>'saves')::int,0))::int as saves,
        sum(coalesce((p->>'fieldBlocks')::int,0))::int as field_blocks,
        sum(coalesce((p->>'steals')::int,0))::int as steals,
        sum(coalesce((p->>'turnovers')::int,0))::int as turnovers,
        sum(coalesce((p->>'exclusionsDrawn')::int,0))::int as exclusions_drawn,
        sum(coalesce((p->>'exclusionsCommitted')::int,0))::int as exclusions_committed,
        sum(coalesce((p->>'fiveMetersDrawn')::int,0))::int as five_meters_drawn,
        sum(coalesce((p->>'fiveMetersCommitted')::int,0))::int as five_meters_committed
      from public.live_game_analytics a
      cross join lateral jsonb_array_elements(a.player_totals) p
      where a.team_id=team_row.id
        and a.competitive_season=selected_season
        and a.analytics_status='current'
      group by p->>'playerId'
    ) row_data;

    select coalesce(jsonb_agg(jsonb_build_object(
      'seriesId',series_rows.series_id,
      'seriesType',series_rows.series_type,
      'name',series_rows.series_name,
      'games',series_rows.games,
      'wins',series_rows.wins,
      'losses',series_rows.losses,
      'ties',series_rows.ties,
      'goalsFor',series_rows.goals_for,
      'goalsAgainst',series_rows.goals_against,
      'goalDifferential',series_rows.goal_differential,
      'teamTotals',series_rows.team_totals,
      'playerTotals',coalesce((
        select jsonb_agg(jsonb_build_object(
          'playerId',pr.player_id,'name',pr.player_name,'cap',pr.cap,'games',pr.games,
          'goals',pr.goals,'assists',pr.assists,'shots',pr.shots,'saves',pr.saves,
          'fieldBlocks',pr.field_blocks,'steals',pr.steals,'turnovers',pr.turnovers,
          'exclusionsDrawn',pr.exclusions_drawn,'exclusionsCommitted',pr.exclusions_committed,
          'fiveMetersDrawn',pr.five_meters_drawn,'fiveMetersCommitted',pr.five_meters_committed
        ) order by pr.goals desc,pr.assists desc,pr.player_name)
        from (
          select p->>'playerId' as player_id,max(p->>'name') as player_name,max(p->>'cap') as cap,
            count(distinct aa.game_id)::int as games,
            sum(coalesce((p->>'goals')::int,0))::int as goals,
            sum(coalesce((p->>'assists')::int,0))::int as assists,
            sum(coalesce((p->>'shots')::int,0))::int as shots,
            sum(coalesce((p->>'saves')::int,0))::int as saves,
            sum(coalesce((p->>'fieldBlocks')::int,0))::int as field_blocks,
            sum(coalesce((p->>'steals')::int,0))::int as steals,
            sum(coalesce((p->>'turnovers')::int,0))::int as turnovers,
            sum(coalesce((p->>'exclusionsDrawn')::int,0))::int as exclusions_drawn,
            sum(coalesce((p->>'exclusionsCommitted')::int,0))::int as exclusions_committed,
            sum(coalesce((p->>'fiveMetersDrawn')::int,0))::int as five_meters_drawn,
            sum(coalesce((p->>'fiveMetersCommitted')::int,0))::int as five_meters_committed
          from public.live_game_analytics aa
          cross join lateral jsonb_array_elements(aa.player_totals) p
          where aa.team_id=team_row.id
            and aa.competitive_season=selected_season
            and aa.analytics_status='current'
            and aa.series_id=series_rows.series_id
          group by p->>'playerId'
        ) pr
      ),'[]'::jsonb)
    ) order by series_rows.last_game desc),'[]'::jsonb)
    into series_summaries
    from (
      select
        a.series_id,
        max(s.series_type) as series_type,
        max(s.name) as series_name,
        count(*)::int as games,
        count(*) filter (where a.result='win')::int as wins,
        count(*) filter (where a.result='loss')::int as losses,
        count(*) filter (where a.result='tie')::int as ties,
        coalesce(sum(a.final_team_score),0) as goals_for,
        coalesce(sum(a.final_opponent_score),0) as goals_against,
        coalesce(sum(a.final_team_score-a.final_opponent_score),0) as goal_differential,
        max(coalesce(g.ended_at,g.scheduled_at,a.generated_at)) as last_game,
        jsonb_build_object(
          'goals',coalesce(sum(coalesce((a.team_totals->>'goals')::int,0)),0),
          'shots',coalesce(sum(coalesce((a.team_totals->>'shots')::int,0)),0),
          'saves',coalesce(sum(coalesce((a.team_totals->>'saves')::int,0)),0),
          'steals',coalesce(sum(coalesce((a.team_totals->>'steals')::int,0)),0),
          'turnovers',coalesce(sum(coalesce((a.team_totals->>'turnovers')::int,0)),0),
          'fieldBlocks',coalesce(sum(coalesce((a.team_totals->>'fieldBlocks')::int,0)),0),
          'exclusionsDrawn',coalesce(sum(coalesce((a.team_totals->>'exclusionsDrawn')::int,0)),0),
          'exclusionsCommitted',coalesce(sum(coalesce((a.team_totals->>'exclusionsCommitted')::int,0)),0),
          'fiveMetersDrawn',coalesce(sum(coalesce((a.team_totals->>'fiveMetersDrawn')::int,0)),0),
          'fiveMetersCommitted',coalesce(sum(coalesce((a.team_totals->>'fiveMetersCommitted')::int,0)),0)
        ) as team_totals
      from public.live_game_analytics a
      join public.live_game_series s on s.id=a.series_id
      join public.live_games g on g.id=a.game_id
      where a.team_id=team_row.id
        and a.competitive_season=selected_season
        and a.analytics_status='current'
        and a.series_id is not null
      group by a.series_id
    ) series_rows;

    select coalesce(jsonb_agg(jsonb_build_object(
      'gameId',a.game_id,
      'seriesId',a.series_id,
      'seriesName',s.name,
      'seriesType',s.series_type,
      'opponentName',g.opponent_name,
      'scheduledAt',g.scheduled_at,
      'endedAt',g.ended_at,
      'venue',g.venue,
      'teamScore',a.final_team_score,
      'opponentScore',a.final_opponent_score,
      'result',a.result,
      'teamTotals',a.team_totals
    ) order by coalesce(g.ended_at,g.scheduled_at,a.generated_at) desc),'[]'::jsonb)
    into game_summaries
    from public.live_game_analytics a
    join public.live_games g on g.id=a.game_id
    left join public.live_game_series s on s.id=a.series_id
    where a.team_id=team_row.id
      and a.competitive_season=selected_season
      and a.analytics_status='current';
  else
    selected_season := team_row.competitive_season;
  end if;

  return jsonb_build_object(
    'team',jsonb_build_object(
      'id',team_row.id,
      'name',team_row.name,
      'displayLabel',coalesce(team_row.display_label,team_row.name),
      'competitiveSeason',team_row.competitive_season,
      'organizationId',team_row.club_id,
      'organizationName',coalesce(club_row.display_name,club_row.name),
      'logoUrl',club_row.logo_url
    ),
    'offer',jsonb_build_object(
      'productCode','team_insights',
      'displayName',coalesce(product_row.display_name,'Team Insights'),
      'currency',coalesce(product_row.currency,'USD'),
      'monthlyPriceCents',coalesce(product_row.monthly_price_cents,500),
      'annualPriceCents',coalesce(product_row.annual_price_cents,5000),
      'checkoutStatus',coalesce(product_row.checkout_status,'preview')
    ),
    'access',jsonb_build_object(
      'role',member_role,
      'analyticsLevel',analytics_level,
      'hasDetailedAnalytics',can_view_detail,
      'isSupporter',member_role='viewer' or (member_role is null and public.live_is_team_follower(team_row.id)),
      'reason',case
        when member_role in ('owner','admin','scorer') then 'team_role'
        when analytics_level <> 'none' then 'entitlement'
        else 'supporter_free'
      end
    ),
    'selectedSeason',selected_season,
    'availableSeasons',available_seasons,
    'seasonSummary',case when can_view_detail then season_summary else '{}'::jsonb end,
    'seasonTeamTotals',case when can_view_detail then season_totals else '{}'::jsonb end,
    'seasonPlayerTotals',case when can_view_detail then player_totals else '[]'::jsonb end,
    'seriesSummaries',case when can_view_detail then series_summaries else '[]'::jsonb end,
    'games',case when can_view_detail then game_summaries else '[]'::jsonb end
  );
end;
$$;

revoke all on function public.live_team_insights_overview_v1(uuid,text) from public,anon;
grant execute on function public.live_team_insights_overview_v1(uuid,text) to authenticated;

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
    or public.live_has_detailed_analytics_access(team_row.id);
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

comment on function public.live_team_insights_launch_free_access_v1(uuid) is
  '7.63.8: global free-launch switch for authenticated team followers/members. This unlocks analytics but does not create a paid entitlement or make the viewer ad-free.';
comment on function public.live_has_detailed_analytics_access(uuid) is
  '7.63.8: detailed analytics are available to explicit paid entitlements or the temporary free-launch Supporter mode.';


-- Keep WPI house creative truthful while Team Insights is free during launch.
update public.live_ad_creatives
set headline='Explore Team Insights',
    body_text='Game, weekend and season analytics are included during the WPI launch.',
    cta='View Team Insights',
    updated_at=now()
where name in ('WPI Team Insights Banner','WPI Team Insights Recap')
  and advertiser_id in (select id from public.live_advertisers where advertiser_type='house');
