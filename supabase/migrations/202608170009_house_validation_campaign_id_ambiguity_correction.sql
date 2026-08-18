-- WPI 7.63.6 correction: remove PL/pgSQL campaign_id/table-column ambiguity
-- from the owner-controlled WPI House Validation provisioning RPC.
-- Required for databases where 202608170007 and 202608170008 were already applied.

create or replace function public.live_ad_admin_provision_house_validation_v1()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_caller uuid := auth.uid();
  v_house_advertiser_id uuid;
  v_banner_id uuid;
  v_interstitial_id uuid;
  v_house_campaign_id uuid;
begin
  if v_caller is null or not public.live_is_platform_owner() then
    raise exception 'Platform Owner access required';
  end if;

  insert into public.live_advertisers(
    name,slug,advertiser_type,category,website_url,status,youth_safe_approved,approved_by,approved_at,notes,created_by
  ) values(
    'Water Polo Index','wpi-house','house','WPI product','https://littlezip12.github.io/CPI/','approved',true,v_caller,now(),
    'WPI-owned youth-safe house inventory for validating direct sponsorship delivery.',v_caller
  )
  on conflict(slug) do update set
    name='Water Polo Index',advertiser_type='house',category='WPI product',status='approved',youth_safe_approved=true,
    approved_by=v_caller,approved_at=now(),updated_at=now()
  returning public.live_advertisers.id into v_house_advertiser_id;

  select cr.id into v_banner_id
  from public.live_ad_creatives cr
  where cr.advertiser_id=v_house_advertiser_id and cr.name='WPI Team Insights Banner'
  order by cr.created_at limit 1;

  if v_banner_id is null then
    insert into public.live_ad_creatives(
      advertiser_id,name,creative_format,asset_url,headline,body_text,cta,destination_url,status,youth_safe_approved,approved_by,approved_at,created_by
    ) values(
      v_house_advertiser_id,'WPI Team Insights Banner','banner','assets/branding/wpi-logo-mark.png','Unlock Team Insights',
      'Game, weekend and season analytics for your team.','Explore Team Insights','live-team-insights.html','approved',true,v_caller,now(),v_caller
    ) returning public.live_ad_creatives.id into v_banner_id;
  else
    update public.live_ad_creatives cr set
      creative_format='banner',asset_url='assets/branding/wpi-logo-mark.png',headline='Unlock Team Insights',
      body_text='Game, weekend and season analytics for your team.',cta='Explore Team Insights',destination_url='live-team-insights.html',
      status='approved',youth_safe_approved=true,approved_by=v_caller,approved_at=now(),updated_at=now()
    where cr.id=v_banner_id;
  end if;

  select cr.id into v_interstitial_id
  from public.live_ad_creatives cr
  where cr.advertiser_id=v_house_advertiser_id and cr.name='WPI Team Insights Recap'
  order by cr.created_at limit 1;

  if v_interstitial_id is null then
    insert into public.live_ad_creatives(
      advertiser_id,name,creative_format,asset_url,headline,body_text,cta,destination_url,status,youth_safe_approved,approved_by,approved_at,created_by
    ) values(
      v_house_advertiser_id,'WPI Team Insights Recap','interstitial','assets/branding/wpi-logo-mark.png','Want the full story?',
      'Team Insights adds player production, comparisons, weekend totals and season analytics.','Explore Team Insights',
      'live-team-insights.html','approved',true,v_caller,now(),v_caller
    ) returning public.live_ad_creatives.id into v_interstitial_id;
  else
    update public.live_ad_creatives cr set
      creative_format='interstitial',asset_url='assets/branding/wpi-logo-mark.png',headline='Want the full story?',
      body_text='Team Insights adds player production, comparisons, weekend totals and season analytics.',cta='Explore Team Insights',
      destination_url='live-team-insights.html',status='approved',youth_safe_approved=true,approved_by=v_caller,approved_at=now(),updated_at=now()
    where cr.id=v_interstitial_id;
  end if;

  select c.id into v_house_campaign_id
  from public.live_ad_campaigns c
  where c.advertiser_id=v_house_advertiser_id and c.name='WPI House Validation'
  order by c.created_at limit 1;

  if v_house_campaign_id is null then
    insert into public.live_ad_campaigns(
      advertiser_id,name,status,start_at,end_at,priority,exclusive,share_of_voice,placements,scope_type,
      event_tier,commercial_model,contract_value_cents,currency,payment_status,impression_cap,notes,created_by
    ) values(
      v_house_advertiser_id,'WPI House Validation','draft',now(),now()+interval '24 hours',5,false,100,
      array['live.game.banner','live.recap.interstitial','live.weekend.banner']::text[],'platform',
      'standard','house',0,'USD','not_applicable',500,
      'Owner-activated validation campaign. Safe to pause at any time; never created automatically by migration.',v_caller
    ) returning public.live_ad_campaigns.id into v_house_campaign_id;
  else
    update public.live_ad_campaigns c set
      status='paused',start_at=now(),end_at=now()+interval '24 hours',priority=5,exclusive=false,share_of_voice=100,
      placements=array['live.game.banner','live.recap.interstitial','live.weekend.banner']::text[],scope_type='platform',scope_region=null,
      organization_id=null,team_id=null,series_id=null,game_id=null,tournament_public_id=null,event_tier='standard',commercial_model='house',
      contract_value_cents=0,payment_status='not_applicable',impression_cap=500,updated_at=now()
    where c.id=v_house_campaign_id;
  end if;

  insert into public.live_ad_campaign_creatives(campaign_id,creative_id,weight)
  values(v_house_campaign_id,v_banner_id,1)
  on conflict(campaign_id,creative_id) do update set weight=excluded.weight;

  insert into public.live_ad_campaign_creatives(campaign_id,creative_id,weight)
  values(v_house_campaign_id,v_interstitial_id,1)
  on conflict(campaign_id,creative_id) do update set weight=excluded.weight;

  update public.live_ad_campaigns c
  set status='active',updated_at=now()
  where c.id=v_house_campaign_id;

  return jsonb_build_object(
    'campaignId',v_house_campaign_id,
    'advertiserId',v_house_advertiser_id,
    'bannerCreativeId',v_banner_id,
    'interstitialCreativeId',v_interstitial_id,
    'status','active',
    'endsAt',now()+interval '24 hours'
  );
end;
$$;

revoke all on function public.live_ad_admin_provision_house_validation_v1() from public,anon;
grant execute on function public.live_ad_admin_provision_house_validation_v1() to authenticated;
