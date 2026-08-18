-- WPI 7.63.6 — Sponsorship Validation & Event Inventory
-- Completes the direct-sponsorship validation loop without enabling any third-party ad network.
-- Adds a free Supporter event/weekend result surface, series-aware banner selection,
-- O(1) placement counters, and an owner-controlled WPI house validation campaign.

-- ---------------------------------------------------------------------------
-- Free Supporter tournament/weekend summaries. No player analytics are exposed.
-- ---------------------------------------------------------------------------
create or replace function public.live_following_event_summaries_v1()
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

  select coalesce(jsonb_agg(row_data order by latest_at desc),'[]'::jsonb)
  into rows_json
  from (
    select
      max(coalesce(g.ended_at,g.scheduled_at,g.updated_at,g.created_at)) as latest_at,
      jsonb_build_object(
        'seriesId',s.id,
        'seriesName',s.name,
        'seriesType',s.series_type,
        'tournamentPublicId',s.tournament_public_id,
        'competitiveSeason',s.competitive_season,
        'teamId',t.id,
        'teamName',t.name,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'organizationId',c.id,
        'organizationName',coalesce(nullif(trim(c.display_name),''),c.name),
        'logoUrl',c.logo_url,
        'games',count(*) filter (where g.status='final'),
        'wins',count(*) filter (where g.status='final' and coalesce(g.team_score,0)>coalesce(g.opponent_score,0)),
        'losses',count(*) filter (where g.status='final' and coalesce(g.team_score,0)<coalesce(g.opponent_score,0)),
        'ties',count(*) filter (where g.status='final' and coalesce(g.team_score,0)=coalesce(g.opponent_score,0)),
        'goalsFor',coalesce(sum(g.team_score) filter (where g.status='final'),0),
        'goalsAgainst',coalesce(sum(g.opponent_score) filter (where g.status='final'),0),
        'latestAt',max(coalesce(g.ended_at,g.scheduled_at,g.updated_at,g.created_at))
      ) as row_data
    from public.live_game_series s
    join public.live_teams t on t.id=s.team_id
    join public.live_clubs c on c.id=t.club_id
    join public.live_games g on g.series_id=s.id and g.status<>'cancelled'
    where (
      exists(select 1 from public.live_team_members m where m.team_id=t.id and m.user_id=caller)
      or public.live_is_team_follower(t.id)
    )
      and coalesce(g.ended_at,g.scheduled_at,g.updated_at,g.created_at) >= now()-interval '180 days'
    group by s.id,s.name,s.series_type,s.tournament_public_id,s.competitive_season,
             t.id,t.name,t.display_label,c.id,c.display_name,c.name,c.logo_url
    order by max(coalesce(g.ended_at,g.scheduled_at,g.updated_at,g.created_at)) desc
    limit 24
  ) q;

  return jsonb_build_object('generatedAt',now(),'events',rows_json);
end;
$$;
revoke all on function public.live_following_event_summaries_v1() from public,anon;
grant execute on function public.live_following_event_summaries_v1() to authenticated;

