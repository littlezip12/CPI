-- WPI 7.63.5 — Organization Insights & Sponsorship Operations
-- Builds organization-level analytics and a youth-safe, direct-sold Live advertising
-- delivery/operations layer on top of the 7.63.0 commercial foundation.
-- Stripe/payment collection remains disabled. No third-party programmatic ad network is enabled.

-- ---------------------------------------------------------------------------
-- Organization Insights product metadata (pricing intentionally TBD / B2B negotiated).
-- ---------------------------------------------------------------------------
insert into public.live_subscription_products(
  product_code,display_name,description,currency,monthly_price_cents,annual_price_cents,checkout_status,updated_at
) values (
  'organization_insights',
  'Organization Insights',
  'Cross-team game, event, season and player analytics for one WPI club or high-school organization.',
  'USD',null,null,'preview',now()
)
on conflict (product_code) do update
set display_name=excluded.display_name,
    description=excluded.description,
    currency=excluded.currency,
    checkout_status='preview',
    updated_at=now();

create or replace function public.live_has_organization_insights_access_v1(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select auth.uid() is not null and (
    public.live_is_platform_owner()
    or exists(
      select 1
      from public.live_analytics_entitlements e
      where e.user_id=auth.uid()
        and e.status='active'
        and e.starts_at <= now()
        and (e.ends_at is null or e.ends_at > now())
        and e.entitlement_type='organization_insights'
        and (
          e.scope_type='platform'
          or (e.scope_type='organization' and e.organization_id=target_organization_id)
        )
    )
  );
$$;
revoke all on function public.live_has_organization_insights_access_v1(uuid) from public,anon;
grant execute on function public.live_has_organization_insights_access_v1(uuid) to authenticated;

create or replace function public.live_organization_insights_directory_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  rows_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'organizationId',c.id,
    'name',coalesce(c.display_name,c.name),
    'organizationType',c.organization_type,
    'region',c.region,
    'logoUrl',c.logo_url,
    'teamCount',(select count(*)::int from public.live_teams t where t.club_id=c.id and t.active=true),
    'seasons',coalesce((
      select jsonb_agg(s.season_value order by s.season_value desc)
      from (
        select distinct a.competitive_season as season_value
        from public.live_game_analytics a
        where a.organization_id=c.id and a.analytics_status='current'
      ) s
    ),'[]'::jsonb)
  ) order by coalesce(c.display_name,c.name)),'[]'::jsonb)
  into rows_json
  from public.live_clubs c
  where c.active=true
    and public.live_has_organization_insights_access_v1(c.id);

  return jsonb_build_object(
    'isPlatformOwner',public.live_is_platform_owner(),
    'organizations',rows_json
  );
end;
$$;
revoke all on function public.live_organization_insights_directory_v1() from public,anon;
grant execute on function public.live_organization_insights_directory_v1() to authenticated;

create or replace function public.live_organization_insights_overview_v1(
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'teamId',x.team_id,
    'teamName',x.team_name,
    'playerId',x.player_id,
    'name',x.player_name,
    'cap',x.cap,
    'games',x.games,
    'goals',x.goals,
    'shots',x.shots,
    'shootingPct',case when x.shots>0 then round((x.goals::numeric/x.shots::numeric)*100,1) else null end,
    'assists',x.assists,
    'steals',x.steals,
    'turnovers',x.turnovers,
    'saves',x.saves
  ) order by x.goals desc,x.assists desc,x.player_name),'[]'::jsonb)
  into player_leaders
  from (
    select a.team_id,max(coalesce(t.display_label,t.name)) as team_name,
      p->>'playerId' as player_id,max(p->>'name') as player_name,max(p->>'cap') as cap,
      count(distinct a.game_id)::int as games,
      sum(coalesce((p->>'goals')::int,0))::int as goals,
      sum(coalesce((p->>'shots')::int,0))::int as shots,
      sum(coalesce((p->>'assists')::int,0))::int as assists,
      sum(coalesce((p->>'steals')::int,0))::int as steals,
      sum(coalesce((p->>'turnovers')::int,0))::int as turnovers,
      sum(coalesce((p->>'saves')::int,0))::int as saves
    from public.live_game_analytics a
    join public.live_teams t on t.id=a.team_id
    cross join lateral jsonb_array_elements(a.player_totals) p
    where a.organization_id=org_row.id and a.analytics_status='current'
      and (selected_season is null or a.competitive_season=selected_season)
    group by a.team_id,p->>'playerId'
    order by sum(coalesce((p->>'goals')::int,0)) desc,sum(coalesce((p->>'assists')::int,0)) desc,max(p->>'name')
    limit 100
  ) x;

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
    'recentGames',recent_games
  );
