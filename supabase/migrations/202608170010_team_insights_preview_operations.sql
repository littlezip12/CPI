-- WPI 7.63.7 — Promotional Access & Adoption Operations
-- Platform Owner operational controls for no-card Team Insights previews.
-- This release does not activate Stripe or collect payment. Promotions are time-bounded,
-- require existing team/follower context, and automatically stop granting analytics when ends_at passes.

create or replace function public.live_team_insights_preview_admin_snapshot_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  promotions_json jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,
    'label',p.label,
    'scopeType',p.scope_type,
    'organizationId',p.organization_id,
    'organizationName',coalesce(c.display_name,c.name),
    'teamId',p.team_id,
    'teamName',coalesce(t.display_label,t.name),
    'referenceSeriesId',p.reference_series_id,
    'referenceSeriesName',s.name,
    'startsAt',p.starts_at,
    'endsAt',p.ends_at,
    'status',p.status,
    'displayStatus',case
      when p.status='active' and p.ends_at <= now() then 'expired'
      when p.status='active' and p.starts_at > now() then 'scheduled'
      else p.status
    end,
    'noPaymentMethodRequired',p.no_payment_method_required,
    'createdAt',p.created_at,
    'updatedAt',p.updated_at
  ) order by
    case when p.status='active' and p.ends_at > now() then 0 else 1 end,
    p.ends_at desc,p.created_at desc),'[]'::jsonb)
  into promotions_json
  from public.live_team_insights_promotions p
  left join public.live_clubs c on c.id=p.organization_id
  left join public.live_teams t on t.id=p.team_id
  left join public.live_game_series s on s.id=p.reference_series_id;

  return jsonb_build_object('promotions',promotions_json);
end;
$$;

revoke all on function public.live_team_insights_preview_admin_snapshot_v1() from public,anon;
grant execute on function public.live_team_insights_preview_admin_snapshot_v1() to authenticated;

create or replace function public.live_team_insights_preview_series_v1(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  series_json jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;
  if not exists(select 1 from public.live_teams t where t.id=target_team_id and t.active=true) then
    raise exception 'Active team not found';
  end if;

  select coalesce(jsonb_agg(row_data order by coalesce((row_data->>'lastGameAt')::timestamptz,(row_data->>'createdAt')::timestamptz) desc),'[]'::jsonb)
  into series_json
  from (
    select jsonb_build_object(
      'id',s.id,
      'teamId',s.team_id,
      'name',s.name,
      'seriesType',s.series_type,
      'season',s.competitive_season,
      'tournamentPublicId',s.tournament_public_id,
      'gameCount',count(g.id),
      'firstGameAt',min(g.scheduled_at),
      'lastGameAt',max(coalesce(g.ended_at,g.scheduled_at)),
      'createdAt',s.created_at
    ) as row_data
    from public.live_game_series s
    left join public.live_games g on g.series_id=s.id and g.status<>'cancelled'
    where s.team_id=target_team_id
    group by s.id
    order by max(coalesce(g.ended_at,g.scheduled_at)) desc nulls last,s.created_at desc
    limit 100
  ) q;
  return series_json;
end;
$$;

revoke all on function public.live_team_insights_preview_series_v1(uuid) from public,anon;
grant execute on function public.live_team_insights_preview_series_v1(uuid) to authenticated;

create or replace function public.live_team_insights_preview_admin_save_v1(
  target_id uuid,
  preview_label text,
  scope_type_value text,
  organization_value uuid default null,
  team_value uuid default null,
  reference_series_value uuid default null,
  starts_value timestamptz default now(),
  ends_value timestamptz default null,
  desired_status text default 'active'
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid:=auth.uid();
  result_id uuid;
  series_team uuid;
begin
  if caller is null or not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;
  if nullif(trim(coalesce(preview_label,'')),'') is null then raise exception 'Preview name is required'; end if;
  if scope_type_value not in ('platform','organization','team') then raise exception 'Invalid preview scope'; end if;
  if desired_status not in ('active','paused') then raise exception 'Invalid preview status'; end if;
  if starts_value is null or ends_value is null or ends_value <= starts_value then raise exception 'Preview end must be after start'; end if;
  if desired_status='active' and ends_value <= now() then raise exception 'An active preview must end in the future'; end if;

  if scope_type_value='platform' then
    organization_value:=null; team_value:=null; reference_series_value:=null;
  elsif scope_type_value='organization' then
    if organization_value is null or not exists(select 1 from public.live_clubs c where c.id=organization_value and c.active=true) then
      raise exception 'Active organization is required';
    end if;
    team_value:=null; reference_series_value:=null;
  elsif scope_type_value='team' then
    if team_value is null or not exists(select 1 from public.live_teams t where t.id=team_value and t.active=true) then
      raise exception 'Active team is required';
    end if;
    organization_value:=null;
    if reference_series_value is not null then
      select s.team_id into series_team from public.live_game_series s where s.id=reference_series_value;
      if series_team is null or series_team<>team_value then raise exception 'Event/weekend reference must belong to the selected team'; end if;
    end if;
  end if;

  if target_id is null then
    insert into public.live_team_insights_promotions(
      label,product_code,scope_type,organization_id,team_id,reference_series_id,
      starts_at,ends_at,status,no_payment_method_required,created_by
    ) values(
      trim(preview_label),'team_insights',scope_type_value,organization_value,team_value,reference_series_value,
      starts_value,ends_value,desired_status,true,caller
    ) returning id into result_id;
  else
    update public.live_team_insights_promotions p set
      label=trim(preview_label),scope_type=scope_type_value,organization_id=organization_value,
      team_id=team_value,reference_series_id=reference_series_value,starts_at=starts_value,
      ends_at=ends_value,status=desired_status,no_payment_method_required=true,updated_at=now()
    where p.id=target_id
    returning p.id into result_id;
    if result_id is null then raise exception 'Preview not found'; end if;
  end if;
  return result_id;
end;
$$;

revoke all on function public.live_team_insights_preview_admin_save_v1(uuid,text,text,uuid,uuid,uuid,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.live_team_insights_preview_admin_save_v1(uuid,text,text,uuid,uuid,uuid,timestamptz,timestamptz,text) to authenticated;

create or replace function public.live_team_insights_preview_admin_set_status_v1(
  target_promotion_id uuid,
  desired_status text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid:=auth.uid();
  promo public.live_team_insights_promotions%rowtype;
begin
  if caller is null or not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;
  if desired_status not in ('active','paused','canceled') then raise exception 'Invalid preview status'; end if;
  select * into promo from public.live_team_insights_promotions p where p.id=target_promotion_id for update;
  if promo.id is null then raise exception 'Preview not found'; end if;
  if desired_status='active' and promo.ends_at <= now() then raise exception 'This preview has ended. Edit the dates before reactivating it.'; end if;
  update public.live_team_insights_promotions p set status=desired_status,updated_at=now() where p.id=target_promotion_id;
end;
$$;

revoke all on function public.live_team_insights_preview_admin_set_status_v1(uuid,text) from public,anon;
grant execute on function public.live_team_insights_preview_admin_set_status_v1(uuid,text) to authenticated;

comment on function public.live_team_insights_preview_admin_snapshot_v1() is
  '7.63.7 Platform Owner preview operations snapshot. Contains no user email, payment method, card, address, or other purchaser PII.';
comment on function public.live_team_insights_preview_admin_save_v1(uuid,text,text,uuid,uuid,uuid,timestamptz,timestamptz,text) is
  '7.63.7 schedules no-card Team Insights preview windows. Expiration is enforced dynamically by ends_at; no surprise billing or automatic subscription occurs.';
