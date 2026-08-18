-- WPI 7.63.4 — Promotional Access & Billing Readiness
-- Builds the no-card promotional preview model and Stripe-ready subscription ledger.
-- Checkout remains PREVIEW/OFF until the business, Stripe account, prices, secrets,
-- legal pages, and production host are ready. WPI never stores card numbers/CVV.

-- ---------------------------------------------------------------------------
-- Promotional Team Insights windows
-- ---------------------------------------------------------------------------
create table if not exists public.live_team_insights_promotions (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(trim(label)) between 1 and 160),
  product_code text not null default 'team_insights' references public.live_subscription_products(product_code),
  scope_type text not null check (scope_type in ('platform','organization','team')),
  organization_id uuid references public.live_clubs(id) on delete cascade,
  team_id uuid references public.live_teams(id) on delete cascade,
  reference_series_id uuid references public.live_game_series(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active','paused','expired','canceled')),
  no_payment_method_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    (scope_type='platform' and organization_id is null and team_id is null)
    or (scope_type='organization' and organization_id is not null and team_id is null)
    or (scope_type='team' and team_id is not null)
  )
);

create index if not exists live_team_insights_promotions_active_idx
  on public.live_team_insights_promotions(status,starts_at,ends_at,scope_type);
create index if not exists live_team_insights_promotions_team_idx
  on public.live_team_insights_promotions(team_id,status,starts_at,ends_at)
  where team_id is not null;
create index if not exists live_team_insights_promotions_org_idx
  on public.live_team_insights_promotions(organization_id,status,starts_at,ends_at)
  where organization_id is not null;

alter table public.live_team_insights_promotions enable row level security;
revoke all on public.live_team_insights_promotions from anon,authenticated;

drop policy if exists live_team_insights_promotions_platform_manage on public.live_team_insights_promotions;
create policy live_team_insights_promotions_platform_manage
  on public.live_team_insights_promotions
  for all to authenticated
  using (public.live_is_platform_owner())
  with check (public.live_is_platform_owner());

comment on table public.live_team_insights_promotions is
  'No-card Team Insights preview windows. Used for launch tournaments/weekends before paid conversion; access automatically expires at ends_at.';

