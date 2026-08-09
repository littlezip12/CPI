-- WPI 7.57.4 — Self-Service Tournament GroupMe Setup.
-- Keeps GroupMe credentials server-side, prevents destination changes during an
-- active game, and requires a successful test before a destination can be
-- activated for new games.

create or replace function public.live_prepare_groupme_destination_v3(
  target_team_id uuid,
  destination_group_id text,
  destination_group_name text,
  destination_topic_id text,
  destination_topic_name text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  caller_groupme boolean := false;
  existing_destination public.live_destinations%rowtype;
  prepared jsonb;
  cleaned_group_id text := nullif(trim(destination_group_id),'');
  cleaned_group_name text := nullif(trim(destination_group_name),'');
  cleaned_topic_id text := nullif(trim(destination_topic_id),'');
  cleaned_topic_name text := nullif(trim(destination_topic_name),'');
  changed boolean := false;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role,coalesce(can_manage_groupme,false)
    into caller_role,caller_groupme
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Owner or Admin role required';
  end if;
  if caller_role='admin' and caller_groupme is not true then
    raise exception 'Tournament GroupMe management permission required';
  end if;
  if cleaned_group_id is null or cleaned_group_name is null then
    raise exception 'Choose the tournament GroupMe first';
  end if;
  if cleaned_topic_id is null or cleaned_topic_name is null then
    raise exception 'Choose the Score Updates topic first';
  end if;

  select * into existing_destination
  from public.live_destinations
  where team_id=target_team_id and provider='groupme';

  if caller_role='admin' then
    if existing_destination.id is null then
      raise exception 'A Team Owner must approve the tournament GroupMe first';
    end if;
    if existing_destination.delivery_mode<>'topic'
       or coalesce(existing_destination.groupme_group_id,'')<>cleaned_group_id then
      raise exception 'Admins may manage topics only inside the Team Owner-approved GroupMe';
    end if;
    cleaned_group_name := coalesce(existing_destination.groupme_group_name,cleaned_group_name);
  end if;

  if existing_destination.id is not null then
    changed := existing_destination.delivery_mode is distinct from 'topic'
      or existing_destination.groupme_group_id is distinct from cleaned_group_id
      or existing_destination.groupme_topic_id is distinct from cleaned_topic_id;

    if changed and exists(
      select 1
      from public.live_games g
      where g.destination_id=existing_destination.id
        and g.status='live'
    ) then
      raise exception 'Finish the active game before changing its GroupMe destination';
    end if;
  end if;

  -- The credential value remains only in the Edge Function environment. The
  -- database stores the environment-variable name so every team created by the
  -- current Platform Owner can use the same protected GroupMe connection.
  prepared := public.live_upsert_groupme_destination_v2(
    target_team_id,
    coalesce(cleaned_group_name,'Tournament GroupMe') || ' → ' || coalesce(cleaned_topic_name,'Score Updates'),
    case
      when caller_role='owner' then coalesce(existing_destination.secret_name,'GROUPME_ACCESS_TOKEN_WPI_LIVE')
      else null
    end,
    false,
    'topic',
    cleaned_group_id,
    cleaned_group_name,
    cleaned_topic_id,
    cleaned_topic_name
  );

  return prepared;
end;
$$;

grant execute on function public.live_prepare_groupme_destination_v3(uuid,text,text,text,text) to authenticated;
revoke all on function public.live_prepare_groupme_destination_v3(uuid,text,text,text,text) from public,anon;

create or replace function public.live_activate_groupme_destination_v3(
  target_team_id uuid,
  target_destination_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  caller_groupme boolean := false;
  destination public.live_destinations%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role,coalesce(can_manage_groupme,false)
    into caller_role,caller_groupme
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Owner or Admin role required';
  end if;
  if caller_role='admin' and caller_groupme is not true then
    raise exception 'Tournament GroupMe management permission required';
  end if;

  select * into destination
  from public.live_destinations
  where id=target_destination_id
    and team_id=target_team_id
    and provider='groupme'
  for update;

  if destination.id is null then raise exception 'GroupMe destination not found'; end if;
  if destination.delivery_mode<>'topic'
     or destination.groupme_group_id is null
     or destination.groupme_topic_id is null then
    raise exception 'Choose the tournament GroupMe and Score Updates topic first';
  end if;
  if destination.last_test_status<>'sent' or destination.last_tested_at is null then
    raise exception 'Send a successful test message before activating score updates';
  end if;

  update public.live_destinations
  set enabled=true,
      updated_by=caller,
      updated_at=now()
  where id=destination.id
  returning * into destination;

  return jsonb_build_object(
    'id',destination.id,
    'teamId',destination.team_id,
    'displayName',destination.display_name,
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

grant execute on function public.live_activate_groupme_destination_v3(uuid,uuid) to authenticated;
revoke all on function public.live_activate_groupme_destination_v3(uuid,uuid) from public,anon;

create or replace function public.live_pause_groupme_destination_v3(
  target_team_id uuid,
  target_destination_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  caller_groupme boolean := false;
  destination public.live_destinations%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role,coalesce(can_manage_groupme,false)
    into caller_role,caller_groupme
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Owner or Admin role required';
  end if;
  if caller_role='admin' and caller_groupme is not true then
    raise exception 'Tournament GroupMe management permission required';
  end if;

  select * into destination
  from public.live_destinations
  where id=target_destination_id
    and team_id=target_team_id
    and provider='groupme'
  for update;

  if destination.id is null then raise exception 'GroupMe destination not found'; end if;
  if exists(
    select 1 from public.live_games g
    where g.destination_id=destination.id
      and g.status='live'
  ) then
    raise exception 'Finish the live game before pausing GroupMe delivery';
  end if;

  update public.live_destinations
  set enabled=false,
      updated_by=caller,
      updated_at=now()
  where id=destination.id
  returning * into destination;

  return jsonb_build_object(
    'id',destination.id,
    'teamId',destination.team_id,
    'displayName',destination.display_name,
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

grant execute on function public.live_pause_groupme_destination_v3(uuid,uuid) to authenticated;
revoke all on function public.live_pause_groupme_destination_v3(uuid,uuid) from public,anon;

-- Defense in depth for older cached dashboards or direct RPC calls: the GroupMe
-- group/topic used by an existing game cannot be redirected until that game is
-- final/cancelled. Test-status updates are unaffected because they do not alter
-- destination routing.
create or replace function public.live_guard_active_game_groupme_route()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if old.provider='groupme'
     and (
       new.delivery_mode is distinct from old.delivery_mode
       or new.groupme_group_id is distinct from old.groupme_group_id
       or new.groupme_topic_id is distinct from old.groupme_topic_id
       or new.secret_name is distinct from old.secret_name
     )
     and exists(
       select 1 from public.live_games g
       where g.destination_id=old.id
         and g.status='live'
     ) then
    raise exception 'Finish the active game before changing its GroupMe destination';
  end if;
  return new;
end;
$$;

drop trigger if exists live_guard_active_game_groupme_route_trigger on public.live_destinations;
create trigger live_guard_active_game_groupme_route_trigger
  before update on public.live_destinations
  for each row execute function public.live_guard_active_game_groupme_route();
