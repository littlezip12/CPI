-- WPI 7.56.8 — GroupMe Topic Delivery Foundation.
-- Additive destination metadata and secure Owner/Admin configuration only.
-- No GroupMe bot ID or access token belongs in this migration or database table.

alter table public.live_destinations
  add column if not exists delivery_mode text not null default 'bot',
  add column if not exists groupme_group_id text,
  add column if not exists groupme_group_name text,
  add column if not exists groupme_topic_id text,
  add column if not exists groupme_topic_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.live_destinations'::regclass
      and conname='live_destinations_delivery_mode_check'
  ) then
    alter table public.live_destinations
      add constraint live_destinations_delivery_mode_check
      check (delivery_mode in ('bot','topic'));
  end if;
end $$;

update public.live_destinations
set delivery_mode='bot'
where delivery_mode is null or delivery_mode not in ('bot','topic');

-- Secret-bearing column remains excluded. These metadata fields are safe for
-- team members and game-scoped scorers to read.
grant select (
  id,team_id,provider,display_name,delivery_mode,
  groupme_group_id,groupme_group_name,groupme_topic_id,groupme_topic_name,
  enabled,last_tested_at,last_test_status,last_test_error,
  created_by,created_at,updated_by,updated_at
) on public.live_destinations to authenticated;

create or replace function public.live_groupme_destination_config(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_role public.live_team_role;
  destination public.live_destinations%rowtype;
begin
  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=auth.uid();

  if caller_role is null then
    raise exception 'Team membership required';
  end if;

  select * into destination
  from public.live_destinations
  where team_id=target_team_id and provider='groupme';

  if destination.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id',destination.id,
    'teamId',destination.team_id,
    'displayName',destination.display_name,
    'secretName',case when caller_role='owner' then destination.secret_name else null end,
    'deliveryMode',destination.delivery_mode,
    'groupId',destination.groupme_group_id,
    'groupName',destination.groupme_group_name,
    'topicId',destination.groupme_topic_id,
    'topicName',destination.groupme_topic_name,
    'enabled',destination.enabled,
    'lastTestedAt',destination.last_tested_at,
    'lastTestStatus',destination.last_test_status,
    'lastTestError',destination.last_test_error,
    'updatedAt',destination.updated_at
  );
end;
$$;

grant execute on function public.live_groupme_destination_config(uuid) to authenticated;

