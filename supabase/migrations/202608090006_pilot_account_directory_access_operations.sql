-- WPI 7.57.17 — Pilot Account Directory & Access Operations.
-- Adds a Platform-Owner-only operational view of the account records already
-- collected by WPI Live. No passwords, auth tokens, GroupMe credentials,
-- OpenAI keys, or other secrets are exposed by these functions.

-- Keep the account registry's display name aligned with the user's WPI Live
-- profile when it is edited after signup.
create or replace function public.live_sync_account_registry_from_profile()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.live_account_registry
  set email=lower(coalesce(new.email,public.live_account_registry.email)),
      display_name=coalesce(nullif(trim(new.display_name),''),public.live_account_registry.display_name),
      updated_at=now()
  where user_id=new.user_id;
  return new;
end;
$$;

drop trigger if exists on_live_profile_updated_account_registry on public.live_profiles;
create trigger on_live_profile_updated_account_registry
  after insert or update of email,display_name on public.live_profiles
  for each row execute function public.live_sync_account_registry_from_profile();

-- Refresh existing registry names from the user's WPI Live profile where one is
-- available. This does not change signup timestamps or source attribution.
update public.live_account_registry r
set email=lower(coalesce(p.email,r.email)),
    display_name=coalesce(nullif(trim(p.display_name),''),r.display_name),
    updated_at=now()
from public.live_profiles p
where p.user_id=r.user_id
  and (
    lower(coalesce(p.email,'')) is distinct from lower(coalesce(r.email,''))
    or nullif(trim(coalesce(p.display_name,'')),'') is distinct from nullif(trim(coalesce(r.display_name,'')),'')
  );

-- The Platform Owner is the original/earliest permanent Team Owner created by
-- the WPI Live bootstrap. This is deliberately narrower than simply having an
-- Owner role on any later team workspace.
create or replace function public.live_is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select auth.uid() is not null
    and auth.uid() = (
      select m.user_id
      from public.live_team_members m
      where m.role='owner'
      order by m.created_at asc,m.user_id asc
      limit 1
    );
$$;

revoke all on function public.live_is_platform_owner() from public,anon;
grant execute on function public.live_is_platform_owner() to authenticated;

-- Protected platform account registry. The browser never receives auth secrets;
-- it receives only the operational fields explicitly listed below.
create or replace function public.live_platform_account_registry_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  accounts_json jsonb := '[]'::jsonb;
  metrics_json jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;

  select jsonb_build_object(
    'total',count(*)::int,
    'verified',count(*) filter (where r.email_confirmed_at is not null)::int,
    'unverified',count(*) filter (where r.email_confirmed_at is null)::int,
    'active30Days',count(*) filter (where r.last_sign_in_at >= now()-interval '30 days')::int,
    'teamInviteSignups',count(*) filter (where r.signup_source='team_invite')::int
  )
  into metrics_json
  from public.live_account_registry r;

  select coalesce(jsonb_agg(account_row order by registered_at desc,email asc),'[]'::jsonb)
  into accounts_json
  from (
    select
      r.registered_at,
      r.email,
      jsonb_build_object(
        'userId',r.user_id,
        'email',r.email,
        'displayName',coalesce(nullif(trim(p.display_name),''),nullif(trim(r.display_name),''),split_part(r.email,'@',1),'WPI account'),
        'signupSource',r.signup_source,
        'registeredAt',r.registered_at,
        'emailConfirmedAt',r.email_confirmed_at,
        'lastSignInAt',r.last_sign_in_at,
        'initialTeamId',r.initial_team_id,
        'initialTeamName',initial_team.name,
        'memberships',coalesce(membership_rows.memberships,'[]'::jsonb)
      ) as account_row
    from public.live_account_registry r
    left join public.live_profiles p on p.user_id=r.user_id
    left join public.live_teams initial_team on initial_team.id=r.initial_team_id
    left join lateral (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'teamId',t.id,
          'teamName',t.name,
          'role',m.role,
          'joinedAt',m.created_at
        ) order by t.name,m.created_at
      ),'[]'::jsonb) as memberships
      from public.live_team_members m
      join public.live_teams t on t.id=m.team_id
      where m.user_id=r.user_id
    ) membership_rows on true
  ) rows;

  return jsonb_build_object(
    'isPlatformOwner',true,
    'generatedAt',now(),
    'metrics',metrics_json,
    'accounts',accounts_json
  );
end;
$$;

revoke all on function public.live_platform_account_registry_v1() from public,anon;
grant execute on function public.live_platform_account_registry_v1() to authenticated;

comment on function public.live_platform_account_registry_v1() is
  'Platform-Owner-only operational account directory. Returns name/email/signup and account lifecycle fields plus team memberships; never returns passwords, tokens, or secrets.';
