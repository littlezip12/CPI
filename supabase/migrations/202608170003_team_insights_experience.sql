-- WPI 7.63.2 — Team Insights Experience
-- Adds launch pricing metadata, closes the remaining direct analytics-table viewer gap,
-- and exposes one entitlement-aware Game -> Weekend/Tournament -> Season analytics RPC.
-- No billing provider is enabled in this release.

create table if not exists public.live_subscription_products (
  product_code text primary key check (product_code in ('team_insights','organization_insights')),
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  description text not null default '',
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  monthly_price_cents integer check (monthly_price_cents is null or monthly_price_cents > 0),
  annual_price_cents integer check (annual_price_cents is null or annual_price_cents > 0),
  checkout_status text not null default 'preview' check (checkout_status in ('preview','active','paused','retired')),
  updated_at timestamptz not null default now()
);

alter table public.live_subscription_products enable row level security;
revoke all on public.live_subscription_products from anon,authenticated;

insert into public.live_subscription_products(
  product_code,display_name,description,currency,monthly_price_cents,annual_price_cents,checkout_status,updated_at
) values (
  'team_insights',
  'Team Insights',
  'Detailed game, weekend/tournament and season analytics for one stable WPI team family.',
  'USD',500,5000,'preview',now()
)
on conflict (product_code) do update
set display_name=excluded.display_name,
    description=excluded.description,
    currency=excluded.currency,
    monthly_price_cents=excluded.monthly_price_cents,
    annual_price_cents=excluded.annual_price_cents,
    checkout_status=excluded.checkout_status,
    updated_at=now();

-- 7.63.1 corrected events/lineups/recaps, but its inherited analytics-table
-- policy still used live_is_team_member(), which includes viewer/Supporter.
-- Direct analytics-table reads now match the RPC privacy boundary.
drop policy if exists live_game_analytics_entitled_read on public.live_game_analytics;
drop policy if exists live_game_analytics_authorized_read on public.live_game_analytics;
create policy live_game_analytics_authorized_read
  on public.live_game_analytics
  for select to authenticated
  using (
    public.live_has_team_role(team_id,array['owner','admin','scorer']::public.live_team_role[])
    or public.live_has_detailed_analytics_access(team_id)
  );

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
    or analytics_level in ('team_insights','organization_insights');
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

comment on function public.live_team_insights_overview_v1(uuid,text) is
  '7.63.2 entitlement-aware Team Insights overview. Free Supporters receive pricing/offer metadata only; Owner/Admin/Scorer or Team/Organization Insights receive Game -> series -> season aggregates derived from canonical live_game_analytics.';