create or replace function public.live_active_team_insights_promotion_v1(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  target_org uuid;
  promo public.live_team_insights_promotions%rowtype;
  has_team_context boolean := false;
begin
  if caller is null then return null; end if;
  select club_id into target_org from public.live_teams where id=target_team_id and active=true;
  if not found then return null; end if;

  has_team_context := public.live_is_platform_owner()
    or public.live_is_team_follower(target_team_id)
    or exists(select 1 from public.live_team_members m where m.team_id=target_team_id and m.user_id=caller);
  if not has_team_context then return null; end if;

  select p.* into promo
  from public.live_team_insights_promotions p
  where p.product_code='team_insights'
    and p.status='active'
    and p.starts_at <= now()
    and p.ends_at > now()
    and (
      p.scope_type='platform'
      or (p.scope_type='organization' and p.organization_id=target_org)
      or (p.scope_type='team' and p.team_id=target_team_id)
    )
  order by
    case p.scope_type when 'team' then 1 when 'organization' then 2 else 3 end,
    p.ends_at asc,
    p.created_at asc
  limit 1;

  if promo.id is null then return null; end if;
  return jsonb_build_object(
    'id',promo.id,
    'label',promo.label,
    'scopeType',promo.scope_type,
    'organizationId',promo.organization_id,
    'teamId',promo.team_id,
    'referenceSeriesId',promo.reference_series_id,
    'startsAt',promo.starts_at,
    'endsAt',promo.ends_at,
    'noPaymentMethodRequired',promo.no_payment_method_required
  );
end;
$$;

revoke all on function public.live_active_team_insights_promotion_v1(uuid) from public,anon;
grant execute on function public.live_active_team_insights_promotion_v1(uuid) to authenticated;

-- Promotion access is deliberately additive to existing role/paid entitlement logic.
create or replace function public.live_analytics_access_level_v1(target_team_id uuid)
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  target_organization uuid;
  level_value text := 'none';
  active_promo jsonb;
begin
  if caller is null then return 'none'; end if;
  if public.live_is_platform_owner() then return 'organization_insights'; end if;

  select t.club_id into target_organization
  from public.live_teams t
  where t.id=target_team_id;

  if exists(
    select 1 from public.live_analytics_entitlements e
    where e.user_id=caller and e.status='active' and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
      and e.scope_type='platform' and e.entitlement_type='organization_insights'
  ) then return 'organization_insights'; end if;

  if target_organization is not null and exists(
    select 1 from public.live_analytics_entitlements e
    where e.user_id=caller and e.status='active' and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
      and e.scope_type='organization' and e.organization_id=target_organization
      and e.entitlement_type='organization_insights'
  ) then return 'organization_insights'; end if;

  if exists(
    select 1 from public.live_analytics_entitlements e
    where e.user_id=caller and e.status='active' and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
      and (
        (e.scope_type='team' and e.team_id=target_team_id and e.entitlement_type='team_insights')
        or (e.scope_type='organization' and e.organization_id=target_organization and e.entitlement_type='team_insights')
      )
  ) then return 'team_insights'; end if;

  active_promo := public.live_active_team_insights_promotion_v1(target_team_id);
  if active_promo is not null then return 'team_insights'; end if;

  return level_value;
end;
$$;

revoke all on function public.live_analytics_access_level_v1(uuid) from public,anon;
grant execute on function public.live_analytics_access_level_v1(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Stripe-ready billing ledger. No payment credentials live in WPI.
-- ---------------------------------------------------------------------------
alter table public.live_subscription_products
  add column if not exists billing_provider text not null default 'stripe',
  add column if not exists adult_purchaser_required boolean not null default true;

create table if not exists public.live_subscription_prices (
  id uuid primary key default gen_random_uuid(),
  product_code text not null references public.live_subscription_products(product_code) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe')),
  environment text not null check (environment in ('test','live')),
  billing_interval text not null check (billing_interval in ('monthly','annual')),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  unit_amount_cents integer not null check (unit_amount_cents > 0),
  external_price_id text,
  status text not null default 'configured' check (status in ('configured','active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_code,provider,environment,billing_interval),
  unique(provider,environment,external_price_id)
);

insert into public.live_subscription_prices(product_code,provider,environment,billing_interval,currency,unit_amount_cents,status)
values
  ('team_insights','stripe','test','monthly','USD',500,'configured'),
  ('team_insights','stripe','test','annual','USD',5000,'configured'),
  ('team_insights','stripe','live','monthly','USD',500,'configured'),
  ('team_insights','stripe','live','annual','USD',5000,'configured')
on conflict (product_code,provider,environment,billing_interval) do update
set currency=excluded.currency, unit_amount_cents=excluded.unit_amount_cents, updated_at=now();

alter table public.live_subscription_prices enable row level security;
revoke all on public.live_subscription_prices from anon,authenticated;
create policy live_subscription_prices_platform_manage
  on public.live_subscription_prices for all to authenticated
  using (public.live_is_platform_owner()) with check (public.live_is_platform_owner());

create table if not exists public.live_billing_customers (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe')),
  environment text not null check (environment in ('test','live')),
  external_customer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,provider,environment),
  unique(provider,environment,external_customer_id)
);

alter table public.live_billing_customers enable row level security;
revoke all on public.live_billing_customers from anon,authenticated;
create policy live_billing_customers_self_read on public.live_billing_customers
  for select to authenticated using (user_id=auth.uid() or public.live_is_platform_owner());
create policy live_billing_customers_platform_manage on public.live_billing_customers
  for all to authenticated using (public.live_is_platform_owner()) with check (public.live_is_platform_owner());

create table if not exists public.live_billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null references public.live_subscription_products(product_code),
  scope_type text not null default 'team' check (scope_type in ('team')),
  team_id uuid not null references public.live_teams(id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe')),
  environment text not null check (environment in ('test','live')),
  provider_customer_id text not null,
  provider_subscription_id text not null,
  billing_interval text not null check (billing_interval in ('monthly','annual')),
  status text not null check (status in ('incomplete','trialing','active','past_due','unpaid','canceled','paused','incomplete_expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  latest_invoice_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,environment,provider_subscription_id)
);

create index if not exists live_billing_subscriptions_user_team_idx
  on public.live_billing_subscriptions(user_id,team_id,status,updated_at desc);

alter table public.live_billing_subscriptions enable row level security;
revoke all on public.live_billing_subscriptions from anon,authenticated;
create policy live_billing_subscriptions_self_read on public.live_billing_subscriptions
  for select to authenticated using (user_id=auth.uid() or public.live_is_platform_owner());
create policy live_billing_subscriptions_platform_manage on public.live_billing_subscriptions
  for all to authenticated using (public.live_is_platform_owner()) with check (public.live_is_platform_owner());

create table if not exists public.live_billing_events (
  provider text not null default 'stripe' check (provider in ('stripe')),
  environment text not null check (environment in ('test','live')),
  provider_event_id text not null,
  event_type text not null,
  event_created_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  error_message text,
  primary key(provider,environment,provider_event_id)
);

alter table public.live_billing_events enable row level security;
revoke all on public.live_billing_events from anon,authenticated;
create policy live_billing_events_platform_read on public.live_billing_events
  for select to authenticated using (public.live_is_platform_owner());

-- Service-role-only subscription state application. Stripe webhooks are the authority.
create or replace function public.live_apply_team_insights_subscription_v1(
  target_user_id uuid,
  target_team_id uuid,
  provider_environment text,
  provider_customer_id_value text,
  provider_subscription_id_value text,
  billing_interval_value text,
  subscription_status_value text,
  period_start_value timestamptz,
  period_end_value timestamptz,
  cancel_at_period_end_value boolean default false,
  latest_invoice_status_value text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  entitlement_status text;
begin
  if provider_environment not in ('test','live') then raise exception 'Invalid billing environment'; end if;
  if billing_interval_value not in ('monthly','annual') then raise exception 'Invalid billing interval'; end if;
  if subscription_status_value not in ('incomplete','trialing','active','past_due','unpaid','canceled','paused','incomplete_expired') then
    raise exception 'Invalid subscription status';
  end if;

  insert into public.live_billing_customers(user_id,provider,environment,external_customer_id,updated_at)
  values(target_user_id,'stripe',provider_environment,provider_customer_id_value,now())
  on conflict (user_id,provider,environment) do update set
    external_customer_id=excluded.external_customer_id, updated_at=now();

  insert into public.live_billing_subscriptions(
    user_id,product_code,scope_type,team_id,provider,environment,provider_customer_id,provider_subscription_id,
    billing_interval,status,current_period_start,current_period_end,cancel_at_period_end,latest_invoice_status,updated_at
  ) values (
    target_user_id,'team_insights','team',target_team_id,'stripe',provider_environment,provider_customer_id_value,provider_subscription_id_value,
    billing_interval_value,subscription_status_value,period_start_value,period_end_value,coalesce(cancel_at_period_end_value,false),latest_invoice_status_value,now()
  )
  on conflict (provider,environment,provider_subscription_id) do update set
    user_id=excluded.user_id,team_id=excluded.team_id,billing_interval=excluded.billing_interval,status=excluded.status,
    current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,
    cancel_at_period_end=excluded.cancel_at_period_end,latest_invoice_status=excluded.latest_invoice_status,updated_at=now();

  -- Keep access while Stripe is active/trialing or retrying past_due. Revoke when
  -- the subscription is definitively inactive. No card data is ever copied here.
  if subscription_status_value in ('active','trialing','past_due') then
    update public.live_analytics_entitlements
      set status='revoked',updated_at=now()
      where user_id=target_user_id and entitlement_type='team_insights' and scope_type='team'
        and team_id=target_team_id and source='future_billing' and status='active';
    insert into public.live_analytics_entitlements(
      user_id,entitlement_type,scope_type,team_id,source,status,starts_at,ends_at,note,updated_at
    ) values(
      target_user_id,'team_insights','team',target_team_id,'future_billing','active',now(),period_end_value,
      'Stripe Team Insights subscription ' || provider_subscription_id_value,now()
    );
  else
    update public.live_analytics_entitlements
      set status='revoked',updated_at=now()
      where user_id=target_user_id and entitlement_type='team_insights' and scope_type='team'
        and team_id=target_team_id and source='future_billing' and status='active';
  end if;
end;
$$;

revoke all on function public.live_apply_team_insights_subscription_v1(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,text) from public,anon,authenticated;
grant execute on function public.live_apply_team_insights_subscription_v1(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,text) to service_role;

-- One safe self-service commerce/status RPC. It exposes no billing credentials.
create or replace function public.live_team_insights_commerce_status_v1(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  product_row public.live_subscription_products%rowtype;
  promo jsonb;
  sub public.live_billing_subscriptions%rowtype;
  can_view_team boolean := false;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  can_view_team := public.live_is_platform_owner() or public.live_is_team_follower(target_team_id)
    or exists(select 1 from public.live_team_members m where m.team_id=target_team_id and m.user_id=caller)
    or public.live_has_detailed_analytics_access(target_team_id);
  if not can_view_team then raise exception 'Team access required'; end if;

  select * into product_row from public.live_subscription_products where product_code='team_insights';
  promo := public.live_active_team_insights_promotion_v1(target_team_id);
  select * into sub from public.live_billing_subscriptions
    where user_id=caller and team_id=target_team_id and product_code='team_insights'
    order by updated_at desc limit 1;

  return jsonb_build_object(
    'product',jsonb_build_object(
      'productCode','team_insights','checkoutStatus',coalesce(product_row.checkout_status,'preview'),
      'billingProvider',coalesce(product_row.billing_provider,'stripe'),
      'monthlyPriceCents',coalesce(product_row.monthly_price_cents,500),
      'annualPriceCents',coalesce(product_row.annual_price_cents,5000),
      'adultPurchaserRequired',coalesce(product_row.adult_purchaser_required,true)
    ),
    'promotion',promo,
    'subscription',case when sub.id is null then null else jsonb_build_object(
      'status',sub.status,'billingInterval',sub.billing_interval,'currentPeriodEnd',sub.current_period_end,
      'cancelAtPeriodEnd',sub.cancel_at_period_end,'environment',sub.environment
    ) end
  );
end;
$$;

revoke all on function public.live_team_insights_commerce_status_v1(uuid) from public,anon;
grant execute on function public.live_team_insights_commerce_status_v1(uuid) to authenticated;

comment on function public.live_team_insights_commerce_status_v1(uuid) is
  '7.63.4 self-service Team Insights promotion/subscription status. No payment method, card, address, or Stripe secret is exposed.';
