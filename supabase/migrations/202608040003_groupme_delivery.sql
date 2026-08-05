-- WPI 7.56.2 — authenticated GroupMe delivery, retry queue, and audit history.
-- Apply after WPI_LIVE_7_56_1_FULL_SETUP.sql or migrations 001 + 002.
-- No bot ID, access token, service-role key, password, or other secret belongs in this file.

alter table public.live_destinations add column if not exists updated_by uuid references auth.users(id);
alter table public.live_destinations add column if not exists updated_at timestamptz not null default now();
alter table public.live_destinations add column if not exists last_tested_at timestamptz;
alter table public.live_destinations add column if not exists last_test_status text check (last_test_status in ('sent','failed','not_tested')) default 'not_tested';
alter table public.live_destinations add column if not exists last_test_error text;

alter table public.live_deliveries add column if not exists destination_id uuid references public.live_destinations(id) on delete set null;
alter table public.live_deliveries add column if not exists message_text_snapshot text;
alter table public.live_deliveries add column if not exists first_attempt_at timestamptz;
alter table public.live_deliveries add column if not exists last_attempt_at timestamptz;
alter table public.live_deliveries add column if not exists next_retry_at timestamptz;
alter table public.live_deliveries add column if not exists sent_at timestamptz;
alter table public.live_deliveries add column if not exists last_error text;
alter table public.live_deliveries add column if not exists request_id uuid not null default gen_random_uuid();

create index if not exists live_deliveries_retry_idx
  on public.live_deliveries(status,next_retry_at)
  where status in ('pending','failed');
create index if not exists live_deliveries_destination_idx
  on public.live_deliveries(destination_id,updated_at desc);

create table if not exists public.live_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.live_deliveries(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  request_id uuid not null,
  invoked_by uuid references auth.users(id) on delete set null,
  trigger_source text not null default 'scorer' check (trigger_source in ('scorer','manual_retry','test','worker')),
  provider_response_code integer,
  provider_response_excerpt text,
  outcome text not null check (outcome in ('sent','failed','suppressed')),
  error_message text,
  attempted_at timestamptz not null default now(),
  unique(delivery_id,attempt_number)
);

alter table public.live_delivery_attempts enable row level security;

drop policy if exists "members read delivery attempts" on public.live_delivery_attempts;
create policy "members read delivery attempts" on public.live_delivery_attempts
for select to authenticated
using (
  exists (
    select 1
    from public.live_deliveries d
    join public.live_events e on e.id=d.event_id
    join public.live_games g on g.id=e.game_id
    where d.id=delivery_id and public.live_is_team_member(g.team_id)
  )
);