end;
$$;
revoke all on function public.live_organization_insights_overview_v1(uuid,text) from public,anon;
grant execute on function public.live_organization_insights_overview_v1(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Direct-sold youth-safe ad serving and privacy-minimized accounting.
-- WPI-approved advertisers/creatives only. No behavioral targeting or viewer PII.
-- ---------------------------------------------------------------------------
create table if not exists public.live_ad_campaign_counters (
  campaign_id uuid primary key references public.live_ad_campaigns(id) on delete cascade,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.live_ad_delivery_tokens (
  token uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.live_ad_campaigns(id) on delete cascade,
  creative_id uuid not null references public.live_ad_creatives(id) on delete cascade,
  placement text not null,
  game_id uuid references public.live_games(id) on delete set null,
  series_id uuid references public.live_game_series(id) on delete set null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '2 hours'),
  impression_recorded_at timestamptz,
  click_recorded_at timestamptz,
  check (expires_at > issued_at)
);
create index if not exists live_ad_delivery_tokens_expiry_idx on public.live_ad_delivery_tokens(expires_at);

alter table public.live_ad_campaign_counters enable row level security;
alter table public.live_ad_delivery_tokens enable row level security;
revoke all on public.live_ad_campaign_counters from anon,authenticated;
revoke all on public.live_ad_delivery_tokens from anon,authenticated;
create policy live_ad_campaign_counters_platform_owner_only on public.live_ad_campaign_counters
  for select to authenticated using (public.live_is_platform_owner());

alter table public.live_ad_delivery_events add column if not exists delivery_token uuid references public.live_ad_delivery_tokens(token) on delete set null;
create unique index if not exists live_ad_delivery_events_token_type_unique
  on public.live_ad_delivery_events(delivery_token,event_type)
  where delivery_token is not null;

create or replace function public.live_ad_select_v1(
  requested_placement text,
  target_game_id uuid default null,
  rotation_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  placement_value text := nullif(trim(coalesce(requested_placement,'')),'');
  game_row public.live_games%rowtype;
  team_row public.live_teams%rowtype;
  org_row public.live_clubs%rowtype;
  series_row public.live_game_series%rowtype;
  campaign_row public.live_ad_campaigns%rowtype;
  creative_row public.live_ad_creatives%rowtype;
  delivery_token uuid;
  seed text;
begin
  if placement_value is null or placement_value not in ('live.game.banner','live.recap.interstitial','live.weekend.banner') then
    return jsonb_build_object('available',false);
  end if;

  if target_game_id is not null then
    select * into game_row from public.live_games where id=target_game_id;
    if not found then return jsonb_build_object('available',false); end if;
    select * into team_row from public.live_teams where id=game_row.team_id;
    if team_row.club_id is not null then select * into org_row from public.live_clubs where id=team_row.club_id; end if;
    if game_row.series_id is not null then select * into series_row from public.live_game_series where id=game_row.series_id; end if;
  end if;

  seed := coalesce(target_game_id::text,'no-game') || '|' || placement_value || '|' || coalesce(rotation_key,'default');

  select c.* into campaign_row
  from public.live_ad_campaigns c
  join public.live_advertisers a on a.id=c.advertiser_id
  left join public.live_ad_campaign_counters ctr on ctr.campaign_id=c.id
  where c.status in ('scheduled','active')
    and (c.start_at is null or c.start_at <= now())
    and (c.end_at is null or c.end_at > now())
    and placement_value=any(c.placements)
    and a.status='approved' and a.youth_safe_approved
    and (a.advertiser_type='house' or c.payment_status in ('paid','waived'))
    and (c.impression_cap is null or coalesce(ctr.impressions,0) < c.impression_cap)
    and (
      c.scope_type='platform'
      or (c.scope_type='region' and org_row.id is not null and lower(trim(c.scope_region))=lower(trim(coalesce(org_row.region,''))))
      or (c.scope_type='organization' and c.organization_id=org_row.id)
      or (c.scope_type='team' and c.team_id=game_row.team_id)
      or (c.scope_type='tournament' and c.tournament_public_id=coalesce(game_row.tournament_public_id,series_row.tournament_public_id))
      or (c.scope_type='weekend' and c.series_id=game_row.series_id)
      or (c.scope_type='game' and c.game_id=game_row.id)
    )
    and exists(
      select 1 from public.live_ad_campaign_creatives cc
      join public.live_ad_creatives cr on cr.id=cc.creative_id
      where cc.campaign_id=c.id and cr.advertiser_id=c.advertiser_id
        and cr.status='approved' and cr.youth_safe_approved
        and (
          (placement_value='live.game.banner' and cr.creative_format in ('banner','presenting'))
          or (placement_value='live.recap.interstitial' and cr.creative_format='interstitial')
          or (placement_value='live.weekend.banner' and cr.creative_format in ('banner','presenting'))
        )
    )
  order by
    c.exclusive desc,
    case c.scope_type when 'game' then 70 when 'weekend' then 60 when 'tournament' then 50 when 'team' then 40 when 'organization' then 30 when 'region' then 20 else 10 end desc,
    c.priority desc,
    (-ln(greatest((((('x'||substr(md5(seed||'|'||c.id::text),1,8))::bit(32)::bigint + 1)::numeric)/4294967297::numeric),0.000000001::numeric))/greatest(c.share_of_voice,0.01)) asc,
    c.id
  limit 1;

  if not found then return jsonb_build_object('available',false); end if;

  select cr.* into creative_row
  from public.live_ad_campaign_creatives cc
  join public.live_ad_creatives cr on cr.id=cc.creative_id
  where cc.campaign_id=campaign_row.id
    and cr.advertiser_id=campaign_row.advertiser_id
    and cr.status='approved' and cr.youth_safe_approved
    and (
      (placement_value='live.game.banner' and cr.creative_format in ('banner','presenting'))
      or (placement_value='live.recap.interstitial' and cr.creative_format='interstitial')
      or (placement_value='live.weekend.banner' and cr.creative_format in ('banner','presenting'))
    )
  order by
    (-ln(greatest((((('x'||substr(md5(seed||'|'||campaign_row.id::text||'|'||cr.id::text),1,8))::bit(32)::bigint + 1)::numeric)/4294967297::numeric),0.000000001::numeric))/greatest(cc.weight,1)) asc,
    cr.id
  limit 1;

  if not found then return jsonb_build_object('available',false); end if;

  insert into public.live_ad_delivery_tokens(campaign_id,creative_id,placement,game_id,series_id)
  values(campaign_row.id,creative_row.id,placement_value,game_row.id,game_row.series_id)
  returning token into delivery_token;

  return jsonb_build_object(
    'available',true,
    'token',delivery_token,
    'placement',placement_value,
    'advertiser',jsonb_build_object('id',campaign_row.advertiser_id,'name',(select name from public.live_advertisers where id=campaign_row.advertiser_id)),
    'campaign',jsonb_build_object('id',campaign_row.id,'name',campaign_row.name,'exclusive',campaign_row.exclusive,'eventTier',campaign_row.event_tier),
    'creative',jsonb_build_object(
      'id',creative_row.id,'format',creative_row.creative_format,'assetUrl',creative_row.asset_url,
      'headline',creative_row.headline,'bodyText',creative_row.body_text,'cta',creative_row.cta,'destinationUrl',creative_row.destination_url
    )
  );
end;
$$;
revoke all on function public.live_ad_select_v1(text,uuid,text) from public;
grant execute on function public.live_ad_select_v1(text,uuid,text) to anon,authenticated;

create or replace function public.live_record_ad_delivery_v1(
  delivery_token_value uuid,
  requested_event_type text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  tok public.live_ad_delivery_tokens%rowtype;
  event_value text := lower(trim(coalesce(requested_event_type,'')));
begin
  if event_value not in ('impression','click') then return false; end if;
  select * into tok from public.live_ad_delivery_tokens where token=delivery_token_value for update;
  if tok.token is null or tok.expires_at <= now() then return false; end if;

  if event_value='impression' then
    if tok.impression_recorded_at is not null then return true; end if;
    insert into public.live_ad_delivery_events(delivery_token,event_type,campaign_id,creative_id,placement,game_id,series_id)
    values(tok.token,'impression',tok.campaign_id,tok.creative_id,tok.placement,tok.game_id,tok.series_id)
    on conflict do nothing;
    update public.live_ad_delivery_tokens set impression_recorded_at=coalesce(impression_recorded_at,now()) where token=tok.token;
    insert into public.live_ad_campaign_counters(campaign_id,impressions,clicks,updated_at)
    values(tok.campaign_id,1,0,now())
    on conflict(campaign_id) do update set impressions=public.live_ad_campaign_counters.impressions+1,updated_at=now();
    return true;
  end if;

  if tok.click_recorded_at is not null then return true; end if;
  insert into public.live_ad_delivery_events(delivery_token,event_type,campaign_id,creative_id,placement,game_id,series_id)
  values(tok.token,'click',tok.campaign_id,tok.creative_id,tok.placement,tok.game_id,tok.series_id)
  on conflict do nothing;
  update public.live_ad_delivery_tokens set click_recorded_at=coalesce(click_recorded_at,now()) where token=tok.token;
  insert into public.live_ad_campaign_counters(campaign_id,impressions,clicks,updated_at)
  values(tok.campaign_id,0,1,now())
  on conflict(campaign_id) do update set clicks=public.live_ad_campaign_counters.clicks+1,updated_at=now();
  return true;
end;
$$;
revoke all on function public.live_record_ad_delivery_v1(uuid,text) from public;
grant execute on function public.live_record_ad_delivery_v1(uuid,text) to anon,authenticated;

-- Campaign reporting now uses O(1) counters rather than recounting delivery history.
create or replace function public.live_platform_ad_campaign_reporting_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare rows_json jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'campaignId',c.id,'campaignName',c.name,'advertiserId',a.id,'advertiserName',a.name,
    'status',c.status,'scopeType',c.scope_type,'eventTier',c.event_tier,'exclusive',c.exclusive,
    'shareOfVoice',c.share_of_voice,'commercialModel',c.commercial_model,'contractValueCents',c.contract_value_cents,
    'currency',c.currency,'paymentStatus',c.payment_status,'impressionCap',c.impression_cap,
    'impressions',coalesce(ctr.impressions,0),'clicks',coalesce(ctr.clicks,0),
    'startAt',c.start_at,'endAt',c.end_at,'placements',c.placements
  ) order by c.created_at desc),'[]'::jsonb)
  into rows_json
  from public.live_ad_campaigns c
  join public.live_advertisers a on a.id=c.advertiser_id
  left join public.live_ad_campaign_counters ctr on ctr.campaign_id=c.id;
  return jsonb_build_object('generatedAt',now(),'campaigns',rows_json);