create or replace function public.live_supporter_event_summary_v1(
  target_team_id uuid,
  target_series_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  series_row public.live_game_series%rowtype;
  team_row public.live_teams%rowtype;
  org_row public.live_clubs%rowtype;
  games_json jsonb := '[]'::jsonb;
  analytics_level text := 'none';
  member_role public.live_team_role;
  final_games integer := 0;
  wins integer := 0;
  losses integer := 0;
  ties integer := 0;
  gf bigint := 0;
  ga bigint := 0;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into series_row from public.live_game_series where id=target_series_id and team_id=target_team_id;
  if series_row.id is null then raise exception 'Event not found'; end if;
  select * into team_row from public.live_teams where id=series_row.team_id;
  select * into org_row from public.live_clubs where id=team_row.club_id;

  if not (
    exists(select 1 from public.live_team_members m where m.team_id=team_row.id and m.user_id=caller)
    or public.live_is_team_follower(team_row.id)
  ) then
    raise exception 'Event access required';
  end if;

  select role into member_role from public.live_team_members where team_id=team_row.id and user_id=caller;
  analytics_level := public.live_analytics_access_level_v1(team_row.id);

  select
    count(*) filter (where g.status='final'),
    count(*) filter (where g.status='final' and coalesce(g.team_score,0)>coalesce(g.opponent_score,0)),
    count(*) filter (where g.status='final' and coalesce(g.team_score,0)<coalesce(g.opponent_score,0)),
    count(*) filter (where g.status='final' and coalesce(g.team_score,0)=coalesce(g.opponent_score,0)),
    coalesce(sum(g.team_score) filter (where g.status='final'),0),
    coalesce(sum(g.opponent_score) filter (where g.status='final'),0)
  into final_games,wins,losses,ties,gf,ga
  from public.live_games g
  where g.series_id=series_row.id and g.status<>'cancelled';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',g.id,
    'status',g.status,
    'opponentName',g.opponent_name,
    'scheduledAt',g.scheduled_at,
    'endedAt',g.ended_at,
    'venue',g.venue,
    'teamScore',g.team_score,
    'opponentScore',g.opponent_score,
    'teamLogoUrl',coalesce(g.team_logo_url,org_row.logo_url),
    'opponentLogoUrl',g.opponent_logo_url,
    'gameKind',g.game_kind,
    'officialStage',g.official_stage,
    'officialGameNumber',g.official_game_number
  ) order by coalesce(g.scheduled_at,g.created_at),g.created_at),'[]'::jsonb)
  into games_json
  from public.live_games g
  where g.series_id=series_row.id and g.status<>'cancelled';

  return jsonb_build_object(
    'series',jsonb_build_object(
      'id',series_row.id,'name',series_row.name,'seriesType',series_row.series_type,
      'competitiveSeason',series_row.competitive_season,'tournamentPublicId',series_row.tournament_public_id
    ),
    'team',jsonb_build_object(
      'id',team_row.id,'name',team_row.name,'displayLabel',coalesce(nullif(trim(team_row.display_label),''),team_row.name),
      'organizationId',org_row.id,'organizationName',coalesce(nullif(trim(org_row.display_name),''),org_row.name),
      'logoUrl',org_row.logo_url
    ),
    'summary',jsonb_build_object(
      'games',final_games,'wins',wins,'losses',losses,'ties',ties,
      'goalsFor',gf,'goalsAgainst',ga,'goalDifferential',gf-ga
    ),
    'games',games_json,
    'viewer',jsonb_build_object(
      'analyticsLevel',analytics_level,'role',member_role,
      'adFree',coalesce(member_role in ('owner','admin','scorer'),false) or analytics_level in ('team_insights','organization_insights')
    )
  );