create or replace function public.live_claim_groupme_delivery(
  target_event_id uuid,
  target_destination_id uuid,
  target_destination_name text,
  target_message_text text,
  force_retry boolean default false,
  claim_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery public.live_deliveries%rowtype;
  attempt_number integer;
  claimed_at timestamptz := now();
begin
  -- Serialize claims for one event/provider pair. A recent pending claim is
  -- treated as in-flight so two scorer devices cannot post the same play.
  perform pg_advisory_xact_lock(hashtextextended(target_event_id::text || ':groupme', 0));

  select * into delivery
  from public.live_deliveries
  where event_id=target_event_id and provider='groupme'
  for update;

  if delivery.id is not null then
    if delivery.status='sent' then
      return jsonb_build_object('claimed',false,'status','already_sent','deliveryId',delivery.id);
    end if;
    if delivery.status='pending'
       and delivery.last_attempt_at is not null
       and delivery.last_attempt_at > claimed_at - interval '60 seconds' then
      return jsonb_build_object('claimed',false,'status','in_flight','deliveryId',delivery.id);
    end if;
    if delivery.next_retry_at is not null and delivery.next_retry_at > claimed_at and not force_retry then
      return jsonb_build_object(
        'claimed',false,'status','queued','deliveryId',delivery.id,'nextRetryAt',delivery.next_retry_at
      );
    end if;

    attempt_number := delivery.attempt_count + 1;
    update public.live_deliveries
    set destination_id=target_destination_id,
        destination_name=target_destination_name,
        status='pending',
        attempt_count=attempt_number,
        message_text_snapshot=target_message_text,
        first_attempt_at=coalesce(first_attempt_at,claimed_at),
        last_attempt_at=claimed_at,
        next_retry_at=null,
        sent_at=null,
        last_error=null,
        provider_response_code=null,
        provider_response_excerpt=null,
        request_id=claim_request_id,
        updated_at=claimed_at
    where id=delivery.id
    returning * into delivery;
  else
    attempt_number := 1;
    insert into public.live_deliveries(
      event_id,provider,destination_id,destination_name,status,attempt_count,
      message_text_snapshot,first_attempt_at,last_attempt_at,request_id,updated_at
    ) values (
      target_event_id,'groupme',target_destination_id,target_destination_name,'pending',attempt_number,
      target_message_text,claimed_at,claimed_at,claim_request_id,claimed_at
    )
    returning * into delivery;
  end if;

  return jsonb_build_object(
    'claimed',true,
    'status','pending',
    'deliveryId',delivery.id,
    'attemptNumber',attempt_number,
    'requestId',claim_request_id
  );
end;
$$;

revoke all on function public.live_claim_groupme_delivery(uuid,uuid,text,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.live_claim_groupme_delivery(uuid,uuid,text,text,boolean,uuid) to service_role;

create or replace function public.live_upsert_groupme_destination(
  target_team_id uuid,
  destination_name text,
  destination_secret_name text default 'GROUPME_BOT_ID',
  destination_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  destination public.live_destinations%rowtype;
  cleaned_secret text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Owner or Admin role required';
  end if;
  if nullif(trim(destination_name),'') is null then
    raise exception 'Destination display name is required';
  end if;

  cleaned_secret := upper(regexp_replace(coalesce(nullif(trim(destination_secret_name),''),'GROUPME_BOT_ID'),'[^A-Za-z0-9_]+','_','g'));
  if cleaned_secret !~ '^[A-Z][A-Z0-9_]{2,127}$' then
    raise exception 'Secret name must use uppercase letters, numbers, and underscores';
  end if;

  insert into public.live_destinations(
    team_id,provider,display_name,secret_name,enabled,created_by,updated_by,updated_at
  ) values (
    target_team_id,'groupme',trim(destination_name),cleaned_secret,destination_enabled,caller,caller,now()
  )
  on conflict (team_id,provider) do update
    set display_name=excluded.display_name,
        secret_name=excluded.secret_name,
        enabled=excluded.enabled,
        updated_by=caller,
        updated_at=now()
  returning * into destination;

  return jsonb_build_object(
    'id',destination.id,
    'teamId',destination.team_id,
    'displayName',destination.display_name,
    'secretName',destination.secret_name,
    'enabled',destination.enabled,
    'lastTestedAt',destination.last_tested_at,
    'lastTestStatus',destination.last_test_status,
    'lastTestError',destination.last_test_error
  );
end;
$$;

grant execute on function public.live_upsert_groupme_destination(uuid,text,text,boolean) to authenticated;

create or replace function public.live_groupme_delivery_summary(target_team_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'sent',count(*) filter (where d.status='sent'),
    'failed',count(*) filter (where d.status='failed'),
    'pending',count(*) filter (where d.status='pending'),
    'suppressed',count(*) filter (where d.status='suppressed'),
    'lastSentAt',max(d.sent_at),
    'lastFailureAt',max(d.last_attempt_at) filter (where d.status='failed')
  )
  from public.live_deliveries d
  join public.live_events e on e.id=d.event_id
  join public.live_games g on g.id=e.game_id
  where g.team_id=target_team_id
    and public.live_is_team_member(target_team_id);
$$;

grant execute on function public.live_groupme_delivery_summary(uuid) to authenticated;

-- Realtime delivery status keeps the private scorer and dashboard current on multiple devices.
do $$ begin
  begin alter publication supabase_realtime add table public.live_deliveries; exception when duplicate_object then null; end;
end $$;

comment on table public.live_delivery_attempts is 'Immutable per-attempt audit history for WPI Live outbound delivery. Provider secrets are never stored here.';
comment on column public.live_destinations.secret_name is 'Edge Function environment-variable name only. The GroupMe bot ID itself must remain in Supabase secrets.';
comment on column public.live_deliveries.next_retry_at is 'Earliest recommended retry time. Automatic retries occur while an authorized WPI Live client is open; failed rows remain available for manual retry.';
