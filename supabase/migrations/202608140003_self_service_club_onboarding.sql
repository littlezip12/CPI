-- WPI 7.60.1 — Self-Service Club Onboarding
-- Repeatable club-entry workflow with platform-owner review before a canonical
-- club identity can become an operational WPI Live workspace.
--
-- Safety rules:
--   * Any authenticated account may submit an onboarding request.
--   * A request does NOT create club/team authority.
--   * Canonical WPI club identities cannot be claimed twice.
--   * Only the existing WPI Live Platform Owner may approve/reject requests.
--   * Approval creates one Club workspace, one first Team, an empty active
--     roster, and Owner access for the requester.
--   * Branding activation remains separate/reviewed; this migration does not
--     enable a new scoring theme or touch scoring/GroupMe/recovery data.

create extension if not exists pgcrypto;

create table if not exists public.live_club_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  requester_email text not null,
  requester_display_name text,
  canonical_wpi_club_id text,
  canonical_slug text,
  requested_club_name text not null check (char_length(trim(requested_club_name)) between 1 and 120),
  requested_display_name text not null check (char_length(trim(requested_display_name)) between 1 and 120),
  requested_logo_url text,
  requested_region text,
  requested_primary_color text,
  requested_secondary_color text,
  initial_team_name text not null check (char_length(trim(initial_team_name)) between 1 and 100),
  initial_age_group text not null default '14U',
  initial_gender text,
  initial_squad_label text,
  competitive_season text not null default '2026-2027',
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_club_id uuid references public.live_clubs(id) on delete set null,
  approved_team_id uuid references public.live_teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_club_onboarding_requested_by_idx
  on public.live_club_onboarding_requests(requested_by,created_at desc);
create index if not exists live_club_onboarding_status_idx
  on public.live_club_onboarding_requests(status,created_at asc);
create unique index if not exists live_club_onboarding_pending_canonical_idx
  on public.live_club_onboarding_requests(canonical_wpi_club_id)
  where status='pending' and canonical_wpi_club_id is not null;

comment on table public.live_club_onboarding_requests is
  'Reviewed WPI Live club-onboarding queue. Requests create no club/team authority until the Platform Owner explicitly approves them.';

alter table public.live_club_onboarding_requests enable row level security;

-- Requests are read/written through narrow security-definer RPCs only.
drop policy if exists live_club_onboarding_no_direct_access on public.live_club_onboarding_requests;
create policy live_club_onboarding_no_direct_access
  on public.live_club_onboarding_requests for select to authenticated
  using (false);

-- Account registry now records onboarding-origin accounts without changing
-- the existing Supporter-first/team-invite semantics.
do $$
begin
  alter table public.live_account_registry drop constraint if exists live_account_registry_signup_source_check;
  alter table public.live_account_registry add constraint live_account_registry_signup_source_check
    check (signup_source in ('owner_bootstrap','team_invite','club_onboarding','legacy','unknown'));
exception when undefined_table then null;
end $$;


-- Preserve club_onboarding attribution when Supabase Auth later updates the
-- account (email confirmation, last sign-in, etc.). The existing trigger calls
-- this function, so replacing the function is sufficient and avoids a second
-- auth trigger.
create or replace function public.live_capture_account_registry()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  invite_row public.live_team_invites%rowtype;
  source_value text := 'unknown';