end;
$$;
revoke all on function public.live_supporter_event_summary_v1(uuid,uuid) from public,anon;
grant execute on function public.live_supporter_event_summary_v1(uuid,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Series-aware direct ad selection. Existing v1 remains for compatibility.
-- ---------------------------------------------------------------------------
create or replace function public.live_ad_select_v2(
  requested_placement text,
  target_game_id uuid default null,
  target_series_id uuid default null,
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
    if game_row.id is null then return jsonb_build_object('available',false); end if;
    select * into team_row from public.live_teams where id=game_row.team_id;
    if game_row.series_id is not null then select * into series_row from public.live_game_series where id=game_row.series_id; end if;
  elsif target_series_id is not null then
    select * into series_row from public.live_game_series where id=target_series_id;
    if series_row.id is null then return jsonb_build_object('available',false); end if;
    select * into team_row from public.live_teams where id=series_row.team_id;
  else
    return jsonb_build_object('available',false);
  end if;

  if team_row.club_id is not null then select * into org_row from public.live_clubs where id=team_row.club_id; end if;
  seed := coalesce(target_game_id::text,'no-game') || '|' || coalesce(series_row.id::text,target_series_id::text,'no-series') || '|' || placement_value || '|' || coalesce(rotation_key,'default');

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
      or (c.scope_type='team' and c.team_id=team_row.id)
      or (c.scope_type='tournament' and c.tournament_public_id=coalesce(game_row.tournament_public_id,series_row.tournament_public_id))
      or (c.scope_type='weekend' and c.series_id=series_row.id)
      or (c.scope_type='game' and game_row.id is not null and c.game_id=game_row.id)
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

  if campaign_row.id is null then return jsonb_build_object('available',false); end if;

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

  if creative_row.id is null then return jsonb_build_object('available',false); end if;

  insert into public.live_ad_delivery_tokens(campaign_id,creative_id,placement,game_id,series_id)
  values(campaign_row.id,creative_row.id,placement_value,game_row.id,coalesce(series_row.id,target_series_id))
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
revoke all on function public.live_ad_select_v2(text,uuid,uuid,text) from public;
grant execute on function public.live_ad_select_v2(text,uuid,uuid,text) to anon,authenticated;

-- ---------------------------------------------------------------------------
-- O(1) placement counters for operational validation/reporting.
-- ---------------------------------------------------------------------------
create table if not exists public.live_ad_campaign_placement_counters (
  campaign_id uuid not null references public.live_ad_campaigns(id) on delete cascade,
  placement text not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key(campaign_id,placement)
);
alter table public.live_ad_campaign_placement_counters enable row level security;
revoke all on public.live_ad_campaign_placement_counters from anon,authenticated;
drop policy if exists live_ad_campaign_placement_counters_platform_owner_only on public.live_ad_campaign_placement_counters;
create policy live_ad_campaign_placement_counters_platform_owner_only on public.live_ad_campaign_placement_counters
  for select to authenticated using (public.live_is_platform_owner());

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
    insert into public.live_ad_campaign_placement_counters(campaign_id,placement,impressions,clicks,updated_at)
    values(tok.campaign_id,tok.placement,1,0,now())
    on conflict(campaign_id,placement) do update set impressions=public.live_ad_campaign_placement_counters.impressions+1,updated_at=now();
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
  insert into public.live_ad_campaign_placement_counters(campaign_id,placement,impressions,clicks,updated_at)
  values(tok.campaign_id,tok.placement,0,1,now())
  on conflict(campaign_id,placement) do update set clicks=public.live_ad_campaign_placement_counters.clicks+1,updated_at=now();
  return true;
end;
$$;
revoke all on function public.live_record_ad_delivery_v1(uuid,text) from public;
grant execute on function public.live_record_ad_delivery_v1(uuid,text) to anon,authenticated;

create or replace function public.live_platform_ad_campaign_reporting_v2()
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
    'advertiserType',a.advertiser_type,
    'status',c.status,'scopeType',c.scope_type,'eventTier',c.event_tier,'exclusive',c.exclusive,
    'shareOfVoice',c.share_of_voice,'commercialModel',c.commercial_model,'contractValueCents',c.contract_value_cents,
    'currency',c.currency,'paymentStatus',c.payment_status,'impressionCap',c.impression_cap,
    'impressions',coalesce(ctr.impressions,0),'clicks',coalesce(ctr.clicks,0),
    'placementMetrics',coalesce((
      select jsonb_object_agg(pc.placement,jsonb_build_object('impressions',pc.impressions,'clicks',pc.clicks))
      from public.live_ad_campaign_placement_counters pc where pc.campaign_id=c.id
    ),'{}'::jsonb),
    'startAt',c.start_at,'endAt',c.end_at,'placements',c.placements
  ) order by c.created_at desc),'[]'::jsonb)
  into rows_json
  from public.live_ad_campaigns c
  join public.live_advertisers a on a.id=c.advertiser_id
  left join public.live_ad_campaign_counters ctr on ctr.campaign_id=c.id;
  return jsonb_build_object('generatedAt',now(),'campaigns',rows_json);
end;
$$;
revoke all on function public.live_platform_ad_campaign_reporting_v2() from public,anon;
grant execute on function public.live_platform_ad_campaign_reporting_v2() to authenticated;

-- ---------------------------------------------------------------------------
-- Owner-controlled WPI house validation. Migration itself activates nothing.
-- ---------------------------------------------------------------------------
create or replace function public.live_ad_admin_provision_house_validation_v1()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  house_advertiser_id uuid;
  banner_id uuid;
  interstitial_id uuid;
  campaign_id uuid;