create or replace function public.live_upsert_groupme_destination_v2(
  target_team_id uuid,
  destination_name text,
  destination_secret_name text default null,
  destination_enabled boolean default true,
  destination_mode text default 'bot',
  destination_group_id text default null,
  destination_group_name text default null,
  destination_topic_id text default null,
  destination_topic_name text default null
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
  existing_destination public.live_destinations%rowtype;
  cleaned_secret text;
  cleaned_mode text := lower(trim(coalesce(destination_mode,'bot')));
  cleaned_group_id text := nullif(trim(destination_group_id),'');
  cleaned_group_name text := nullif(trim(destination_group_name),'');
  cleaned_topic_id text := nullif(trim(destination_topic_id),'');
  cleaned_topic_name text := nullif(trim(destination_topic_name),'');
begin
  if caller is null then
    raise exception 'Authentication required';
  end if;

  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Owner or Admin role required';
  end if;

  if nullif(trim(destination_name),'') is null then
    raise exception 'Destination display name is required';
  end if;

  if cleaned_mode not in ('bot','topic') then
    raise exception 'Delivery mode must be bot or topic';
  end if;

  select * into existing_destination
  from public.live_destinations
  where team_id=target_team_id and provider='groupme';

  -- Admins can operate an already-connected destination, including choosing a
  -- topic inside the Owner-approved GroupMe, but cannot redirect the credential
  -- to a different GroupMe or reinterpret a Bot secret as an access token.
  if caller_role='admin' then
    if existing_destination.id is null then
      raise exception 'A Team Owner must configure the GroupMe connection first';
    end if;
    cleaned_mode := existing_destination.delivery_mode;
    if cleaned_mode='topic' then
      cleaned_group_id := existing_destination.groupme_group_id;
      cleaned_group_name := existing_destination.groupme_group_name;
    end if;
  end if;

  if caller_role='owner' then
    cleaned_secret := upper(regexp_replace(
      coalesce(
        nullif(trim(destination_secret_name),''),
        existing_destination.secret_name,
        case when cleaned_mode='topic' then 'GROUPME_ACCESS_TOKEN' else 'GROUPME_BOT_ID' end
      ),
      '[^A-Za-z0-9_]+','_','g'
    ));
    if cleaned_secret !~ '^[A-Z][A-Z0-9_]{2,127}$' then
      raise exception 'Secret name must use uppercase letters, numbers, and underscores';
    end if;
  else
    cleaned_secret := existing_destination.secret_name;
    if cleaned_secret is null then
      raise exception 'A Team Owner must configure the server-side GroupMe credential first';
    end if;
  end if;

  if cleaned_mode='topic' and destination_enabled then
    if cleaned_group_id is null or cleaned_topic_id is null or cleaned_topic_name is null then
      raise exception 'Select a GroupMe group and topic before enabling Topic delivery';
    end if;
  end if;

  if cleaned_mode='bot' then
    cleaned_group_id := null;
    cleaned_group_name := null;
    cleaned_topic_id := null;
    cleaned_topic_name := null;
  end if;

  insert into public.live_destinations(
    team_id,provider,display_name,secret_name,delivery_mode,
    groupme_group_id,groupme_group_name,groupme_topic_id,groupme_topic_name,
    enabled,created_by,updated_by,updated_at,last_tested_at,last_test_status,last_test_error
  ) values (
    target_team_id,'groupme',trim(destination_name),cleaned_secret,cleaned_mode,
    cleaned_group_id,cleaned_group_name,cleaned_topic_id,cleaned_topic_name,
    destination_enabled,caller,caller,now(),null,'not_tested',null
  )
  on conflict (team_id,provider) do update
    set display_name=excluded.display_name,
        secret_name=case when caller_role='owner' then excluded.secret_name else public.live_destinations.secret_name end,
        delivery_mode=excluded.delivery_mode,
        groupme_group_id=excluded.groupme_group_id,
        groupme_group_name=excluded.groupme_group_name,
        groupme_topic_id=excluded.groupme_topic_id,
        groupme_topic_name=excluded.groupme_topic_name,
        enabled=excluded.enabled,
        last_tested_at=null,
        last_test_status='not_tested',
        last_test_error=null,
        updated_by=caller,
        updated_at=now()
  returning * into destination;

  return jsonb_build_object(
    'id',destination.id,
    'teamId',destination.team_id,
    'displayName',destination.display_name,
    'secretName',case when caller_role='owner' then destination.secret_name else null end,
    'deliveryMode',destination.delivery_mode,
    'groupId',destination.groupme_group_id,
    'groupName',destination.groupme_group_name,
    'topicId',destination.groupme_topic_id,
    'topicName',destination.groupme_topic_name,
    'enabled',destination.enabled,
    'lastTestedAt',destination.last_tested_at,
    'lastTestStatus',destination.last_test_status,
    'lastTestError',destination.last_test_error,
    'updatedAt',destination.updated_at
  );
end;
$$;

grant execute on function public.live_upsert_groupme_destination_v2(
  uuid,text,text,boolean,text,text,text,text,text
) to authenticated;

-- Preserve the 7.56.7 browser contract. An older cached dashboard always
-- configures Bot mode and cannot accidentally retain a Topic destination.
create or replace function public.live_upsert_groupme_destination(
  target_team_id uuid,
  destination_name text,
  destination_secret_name text default null,
  destination_enabled boolean default true
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.live_upsert_groupme_destination_v2(
    target_team_id,
    destination_name,
    destination_secret_name,
    destination_enabled,
    'bot',
    null,null,null,null
  );
$$;

grant execute on function public.live_upsert_groupme_destination(uuid,text,text,boolean) to authenticated;

revoke all on function public.live_upsert_groupme_destination_v2(
  uuid,text,text,boolean,text,text,text,text,text
) from public,anon;
revoke all on function public.live_groupme_destination_config(uuid) from public,anon;
revoke all on function public.live_upsert_groupme_destination(uuid,text,text,boolean) from public,anon;

comment on column public.live_destinations.delivery_mode is
  'GroupMe transport: bot posts to the bot main chat; topic posts with a server-side authenticated GroupMe access token.';
comment on column public.live_destinations.secret_name is
  'Supabase Edge Function environment-variable name only. Depending on delivery_mode it points to a GroupMe bot ID or authenticated GroupMe access token; the credential itself is never stored in this table.';
comment on column public.live_destinations.groupme_group_id is
  'Non-secret GroupMe parent-group ID used for topic discovery and display.';
comment on column public.live_destinations.groupme_topic_id is
  'Non-secret GroupMe topic/subgroup ID used as the message destination in Topic mode.';