begin
  select * into invite_row
  from public.live_team_invites i
  where lower(i.email)=lower(coalesce(new.email,''))
    and (i.accepted_by=new.id or i.status in ('pending','accepted'))
  order by case when i.accepted_by=new.id then 0 else 1 end, i.created_at asc
  limit 1;

  if invite_row.id is not null then
    source_value := 'team_invite';
  elsif not exists(select 1 from public.live_teams) then
    source_value := 'owner_bootstrap';
  elsif tg_op='INSERT' then
    source_value := 'unknown';
  else
    source_value := 'legacy';
  end if;

  insert into public.live_account_registry(
    user_id,email,display_name,signup_source,initial_team_id,initial_invite_id,
    registered_at,email_confirmed_at,last_sign_in_at,updated_at
  ) values (
    new.id,
    lower(coalesce(new.email,'')),
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name','')),''),
    source_value,
    invite_row.team_id,
    invite_row.id,
    coalesce(new.created_at,now()),
    new.email_confirmed_at,
    new.last_sign_in_at,
    now()
  )
  on conflict (user_id) do update
    set email=excluded.email,
        display_name=coalesce(excluded.display_name,public.live_account_registry.display_name),
        signup_source=case
          when public.live_account_registry.signup_source in ('owner_bootstrap','team_invite','club_onboarding') then public.live_account_registry.signup_source
          when excluded.signup_source in ('owner_bootstrap','team_invite') then excluded.signup_source
          else coalesce(public.live_account_registry.signup_source,excluded.signup_source,'legacy')
        end,
        initial_team_id=coalesce(public.live_account_registry.initial_team_id,excluded.initial_team_id),
        initial_invite_id=coalesce(public.live_account_registry.initial_invite_id,excluded.initial_invite_id),
        email_confirmed_at=excluded.email_confirmed_at,
        last_sign_in_at=excluded.last_sign_in_at,
        updated_at=now();

  return new;
end;
$$;

create or replace function public.live_club_onboarding_context_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  my_rows jsonb := '[]'::jsonb;
  review_rows jsonb := '[]'::jsonb;
  claimed_rows jsonb := '[]'::jsonb;
  pending_rows jsonb := '[]'::jsonb;
  platform_owner boolean := false;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  platform_owner := public.live_is_platform_owner();

  select coalesce(jsonb_agg(jsonb_build_object(
    'requestId',r.id,
    'canonicalWpiClubId',r.canonical_wpi_club_id,
    'canonicalSlug',r.canonical_slug,
    'clubName',r.requested_club_name,
    'clubDisplayName',r.requested_display_name,
    'logoUrl',r.requested_logo_url,
    'region',r.requested_region,
    'primaryColor',r.requested_primary_color,
    'secondaryColor',r.requested_secondary_color,
    'initialTeamName',r.initial_team_name,
    'ageGroup',r.initial_age_group,
    'gender',r.initial_gender,
    'squadLabel',r.initial_squad_label,
    'competitiveSeason',r.competitive_season,
    'status',r.status,
    'reviewNotes',r.review_notes,
    'approvedClubId',r.approved_club_id,
    'approvedTeamId',r.approved_team_id,
    'createdAt',r.created_at,
    'reviewedAt',r.reviewed_at
  ) order by r.created_at desc),'[]'::jsonb)
  into my_rows
  from public.live_club_onboarding_requests r
  where r.requested_by=caller;

  if platform_owner then
    select coalesce(jsonb_agg(jsonb_build_object(
      'requestId',r.id,
      'requestedBy',r.requested_by,
      'requesterEmail',r.requester_email,
      'requesterDisplayName',r.requester_display_name,
      'canonicalWpiClubId',r.canonical_wpi_club_id,
      'canonicalSlug',r.canonical_slug,
      'clubName',r.requested_club_name,
      'clubDisplayName',r.requested_display_name,
      'logoUrl',r.requested_logo_url,
      'region',r.requested_region,
      'primaryColor',r.requested_primary_color,
      'secondaryColor',r.requested_secondary_color,
      'initialTeamName',r.initial_team_name,
      'ageGroup',r.initial_age_group,
      'gender',r.initial_gender,
      'squadLabel',r.initial_squad_label,
      'competitiveSeason',r.competitive_season,
      'status',r.status,
      'createdAt',r.created_at
    ) order by r.created_at asc),'[]'::jsonb)
    into review_rows
    from public.live_club_onboarding_requests r
    where r.status='pending';
  end if;

  select coalesce(jsonb_agg(c.canonical_wpi_club_id order by c.canonical_wpi_club_id),'[]'::jsonb)
  into claimed_rows
  from public.live_clubs c
  where c.active=true and c.canonical_wpi_club_id is not null;

  select coalesce(jsonb_agg(distinct r.canonical_wpi_club_id),'[]'::jsonb)
  into pending_rows
  from public.live_club_onboarding_requests r
  where r.status='pending' and r.canonical_wpi_club_id is not null;

  return jsonb_build_object(
    'isPlatformOwner',platform_owner,
    'myRequests',my_rows,
    'reviewQueue',case when platform_owner then review_rows else '[]'::jsonb end,
    'claimedCanonicalClubIds',claimed_rows,
    'pendingCanonicalClubIds',pending_rows,
    'policy','request_then_platform_owner_review'
  );