begin
  if caller is null or not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;

  insert into public.live_advertisers(
    name,slug,advertiser_type,category,website_url,status,youth_safe_approved,approved_by,approved_at,notes,created_by
  ) values(
    'Water Polo Index','wpi-house','house','WPI product','https://littlezip12.github.io/CPI/','approved',true,caller,now(),
    'WPI-owned youth-safe house inventory for validating direct sponsorship delivery.',caller
  )
  on conflict(slug) do update set
    name='Water Polo Index',advertiser_type='house',category='WPI product',status='approved',youth_safe_approved=true,
    approved_by=caller,approved_at=now(),updated_at=now()
  returning id into house_advertiser_id;

  select id into banner_id from public.live_ad_creatives where advertiser_id=house_advertiser_id and name='WPI Team Insights Banner' order by created_at limit 1;
  if banner_id is null then
    insert into public.live_ad_creatives(advertiser_id,name,creative_format,asset_url,headline,body_text,cta,destination_url,status,youth_safe_approved,approved_by,approved_at,created_by)
    values(house_advertiser_id,'WPI Team Insights Banner','banner','assets/branding/wpi-logo-mark.png','Unlock Team Insights','Game, weekend and season analytics for your team.','Explore Team Insights','live-team-insights.html','approved',true,caller,now(),caller)
    returning id into banner_id;
  else
    update public.live_ad_creatives set creative_format='banner',asset_url='assets/branding/wpi-logo-mark.png',headline='Unlock Team Insights',
      body_text='Game, weekend and season analytics for your team.',cta='Explore Team Insights',destination_url='live-team-insights.html',status='approved',
      youth_safe_approved=true,approved_by=caller,approved_at=now(),updated_at=now() where id=banner_id;
  end if;

  select id into interstitial_id from public.live_ad_creatives where advertiser_id=house_advertiser_id and name='WPI Team Insights Recap' order by created_at limit 1;
  if interstitial_id is null then
    insert into public.live_ad_creatives(advertiser_id,name,creative_format,asset_url,headline,body_text,cta,destination_url,status,youth_safe_approved,approved_by,approved_at,created_by)
    values(house_advertiser_id,'WPI Team Insights Recap','interstitial','assets/branding/wpi-logo-mark.png','Want the full story?','Team Insights adds player production, comparisons, weekend totals and season analytics.','Explore Team Insights','live-team-insights.html','approved',true,caller,now(),caller)
    returning id into interstitial_id;
  else
    update public.live_ad_creatives set creative_format='interstitial',asset_url='assets/branding/wpi-logo-mark.png',headline='Want the full story?',
      body_text='Team Insights adds player production, comparisons, weekend totals and season analytics.',cta='Explore Team Insights',destination_url='live-team-insights.html',status='approved',
      youth_safe_approved=true,approved_by=caller,approved_at=now(),updated_at=now() where id=interstitial_id;
  end if;

  select c.id into campaign_id from public.live_ad_campaigns c where c.advertiser_id=house_advertiser_id and c.name='WPI House Validation' order by c.created_at limit 1;
  if campaign_id is null then
    insert into public.live_ad_campaigns(
      advertiser_id,name,status,start_at,end_at,priority,exclusive,share_of_voice,placements,scope_type,
      event_tier,commercial_model,contract_value_cents,currency,payment_status,impression_cap,notes,created_by
    ) values(
      house_advertiser_id,'WPI House Validation','active',now(),now()+interval '24 hours',5,false,100,
      array['live.game.banner','live.recap.interstitial','live.weekend.banner']::text[],'platform',
      'standard','house',0,'USD','not_applicable',500,
      'Owner-activated validation campaign. Safe to pause at any time; never created automatically by migration.',caller
    ) returning id into campaign_id;
  else
    update public.live_ad_campaigns set status='active',start_at=now(),end_at=now()+interval '24 hours',priority=5,exclusive=false,share_of_voice=100,
      placements=array['live.game.banner','live.recap.interstitial','live.weekend.banner']::text[],scope_type='platform',scope_region=null,
      organization_id=null,team_id=null,series_id=null,game_id=null,tournament_public_id=null,event_tier='standard',commercial_model='house',
      contract_value_cents=0,payment_status='not_applicable',impression_cap=500,updated_at=now()
    where id=campaign_id;
  end if;

  insert into public.live_ad_campaign_creatives(campaign_id,creative_id,weight) values(campaign_id,banner_id,1)
  on conflict(campaign_id,creative_id) do update set weight=excluded.weight;
  insert into public.live_ad_campaign_creatives(campaign_id,creative_id,weight) values(campaign_id,interstitial_id,1)
  on conflict(campaign_id,creative_id) do update set weight=excluded.weight;

  return jsonb_build_object('campaignId',campaign_id,'advertiserId',house_advertiser_id,'bannerCreativeId',banner_id,
    'interstitialCreativeId',interstitial_id,'status','active','endsAt',now()+interval '24 hours');
end;
$$;
revoke all on function public.live_ad_admin_provision_house_validation_v1() from public,anon;
grant execute on function public.live_ad_admin_provision_house_validation_v1() to authenticated;

create or replace function public.live_ad_admin_set_campaign_status_v1(
  target_campaign_id uuid,
  desired_status text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare caller uuid:=auth.uid(); status_value text:=lower(trim(coalesce(desired_status,'')));
begin
  if caller is null or not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;
  if status_value not in ('active','paused','completed','cancelled') then raise exception 'Unsupported campaign status'; end if;
  update public.live_ad_campaigns
  set status=status_value,
      start_at=case when status_value='active' and (start_at is null or start_at>now()) then now() else start_at end,
      end_at=case when status_value='active' and (end_at is null or end_at<=now()) then now()+interval '24 hours' else end_at end,
      updated_at=now()
  where id=target_campaign_id;
  return found;
end;
$$;
revoke all on function public.live_ad_admin_set_campaign_status_v1(uuid,text) from public,anon;
grant execute on function public.live_ad_admin_set_campaign_status_v1(uuid,text) to authenticated;