end;
$$;
revoke all on function public.live_platform_ad_campaign_reporting_v1() from public,anon;
grant execute on function public.live_platform_ad_campaign_reporting_v1() to authenticated;

-- ---------------------------------------------------------------------------
-- Platform Owner commercial operations RPCs.
-- ---------------------------------------------------------------------------
create or replace function public.live_ad_admin_snapshot_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  advertisers_json jsonb; creatives_json jsonb; campaigns_json jsonb; orgs_json jsonb; teams_json jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.name),'[]'::jsonb) into advertisers_json from public.live_advertisers a;
  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]'::jsonb) into creatives_json from public.live_ad_creatives c;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'advertiserId',c.advertiser_id,'name',c.name,'status',c.status,'startAt',c.start_at,'endAt',c.end_at,
    'priority',c.priority,'exclusive',c.exclusive,'shareOfVoice',c.share_of_voice,'placements',c.placements,'scopeType',c.scope_type,
    'scopeRegion',c.scope_region,'organizationId',c.organization_id,'teamId',c.team_id,'seriesId',c.series_id,'gameId',c.game_id,
    'tournamentPublicId',c.tournament_public_id,'eventTier',c.event_tier,'commercialModel',c.commercial_model,
    'contractValueCents',c.contract_value_cents,'currency',c.currency,'paymentStatus',c.payment_status,'impressionCap',c.impression_cap,
    'notes',c.notes,'creativeIds',coalesce((select jsonb_agg(cc.creative_id) from public.live_ad_campaign_creatives cc where cc.campaign_id=c.id),'[]'::jsonb)
  ) order by c.created_at desc),'[]'::jsonb) into campaigns_json from public.live_ad_campaigns c;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',coalesce(c.display_name,c.name),'region',c.region,'organizationType',c.organization_type) order by coalesce(c.display_name,c.name)),'[]'::jsonb)
    into orgs_json from public.live_clubs c where c.active=true;
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'organizationId',t.club_id,'name',coalesce(t.display_label,t.name),'season',t.competitive_season) order by coalesce(t.display_label,t.name)),'[]'::jsonb)
    into teams_json from public.live_teams t where t.active=true;
  return jsonb_build_object('advertisers',advertisers_json,'creatives',creatives_json,'campaigns',campaigns_json,'organizations',orgs_json,'teams',teams_json);