end;
$$;

revoke all on function public.live_club_onboarding_context_v1() from public,anon;
grant execute on function public.live_club_onboarding_context_v1() to authenticated;

create or replace function public.live_submit_club_onboarding_request_v1(
  requested_canonical_wpi_club_id text,
  requested_canonical_slug text,
  requested_club_name text,
  requested_display_name text,
  requested_logo_url text,
  requested_region text,
  requested_primary_color text,
  requested_secondary_color text,
  requested_initial_team_name text,
  requested_age_group text default '14U',
  requested_gender text default null,
  requested_squad_label text default null,
  requested_season text default '2026-2027'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  profile_row public.live_profiles%rowtype;
  request_row public.live_club_onboarding_requests%rowtype;
  clean_club_id text := nullif(trim(coalesce(requested_canonical_wpi_club_id,'')),'');
  clean_slug text := nullif(trim(coalesce(requested_canonical_slug,'')),'');
  clean_club_name text := nullif(trim(coalesce(requested_club_name,'')),'');
  clean_display_name text := nullif(trim(coalesce(requested_display_name,'')),'');
  clean_team_name text := nullif(trim(coalesce(requested_initial_team_name,'')),'');
  clean_gender text := nullif(trim(coalesce(requested_gender,'')),'');
  clean_age text := coalesce(nullif(trim(coalesce(requested_age_group,'')),''),'14U');
  clean_season text := coalesce(nullif(trim(coalesce(requested_season,'')),''),'2026-2027');
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if clean_club_name is null or clean_display_name is null then raise exception 'Club name is required'; end if;
  if clean_team_name is null then raise exception 'First team name is required'; end if;
  if clean_gender is not null and clean_gender not in ('Boys','Girls','Coed') then
    raise exception 'Gender must be Boys, Girls, or Coed';
  end if;
  if clean_age not in ('10U','12U','14U','16U','18U') then
    raise exception 'Age group must be 10U, 12U, 14U, 16U, or 18U';
  end if;
  if clean_season !~ '^[0-9]{4}-[0-9]{4}$' then raise exception 'Season must use YYYY-YYYY'; end if;

  if clean_club_id is not null and exists(
    select 1 from public.live_clubs c where c.canonical_wpi_club_id=clean_club_id and c.active=true
  ) then
    raise exception 'That WPI club already has a Live workspace';
  end if;
  if clean_club_id is not null and exists(
    select 1 from public.live_club_onboarding_requests r where r.canonical_wpi_club_id=clean_club_id and r.status='pending'
  ) then
    raise exception 'That WPI club already has a pending onboarding request';
  end if;
  if clean_club_id is null and exists(
    select 1 from public.live_club_onboarding_requests r
    where r.status='pending'
      and lower(trim(r.requested_display_name))=lower(clean_display_name)
  ) then
    raise exception 'A pending onboarding request already uses that unlisted club name';
  end if;
  if clean_club_id is null and exists(
    select 1 from public.live_clubs c
    where c.active=true
      and (lower(trim(c.display_name))=lower(clean_display_name) or lower(trim(c.name))=lower(clean_club_name))
  ) then
    raise exception 'A WPI Live workspace already uses that club name';
  end if;

  select * into profile_row from public.live_profiles where user_id=caller;

  insert into public.live_club_onboarding_requests(
    requested_by,requester_email,requester_display_name,
    canonical_wpi_club_id,canonical_slug,requested_club_name,requested_display_name,
    requested_logo_url,requested_region,requested_primary_color,requested_secondary_color,
    initial_team_name,initial_age_group,initial_gender,initial_squad_label,competitive_season
  ) values (
    caller,
    lower(coalesce(profile_row.email,'')),
    coalesce(nullif(trim(profile_row.display_name),''),split_part(coalesce(profile_row.email,''),'@',1),'WPI account'),
    clean_club_id,clean_slug,clean_club_name,clean_display_name,
    nullif(trim(coalesce(requested_logo_url,'')),''),
    nullif(trim(coalesce(requested_region,'')),''),
    nullif(trim(coalesce(requested_primary_color,'')),''),
    nullif(trim(coalesce(requested_secondary_color,'')),''),
    clean_team_name,clean_age,clean_gender,
    nullif(trim(coalesce(requested_squad_label,'')),''),clean_season
  ) returning * into request_row;

  update public.live_account_registry
  set signup_source=case
        when signup_source in ('owner_bootstrap','team_invite') then signup_source
        else 'club_onboarding'
      end,
      updated_at=now()
  where user_id=caller;

  return jsonb_build_object(
    'requestId',request_row.id,
    'status',request_row.status,
    'clubDisplayName',request_row.requested_display_name,
    'initialTeamName',request_row.initial_team_name,
    'message','Onboarding request submitted for Platform Owner review.'
  );
end;
$$;

revoke all on function public.live_submit_club_onboarding_request_v1(text,text,text,text,text,text,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.live_submit_club_onboarding_request_v1(text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.live_withdraw_club_onboarding_request_v1(target_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  changed integer := 0;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  update public.live_club_onboarding_requests
  set status='withdrawn',updated_at=now()
  where id=target_request_id and requested_by=caller and status='pending';
  get diagnostics changed = row_count;
  if changed=0 then raise exception 'Pending onboarding request not found'; end if;
  return jsonb_build_object('requestId',target_request_id,'status','withdrawn');
end;
$$;

revoke all on function public.live_withdraw_club_onboarding_request_v1(uuid) from public,anon;
grant execute on function public.live_withdraw_club_onboarding_request_v1(uuid) to authenticated;

create or replace function public.live_review_club_onboarding_request_v1(
  target_request_id uuid,
  review_decision text,
  reviewer_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  request_row public.live_club_onboarding_requests%rowtype;
  created_club public.live_clubs%rowtype;
  created_team public.live_teams%rowtype;
  created_roster public.live_rosters%rowtype;
  clean_decision text := lower(trim(coalesce(review_decision,'')));
  final_slug text;
  team_slug text;
  team_label text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;
  if clean_decision not in ('approve','reject') then raise exception 'Decision must be approve or reject'; end if;

  select * into request_row
  from public.live_club_onboarding_requests
  where id=target_request_id
  for update;

  if request_row.id is null then raise exception 'Onboarding request not found'; end if;
  if request_row.status <> 'pending' then raise exception 'That onboarding request is no longer pending'; end if;

  if clean_decision='reject' then
    update public.live_club_onboarding_requests
    set status='rejected',review_notes=nullif(trim(coalesce(reviewer_notes,'')),''),reviewed_by=caller,reviewed_at=now(),updated_at=now()
    where id=request_row.id;
    return jsonb_build_object('requestId',request_row.id,'status','rejected');
  end if;

  if request_row.canonical_wpi_club_id is not null and exists(
    select 1 from public.live_clubs c where c.canonical_wpi_club_id=request_row.canonical_wpi_club_id and c.active=true
  ) then
    raise exception 'That canonical WPI club already has a Live workspace';
  end if;
  if request_row.canonical_wpi_club_id is null and exists(
    select 1 from public.live_clubs c
    where c.active=true
      and (lower(trim(c.display_name))=lower(trim(request_row.requested_display_name))
        or lower(trim(c.name))=lower(trim(request_row.requested_club_name)))
  ) then
    raise exception 'A WPI Live workspace already uses that club name';
  end if;

  final_slug := coalesce(nullif(trim(request_row.canonical_slug),''),
    trim(both '-' from regexp_replace(lower(trim(request_row.requested_display_name)),'[^a-z0-9]+','-','g')));
  if final_slug is null or final_slug='' then final_slug := 'wpi-live-club'; end if;
  if exists(select 1 from public.live_clubs where canonical_slug=final_slug and active=true) then
    final_slug := final_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  end if;

  insert into public.live_clubs(
    canonical_wpi_club_id,canonical_slug,name,display_name,logo_url,region,
    owner_id,created_by,active
  ) values (
    request_row.canonical_wpi_club_id,final_slug,
    trim(request_row.requested_club_name),trim(request_row.requested_display_name),
    request_row.requested_logo_url,request_row.requested_region,
    request_row.requested_by,caller,true
  ) returning * into created_club;

  insert into public.live_club_members(club_id,user_id,role)
  values (created_club.id,request_row.requested_by,'owner'::public.live_club_role)
  on conflict (club_id,user_id) do update set role='owner'::public.live_club_role,updated_at=now();

  team_slug := trim(both '-' from regexp_replace(lower(trim(request_row.initial_team_name)),'[^a-z0-9]+','-','g'));
  if team_slug='' then team_slug := 'wpi-live-team'; end if;
  if exists(select 1 from public.live_teams where slug=team_slug) then
    team_slug := team_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  end if;
  team_label := trim(concat_ws(' ',request_row.initial_age_group,request_row.initial_gender,request_row.initial_squad_label));
  if team_label='' then team_label := trim(request_row.initial_team_name); end if;

  insert into public.live_teams(
    name,slug,owner_id,age_group,competitive_season,club_id,
    display_label,gender,squad_label,active
  ) values (
    trim(request_row.initial_team_name),team_slug,request_row.requested_by,
    request_row.initial_age_group,request_row.competitive_season,created_club.id,
    team_label,request_row.initial_gender,request_row.initial_squad_label,true
  ) returning * into created_team;

  insert into public.live_team_members(team_id,user_id,role,can_manage_groupme,updated_at,updated_by)
  values (created_team.id,request_row.requested_by,'owner'::public.live_team_role,true,now(),caller)
  on conflict (team_id,user_id) do update
    set role='owner'::public.live_team_role,can_manage_groupme=true,updated_at=now(),updated_by=caller;

  insert into public.live_rosters(team_id,competitive_season,label,active,created_by)
  values (created_team.id,created_team.competitive_season,created_team.name || ' roster',true,request_row.requested_by)
  returning * into created_roster;

  update public.live_club_onboarding_requests
  set status='approved',review_notes=nullif(trim(coalesce(reviewer_notes,'')),''),
      reviewed_by=caller,reviewed_at=now(),approved_club_id=created_club.id,
      approved_team_id=created_team.id,updated_at=now()
  where id=request_row.id;

  update public.live_account_registry
  set signup_source=case
        when signup_source in ('owner_bootstrap','team_invite') then signup_source
        else 'club_onboarding'
      end,
      initial_team_id=coalesce(initial_team_id,created_team.id),
      updated_at=now()
  where user_id=request_row.requested_by;

  return jsonb_build_object(
    'requestId',request_row.id,
    'status','approved',
    'clubId',created_club.id,
    'clubDisplayName',created_club.display_name,
    'teamId',created_team.id,
    'teamName',created_team.name,
    'rosterId',created_roster.id,
    'brandingState','reviewed_activation_required'
  );
end;
$$;

revoke all on function public.live_review_club_onboarding_request_v1(uuid,text,text) from public,anon;
grant execute on function public.live_review_club_onboarding_request_v1(uuid,text,text) to authenticated;

comment on function public.live_submit_club_onboarding_request_v1(text,text,text,text,text,text,text,text,text,text,text,text,text) is
  'Authenticated self-service club onboarding request. Creates no authority until Platform Owner review.';
comment on function public.live_review_club_onboarding_request_v1(uuid,text,text) is
  'Platform-Owner-only onboarding review. Approval creates the Club workspace, first Team, empty roster and requester Owner memberships; scoring-theme activation remains separate.';
