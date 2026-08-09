-- WPI 7.57.2 — Team Access & Admin Invitations.
-- Adds team-scoped access management and a separately granted GroupMe-management permission.
-- No credential, token, bot ID, access token, or service-role secret belongs in this migration.

alter table public.live_team_members
  add column if not exists can_manage_groupme boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id);

alter table public.live_team_invites
  add column if not exists can_manage_groupme boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- The Team Owner inherently controls GroupMe setup. Keeping the explicit flag
-- true makes access-list responses straightforward while role checks remain authoritative.
update public.live_team_members
set can_manage_groupme=true,
    updated_at=now()
where role='owner' and can_manage_groupme=false;

-- A single server-enforced helper used by browser/admin flows. It does not grant
-- access to the Owner's broader GroupMe account; group discovery remains Owner-only.
create or replace function public.live_can_manage_groupme(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.live_team_members m
    where m.team_id=target_team_id
      and m.user_id=auth.uid()
      and (
        m.role='owner'
        or (m.role='admin' and m.can_manage_groupme=true)
      )
  );
$$;

grant execute on function public.live_can_manage_groupme(uuid) to authenticated;

-- Return a manager-safe access roster without broadening live_profiles RLS.
create or replace function public.live_list_team_access(target_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  caller_groupme boolean := false;
  members jsonb := '[]'::jsonb;
  invites jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role, can_manage_groupme
    into caller_role, caller_groupme
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Owner or Admin role required';
  end if;

  -- Expired invites remain visible so a manager can reissue them cleanly.
  update public.live_team_invites
  set status='expired', updated_at=now()
  where team_id=target_team_id
    and status='pending'
    and expires_at < now();

  select coalesce(jsonb_agg(row_data order by sort_role, sort_name), '[]'::jsonb)
    into members
  from (
    select
      case m.role when 'owner' then 0 when 'admin' then 1 when 'scorer' then 2 else 3 end as sort_role,
      lower(coalesce(p.display_name,p.email,m.user_id::text)) as sort_name,
      jsonb_build_object(
        'userId',m.user_id,
        'email',coalesce(p.email,''),
        'displayName',coalesce(nullif(trim(p.display_name),''),split_part(coalesce(p.email,''),'@',1),'Team member'),
        'role',m.role,
        'canManageGroupMe',case when m.role='owner' then true else m.can_manage_groupme end,
        'joinedAt',m.created_at,
        'isCurrentUser',m.user_id=caller
      ) as row_data
    from public.live_team_members m
    left join public.live_profiles p on p.user_id=m.user_id
    where m.team_id=target_team_id
  ) member_rows;

  select coalesce(jsonb_agg(row_data order by sort_status, sort_created desc), '[]'::jsonb)
    into invites
  from (
    select
      case i.status when 'pending' then 0 else 1 end as sort_status,
      i.created_at as sort_created,
      jsonb_build_object(
        'inviteId',i.id,
        'email',i.email,
        'role',i.role,
        'canManageGroupMe',i.can_manage_groupme,
        'status',i.status,
        'token',i.token,
        'createdAt',i.created_at,
        'expiresAt',i.expires_at
      ) as row_data
    from public.live_team_invites i
    where i.team_id=target_team_id
      and i.status in ('pending','expired')
      and (caller_role='owner' or i.role<>'admin')
  ) invite_rows;

  return jsonb_build_object(
    'callerRole',caller_role,
    'callerCanManageGroupMe',case when caller_role='owner' then true else caller_groupme end,
    'members',members,
    'invites',invites
  );
end;
$$;

grant execute on function public.live_list_team_access(uuid) to authenticated;

-- V2 invite creation keeps the original contract available for old cached clients.
create or replace function public.live_create_team_invite_v2(
  target_team_id uuid,
  invite_email text,
  invite_role public.live_team_role default 'scorer',
  invite_can_manage_groupme boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  invite_row public.live_team_invites%rowtype;
  cleaned_email text := lower(trim(coalesce(invite_email,'')));
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if cleaned_email='' or position('@' in cleaned_email) < 2 then raise exception 'A valid invite email is required'; end if;

  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Owner or Admin role required';
  end if;
  if invite_role='owner' then raise exception 'Ownership must be transferred separately'; end if;
  if invite_role='admin' and caller_role<>'owner' then raise exception 'Only the Team Owner can invite another Admin'; end if;
  if invite_can_manage_groupme and invite_role<>'admin' then raise exception 'GroupMe management permission requires the Admin role'; end if;
  if invite_can_manage_groupme and caller_role<>'owner' then raise exception 'Only the Team Owner can grant GroupMe management permission'; end if;

  update public.live_team_invites
  set status='revoked', updated_at=now()
  where team_id=target_team_id and lower(email)=cleaned_email and status='pending';

  insert into public.live_team_invites(team_id,email,role,can_manage_groupme,created_by,updated_at)
  values (target_team_id,cleaned_email,invite_role,invite_can_manage_groupme,caller,now())
  returning * into invite_row;

  return jsonb_build_object(
    'inviteId',invite_row.id,
    'token',invite_row.token,
    'expiresAt',invite_row.expires_at,
    'role',invite_row.role,
    'email',invite_row.email,
    'canManageGroupMe',invite_row.can_manage_groupme
  );
end;
$$;

grant execute on function public.live_create_team_invite_v2(uuid,text,public.live_team_role,boolean) to authenticated;

-- Accept the same invite URL used since 7.56.1, now carrying the scoped permission.
create or replace function public.live_accept_team_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_email text;
  invite_row public.live_team_invites%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select lower(coalesce(email,'')) into caller_email from auth.users where id=caller;
  select * into invite_row from public.live_team_invites where token=invite_token and status='pending' for update;
  if invite_row.id is null then raise exception 'Invite is unavailable'; end if;
  if invite_row.expires_at < now() then
    update public.live_team_invites set status='expired',updated_at=now() where id=invite_row.id;
    raise exception 'Invite has expired';
  end if;
  if lower(invite_row.email)<>caller_email then raise exception 'Invite email does not match the signed-in account'; end if;

  insert into public.live_team_members(team_id,user_id,role,can_manage_groupme,updated_at,updated_by)
  values (invite_row.team_id,caller,invite_row.role,invite_row.can_manage_groupme,now(),caller)
  on conflict (team_id,user_id) do update
    set role=excluded.role,
        can_manage_groupme=excluded.can_manage_groupme,
        updated_at=now(),
        updated_by=caller;

  update public.live_team_invites
  set status='accepted',accepted_by=caller,accepted_at=now(),updated_at=now()
  where id=invite_row.id;

  return jsonb_build_object(
    'teamId',invite_row.team_id,
    'role',invite_row.role,
    'canManageGroupMe',invite_row.can_manage_groupme
  );
end;
$$;

grant execute on function public.live_accept_team_invite(text) to authenticated;

create or replace function public.live_update_team_member_access(
  target_team_id uuid,
  target_user_id uuid,
  new_role public.live_team_role,
  member_can_manage_groupme boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  target_role public.live_team_role;
  updated_row public.live_team_members%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if caller=target_user_id then raise exception 'You cannot change your own team role here'; end if;

  select role into caller_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  select role into target_role from public.live_team_members where team_id=target_team_id and user_id=target_user_id;
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'Owner or Admin role required'; end if;
  if target_role is null then raise exception 'Team member not found'; end if;
  if target_role='owner' or new_role='owner' then raise exception 'Ownership must be transferred separately'; end if;

  if caller_role='admin' then
    if target_role='admin' or new_role='admin' then raise exception 'Only the Team Owner can manage Admin access'; end if;
    if member_can_manage_groupme then raise exception 'Only the Team Owner can grant GroupMe management permission'; end if;
  end if;

  if member_can_manage_groupme and new_role<>'admin' then
    raise exception 'GroupMe management permission requires the Admin role';
  end if;

  update public.live_team_members
  set role=new_role,
      can_manage_groupme=case when new_role='admin' then member_can_manage_groupme else false end,
      updated_at=now(),
      updated_by=caller
  where team_id=target_team_id and user_id=target_user_id
  returning * into updated_row;

  return jsonb_build_object(
    'userId',updated_row.user_id,
    'role',updated_row.role,
    'canManageGroupMe',updated_row.can_manage_groupme
  );
end;
$$;

grant execute on function public.live_update_team_member_access(uuid,uuid,public.live_team_role,boolean) to authenticated;

create or replace function public.live_remove_team_member(target_team_id uuid,target_user_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  target_role public.live_team_role;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if caller=target_user_id then raise exception 'You cannot remove your own access here'; end if;

  select role into caller_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  select role into target_role from public.live_team_members where team_id=target_team_id and user_id=target_user_id;
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'Owner or Admin role required'; end if;
  if target_role is null then raise exception 'Team member not found'; end if;
  if target_role='owner' then raise exception 'The Team Owner cannot be removed'; end if;
  if caller_role='admin' and target_role='admin' then raise exception 'Only the Team Owner can remove an Admin'; end if;

  delete from public.live_team_members where team_id=target_team_id and user_id=target_user_id;
end;
$$;

grant execute on function public.live_remove_team_member(uuid,uuid) to authenticated;

create or replace function public.live_revoke_team_invite(target_team_id uuid,target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  invite_role public.live_team_role;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into caller_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  select role into invite_role from public.live_team_invites where id=target_invite_id and team_id=target_team_id;
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'Owner or Admin role required'; end if;
  if invite_role is null then raise exception 'Invite not found'; end if;
  if caller_role='admin' and invite_role='admin' then raise exception 'Only the Team Owner can manage Admin invitations'; end if;

  update public.live_team_invites
  set status='revoked',updated_at=now()
  where id=target_invite_id and team_id=target_team_id and status in ('pending','expired');
end;
$$;

grant execute on function public.live_revoke_team_invite(uuid,uuid) to authenticated;

create or replace function public.live_reissue_team_invite(target_team_id uuid,target_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  invite_row public.live_team_invites%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into caller_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  select * into invite_row from public.live_team_invites where id=target_invite_id and team_id=target_team_id for update;
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'Owner or Admin role required'; end if;
  if invite_row.id is null then raise exception 'Invite not found'; end if;
  if caller_role='admin' and invite_row.role='admin' then raise exception 'Only the Team Owner can manage Admin invitations'; end if;

  update public.live_team_invites
  set token=encode(gen_random_bytes(24),'hex'),
      status='pending',
      created_by=caller,
      created_at=now(),
      expires_at=now()+interval '14 days',
      accepted_by=null,
      accepted_at=null,
      updated_at=now()
  where id=target_invite_id
  returning * into invite_row;

  return jsonb_build_object(
    'inviteId',invite_row.id,
    'token',invite_row.token,
    'expiresAt',invite_row.expires_at,
    'role',invite_row.role,
    'email',invite_row.email,
    'canManageGroupMe',invite_row.can_manage_groupme
  );
end;
$$;

grant execute on function public.live_reissue_team_invite(uuid,uuid) to authenticated;

-- Defense in depth: a non-designated Admin cannot update GroupMe destination
-- metadata even if calling an older cached RPC. Service-role maintenance remains unaffected.
create or replace function public.live_guard_groupme_destination_manager()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  membership_role public.live_team_role;
  membership_groupme boolean := false;
begin
  if caller is null or new.provider<>'groupme' then return new; end if;
  select role,can_manage_groupme into membership_role,membership_groupme
  from public.live_team_members
  where team_id=new.team_id and user_id=caller;
  if membership_role='owner' then return new; end if;
  if membership_role='admin' and membership_groupme then return new; end if;
  raise exception 'Tournament GroupMe management permission required';
end;
$$;

drop trigger if exists live_guard_groupme_destination_manager_trigger on public.live_destinations;
create trigger live_guard_groupme_destination_manager_trigger
  before insert or update on public.live_destinations
  for each row execute function public.live_guard_groupme_destination_manager();