end;
$$;
revoke all on function public.live_ad_admin_snapshot_v1() from public,anon;
grant execute on function public.live_ad_admin_snapshot_v1() to authenticated;

create or replace function public.live_ad_admin_save_advertiser_v1(
  target_id uuid,
  advertiser_name text,
  advertiser_slug text,
  advertiser_category text default null,
  advertiser_website text default null,
  advertiser_type_value text default 'direct',
  youth_safe_confirmed boolean default false,
  advertiser_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare result_id uuid; caller uuid:=auth.uid();
begin
  if caller is null or not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;
  if not youth_safe_confirmed then raise exception 'Explicit youth-safe advertiser approval is required'; end if;
  if advertiser_type_value not in ('direct','house') then raise exception 'Invalid advertiser type'; end if;
  if target_id is null then
    insert into public.live_advertisers(name,slug,advertiser_type,category,website_url,status,youth_safe_approved,approved_by,approved_at,notes,created_by)
    values(trim(advertiser_name),trim(advertiser_slug),advertiser_type_value,nullif(trim(coalesce(advertiser_category,'')),''),nullif(trim(coalesce(advertiser_website,'')),''),'approved',true,caller,now(),advertiser_notes,caller)
    returning id into result_id;
  else
    update public.live_advertisers set name=trim(advertiser_name),slug=trim(advertiser_slug),advertiser_type=advertiser_type_value,
      category=nullif(trim(coalesce(advertiser_category,'')),''),website_url=nullif(trim(coalesce(advertiser_website,'')),''),
      status='approved',youth_safe_approved=true,approved_by=caller,approved_at=now(),notes=advertiser_notes,updated_at=now()
    where id=target_id returning id into result_id;
  end if;
  return result_id;
end;
$$;
revoke all on function public.live_ad_admin_save_advertiser_v1(uuid,text,text,text,text,text,boolean,text) from public,anon;
grant execute on function public.live_ad_admin_save_advertiser_v1(uuid,text,text,text,text,text,boolean,text) to authenticated;

create or replace function public.live_ad_admin_save_creative_v1(
  target_id uuid,
  target_advertiser_id uuid,
  creative_name text,
  format_value text,
  asset_url_value text default null,
  headline_value text default null,
  body_value text default null,
  cta_value text default null,
  destination_value text default null,
  youth_safe_confirmed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare result_id uuid; caller uuid:=auth.uid(); advertiser_ok boolean:=false;
begin
  if caller is null or not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;
  if not youth_safe_confirmed then raise exception 'Explicit youth-safe creative approval is required'; end if;
  if format_value not in ('banner','interstitial','presenting') then raise exception 'Invalid creative format'; end if;
  select status='approved' and youth_safe_approved into advertiser_ok from public.live_advertisers where id=target_advertiser_id;
  if not coalesce(advertiser_ok,false) then raise exception 'Advertiser must be approved and youth-safe first'; end if;
  if target_id is null then
    insert into public.live_ad_creatives(advertiser_id,name,creative_format,asset_url,headline,body_text,cta,destination_url,status,youth_safe_approved,approved_by,approved_at,created_by)
    values(target_advertiser_id,trim(creative_name),format_value,nullif(trim(coalesce(asset_url_value,'')),''),nullif(trim(coalesce(headline_value,'')),''),nullif(trim(coalesce(body_value,'')),''),nullif(trim(coalesce(cta_value,'')),''),nullif(trim(coalesce(destination_value,'')),''),'approved',true,caller,now(),caller)
    returning id into result_id;
  else
    update public.live_ad_creatives set advertiser_id=target_advertiser_id,name=trim(creative_name),creative_format=format_value,
      asset_url=nullif(trim(coalesce(asset_url_value,'')),''),headline=nullif(trim(coalesce(headline_value,'')),''),body_text=nullif(trim(coalesce(body_value,'')),''),
      cta=nullif(trim(coalesce(cta_value,'')),''),destination_url=nullif(trim(coalesce(destination_value,'')),''),status='approved',youth_safe_approved=true,
      approved_by=caller,approved_at=now(),updated_at=now()
    where id=target_id returning id into result_id;
  end if;
  return result_id;
end;
$$;
revoke all on function public.live_ad_admin_save_creative_v1(uuid,uuid,text,text,text,text,text,text,text,boolean) from public,anon;
grant execute on function public.live_ad_admin_save_creative_v1(uuid,uuid,text,text,text,text,text,text,text,boolean) to authenticated;

create or replace function public.live_ad_admin_save_campaign_v1(
  target_id uuid,
  target_advertiser_id uuid,
  target_creative_id uuid,
  campaign_name text,
  desired_status text,
  start_value timestamptz,
  end_value timestamptz,
  priority_value integer,
  exclusive_value boolean,
  share_value numeric,
  placements_value text[],
  scope_type_value text,
  region_value text default null,
  organization_value uuid default null,
  team_value uuid default null,
  series_value uuid default null,
  game_value uuid default null,
  tournament_value text default null,
  event_tier_value text default 'standard',
  commercial_model_value text default 'flat',
  contract_value_cents_value bigint default null,
  payment_status_value text default 'quoted',
  impression_cap_value bigint default null,
  notes_value text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare result_id uuid; caller uuid:=auth.uid();
begin
  if caller is null or not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;
  if desired_status not in ('draft','scheduled','active','paused','completed','cancelled') then raise exception 'Invalid campaign status'; end if;
  if scope_type_value not in ('platform','region','organization','team','tournament','weekend','game') then raise exception 'Invalid scope'; end if;
  if event_tier_value not in ('friendly','local','standard','major','flagship') then raise exception 'Invalid event tier'; end if;
  if commercial_model_value not in ('flat','cpm','monthly','takeover','house') then raise exception 'Invalid commercial model'; end if;
  if payment_status_value not in ('not_applicable','quoted','invoiced','paid','waived','refunded','past_due') then raise exception 'Invalid payment status'; end if;
  if cardinality(coalesce(placements_value,'{}'::text[]))=0 then raise exception 'At least one placement is required'; end if;
  if not exists(select 1 from public.live_ad_creatives cr where cr.id=target_creative_id and cr.advertiser_id=target_advertiser_id and cr.status='approved' and cr.youth_safe_approved) then
    raise exception 'Approved youth-safe creative for this advertiser is required';
  end if;

  if target_id is null then
    insert into public.live_ad_campaigns(advertiser_id,name,status,start_at,end_at,priority,exclusive,share_of_voice,placements,scope_type,scope_region,organization_id,team_id,series_id,game_id,tournament_public_id,event_tier,commercial_model,contract_value_cents,currency,payment_status,impression_cap,notes,created_by)
    values(target_advertiser_id,trim(campaign_name),'draft',start_value,end_value,coalesce(priority_value,50),coalesce(exclusive_value,false),coalesce(share_value,100),placements_value,scope_type_value,
      case when scope_type_value='region' then nullif(trim(coalesce(region_value,'')),'') else null end,
      case when scope_type_value='organization' then organization_value else null end,
      case when scope_type_value='team' then team_value else null end,
      case when scope_type_value='weekend' then series_value else null end,
      case when scope_type_value='game' then game_value else null end,
      case when scope_type_value='tournament' then nullif(trim(coalesce(tournament_value,'')),'') else null end,
      event_tier_value,commercial_model_value,contract_value_cents_value,'USD',payment_status_value,impression_cap_value,notes_value,caller)
    returning id into result_id;
  else
    update public.live_ad_campaigns set advertiser_id=target_advertiser_id,name=trim(campaign_name),status='draft',start_at=start_value,end_at=end_value,
      priority=coalesce(priority_value,50),exclusive=coalesce(exclusive_value,false),share_of_voice=coalesce(share_value,100),placements=placements_value,scope_type=scope_type_value,
      scope_region=case when scope_type_value='region' then nullif(trim(coalesce(region_value,'')),'') else null end,
      organization_id=case when scope_type_value='organization' then organization_value else null end,
      team_id=case when scope_type_value='team' then team_value else null end,
      series_id=case when scope_type_value='weekend' then series_value else null end,
      game_id=case when scope_type_value='game' then game_value else null end,
      tournament_public_id=case when scope_type_value='tournament' then nullif(trim(coalesce(tournament_value,'')),'') else null end,
      event_tier=event_tier_value,commercial_model=commercial_model_value,contract_value_cents=contract_value_cents_value,payment_status=payment_status_value,
      impression_cap=impression_cap_value,notes=notes_value,updated_at=now()
    where id=target_id returning id into result_id;
    delete from public.live_ad_campaign_creatives where campaign_id=result_id;
  end if;

  insert into public.live_ad_campaign_creatives(campaign_id,creative_id,weight) values(result_id,target_creative_id,1)
  on conflict(campaign_id,creative_id) do update set weight=excluded.weight;
  update public.live_ad_campaigns set status=desired_status,updated_at=now() where id=result_id;
  return result_id;
end;
$$;
revoke all on function public.live_ad_admin_save_campaign_v1(uuid,uuid,uuid,text,text,timestamptz,timestamptz,integer,boolean,numeric,text[],text,text,uuid,uuid,uuid,uuid,text,text,text,bigint,text,bigint,text) from public,anon;
grant execute on function public.live_ad_admin_save_campaign_v1(uuid,uuid,uuid,text,text,timestamptz,timestamptz,integer,boolean,numeric,text[],text,text,uuid,uuid,uuid,uuid,text,text,text,bigint,text,bigint,text) to authenticated;

comment on function public.live_organization_insights_overview_v1(uuid,text) is
  'Organization Insights: entitlement-protected cross-team season/event/player analytics derived only from current finalized game analytics.';
comment on function public.live_ad_select_v1(text,uuid,text) is
  'Youth-safe direct ad selector. Context comes from canonical game records; selection never uses viewer identity or behavioral data.';
comment on function public.live_record_ad_delivery_v1(uuid,text) is
  'One-token/one-event privacy-minimized impression/click accounting. Stores no user ID, email, address, card data or IP.';
