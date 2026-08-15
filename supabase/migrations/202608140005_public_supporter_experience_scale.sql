-- WPI 7.60.3 — Public / Supporter Experience at Scale.
-- Stable team-family Following spans clubs without creating membership or any
-- operational authority. Existing direct live_team_follows remain compatible.
-- A family follow can surface read-only Live games only after a Live team has
-- been explicitly linked to that canonical family by the 7.60.2 identity layer.

create table if not exists public.live_public_team_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  canonical_wpi_team_family_key text not null check (char_length(trim(canonical_wpi_team_family_key)) between 5 and 220),
  canonical_wpi_club_id text not null check (char_length(trim(canonical_wpi_club_id)) between 3 and 120),
  canonical_display_name text not null check (char_length(trim(canonical_display_name)) between 1 and 180),
  age_group text,
  gender text,
  squad_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,canonical_wpi_team_family_key)
);

create index if not exists live_public_team_follows_club_idx
  on public.live_public_team_follows(canonical_wpi_club_id,user_id);

comment on table public.live_public_team_follows is
  'Read-only supporter preference keyed to stable WPI team-family identity. It is never team membership or scoring/admin authority.';

alter table public.live_public_team_follows enable row level security;
revoke all on public.live_public_team_follows from anon,authenticated;

drop policy if exists "public team follows direct access denied" on public.live_public_team_follows;
create policy "public team follows direct access denied" on public.live_public_team_follows
  for all to authenticated using (false) with check (false);

-- Replace the pilot-only follower predicate with the scalable read-only rule.
-- The function name is preserved because existing game/team/recap RLS already
-- delegates read visibility to it. Write policies still use membership/scorer
-- authority and are intentionally unchanged.
create or replace function public.live_is_team_follower(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.live_teams target
    where target.id=target_team_id
      and target.active=true
      and (
        exists (
          select 1 from public.live_team_follows direct_follow
          where direct_follow.user_id=auth.uid() and direct_follow.team_id=target.id
        )
        or (
          target.canonical_wpi_team_family_key is not null
          and exists (
            select 1 from public.live_public_team_follows family_follow
            where family_follow.user_id=auth.uid()
              and family_follow.canonical_wpi_team_family_key=target.canonical_wpi_team_family_key
          )
        )
      )
      and not exists (
        select 1 from public.live_team_members own
        where own.user_id=auth.uid() and own.team_id=target.id
      )
  );
$$;

revoke all on function public.live_is_team_follower(uuid) from public,anon;
grant execute on function public.live_is_team_follower(uuid) to authenticated;

-- Direct follow for an already-onboarded WPI Live team. Unlike the Lamorinda
-- pilot RPC, this is intentionally cross-club. It still creates no membership.
create or replace function public.live_set_team_follow_v2(
  target_team_id uuid,
  requested_follow boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  target_team public.live_teams%rowtype;
  target_club public.live_clubs%rowtype;
  existing_role public.live_team_role;
  label text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into target_team from public.live_teams where id=target_team_id and active=true;
  if target_team.id is null then raise exception 'Active WPI Live team not found'; end if;
  select * into target_club from public.live_clubs where id=target_team.club_id and active=true;
  if target_club.id is null then raise exception 'Active club not found'; end if;

  select role into existing_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  if existing_role is not null then
    delete from public.live_team_follows where user_id=caller and team_id=target_team_id;
    return jsonb_build_object('teamId',target_team_id,'following',false,'relationship','member','role',existing_role);
  end if;

  label := concat_ws(' · ',coalesce(nullif(trim(target_club.display_name),''),target_club.name),coalesce(nullif(trim(target_team.display_label),''),target_team.name));

  if coalesce(requested_follow,true) then
    insert into public.live_team_follows(user_id,team_id) values (caller,target_team_id)
    on conflict (user_id,team_id) do nothing;
    if target_team.canonical_wpi_team_family_key is not null and target_club.canonical_wpi_club_id is not null then
      insert into public.live_public_team_follows(
        user_id,canonical_wpi_team_family_key,canonical_wpi_club_id,canonical_display_name,age_group,gender,squad_label,updated_at
      ) values (
        caller,target_team.canonical_wpi_team_family_key,target_club.canonical_wpi_club_id,label,target_team.age_group,target_team.gender,target_team.squad_label,now()
      ) on conflict (user_id,canonical_wpi_team_family_key) do update set
        canonical_wpi_club_id=excluded.canonical_wpi_club_id,
        canonical_display_name=excluded.canonical_display_name,
        age_group=excluded.age_group,gender=excluded.gender,squad_label=excluded.squad_label,updated_at=now();
    end if;
  else
    delete from public.live_team_follows where user_id=caller and team_id=target_team_id;
    if target_team.canonical_wpi_team_family_key is not null then
      delete from public.live_public_team_follows
      where user_id=caller and canonical_wpi_team_family_key=target_team.canonical_wpi_team_family_key;
    end if;
  end if;

  return jsonb_build_object(
    'teamId',target_team_id,'following',coalesce(requested_follow,true),
    'relationship',case when coalesce(requested_follow,true) then 'following' else 'none' end,
    'canonicalWpiTeamFamilyKey',target_team.canonical_wpi_team_family_key
  );
end;
$$;

revoke all on function public.live_set_team_follow_v2(uuid,boolean) from public,anon;
grant execute on function public.live_set_team_follow_v2(uuid,boolean) to authenticated;

-- Stable public-directory follow. This works even before the club has a Live
-- workspace; games become visible only after a Live team is explicitly linked
-- to the same canonical family key.
create or replace function public.live_set_public_team_follow_v1(
  requested_family_key text,
  requested_wpi_club_id text,
  requested_display_name text,
  requested_age_group text default null,
  requested_gender text default null,
  requested_squad_label text default null,
  requested_follow boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  family_key text := nullif(trim(coalesce(requested_family_key,'')),'');
  club_key text := nullif(trim(coalesce(requested_wpi_club_id,'')),'');
  display_name text := nullif(trim(coalesce(requested_display_name,'')),'');
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if family_key is null or club_key is null or display_name is null then raise exception 'Canonical team family is required'; end if;
  if family_key not like club_key || '|%' then raise exception 'Team family does not match the selected club'; end if;

  if coalesce(requested_follow,true) then
    insert into public.live_public_team_follows(
      user_id,canonical_wpi_team_family_key,canonical_wpi_club_id,canonical_display_name,age_group,gender,squad_label,updated_at
    ) values (
      caller,family_key,club_key,display_name,nullif(trim(coalesce(requested_age_group,'')),''),
      nullif(trim(coalesce(requested_gender,'')),''),nullif(trim(coalesce(requested_squad_label,'')),''),now()
    ) on conflict (user_id,canonical_wpi_team_family_key) do update set
      canonical_wpi_club_id=excluded.canonical_wpi_club_id,
      canonical_display_name=excluded.canonical_display_name,
      age_group=excluded.age_group,gender=excluded.gender,squad_label=excluded.squad_label,updated_at=now();

    -- If a Live team is already explicitly linked to this family, mirror the
    -- preference into direct follows for backwards-compatible dashboard UX.
    insert into public.live_team_follows(user_id,team_id)
    select caller,t.id from public.live_teams t
    where t.active=true and t.canonical_wpi_team_family_key=family_key
      and not exists(select 1 from public.live_team_members m where m.user_id=caller and m.team_id=t.id)
    on conflict (user_id,team_id) do nothing;
  else
    delete from public.live_public_team_follows where user_id=caller and canonical_wpi_team_family_key=family_key;
    delete from public.live_team_follows f
    using public.live_teams t
    where f.user_id=caller and f.team_id=t.id and t.canonical_wpi_team_family_key=family_key;
  end if;

  return jsonb_build_object(
    'canonicalWpiTeamFamilyKey',family_key,
    'following',coalesce(requested_follow,true),
    'relationship',case when coalesce(requested_follow,true) then 'following' else 'none' end
  );
end;
$$;

revoke all on function public.live_set_public_team_follow_v1(text,text,text,text,text,text,boolean) from public,anon;
grant execute on function public.live_set_public_team_follow_v1(text,text,text,text,text,text,boolean) to authenticated;

-- One read-only consumer context for both the dedicated Supporter Hub and the
-- team-member dashboard. It deliberately excludes GroupMe configuration,
-- scorer sessions/control, roster administration and access-management data.
create or replace function public.live_following_overview_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  teams_json jsonb := '[]'::jsonb;
  family_follows_json jsonb := '[]'::jsonb;
  games_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select coalesce(jsonb_agg(row_data order by sort_club,sort_age,sort_name),'[]'::jsonb)
  into teams_json
  from (
    select lower(coalesce(c.display_name,c.name)) sort_club,
      coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'999')::integer sort_age,
      lower(coalesce(t.display_label,t.name)) sort_name,
      jsonb_build_object(
        'teamId',t.id,'teamName',t.name,'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,'gender',t.gender,'squadLabel',t.squad_label,'competitiveSeason',t.competitive_season,
        'clubId',t.club_id,'clubDisplayName',coalesce(nullif(trim(c.display_name),''),c.name),
        'canonicalWpiClubId',c.canonical_wpi_club_id,'canonicalWpiTeamFamilyKey',t.canonical_wpi_team_family_key,
        'logoUrl',c.logo_url,
        'isMember',exists(select 1 from public.live_team_members own where own.team_id=t.id and own.user_id=caller),
        'membershipRole',(select own.role from public.live_team_members own where own.team_id=t.id and own.user_id=caller),
        'isFollowing',public.live_is_team_follower(t.id),
        'canFollow',not exists(select 1 from public.live_team_members own where own.team_id=t.id and own.user_id=caller)
      ) row_data
    from public.live_teams t join public.live_clubs c on c.id=t.club_id
    where t.active=true and c.active=true
  ) rows;

  select coalesce(jsonb_agg(jsonb_build_object(
    'canonicalWpiTeamFamilyKey',f.canonical_wpi_team_family_key,
    'canonicalWpiClubId',f.canonical_wpi_club_id,
    'canonicalDisplayName',f.canonical_display_name,
    'ageGroup',f.age_group,'gender',f.gender,'squadLabel',f.squad_label,
    'followedAt',f.created_at,'updatedAt',f.updated_at,
    'liveTeamId',(select t.id from public.live_teams t where t.active=true and t.canonical_wpi_team_family_key=f.canonical_wpi_team_family_key order by t.created_at desc limit 1),
    'liveAvailable',exists(select 1 from public.live_teams t where t.active=true and t.canonical_wpi_team_family_key=f.canonical_wpi_team_family_key)
  ) order by lower(f.canonical_display_name)),'[]'::jsonb)
  into family_follows_json
  from public.live_public_team_follows f where f.user_id=caller;

  select coalesce(jsonb_agg(row_data order by sort_rank,sort_time asc nulls last,sort_updated desc),'[]'::jsonb)
  into games_json
  from (
    select case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end sort_rank,
      g.scheduled_at sort_time,g.updated_at sort_updated,
      jsonb_build_object(
        'id',g.id,'teamId',g.team_id,'teamName',g.team_name_snapshot,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'clubDisplayName',coalesce(nullif(trim(c.display_name),''),c.name),
        'canonicalWpiClubId',c.canonical_wpi_club_id,'canonicalWpiTeamFamilyKey',t.canonical_wpi_team_family_key,
        'opponentName',g.opponent_name,'opponentSourceName',coalesce(g.opponent_source_name,g.opponent_name),
        'scheduledAt',g.scheduled_at,'venue',g.venue,'ageGroup',g.age_group,'gender',t.gender,'squadLabel',t.squad_label,
        'status',g.status,'teamScore',g.team_score,'opponentScore',g.opponent_score,
        'startedAt',g.started_at,'endedAt',g.ended_at,'updatedAt',g.updated_at,
        'gameKind',g.game_kind,'tournamentName',g.tournament_name,'seriesName',series.name,
        'teamLogoUrl',coalesce(g.team_logo_url,c.logo_url),'opponentLogoUrl',g.opponent_logo_url,
        'relationship',case when exists(select 1 from public.live_team_members own where own.team_id=t.id and own.user_id=caller) then 'member' else 'following' end,
        'followingTeam',public.live_is_team_follower(t.id),'readOnly',public.live_is_team_follower(t.id)
      ) row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id
    join public.live_clubs c on c.id=t.club_id
    left join public.live_game_series series on series.id=g.series_id
    where g.status <> 'cancelled'
      and (
        exists(select 1 from public.live_team_members own where own.team_id=t.id and own.user_id=caller)
        or public.live_is_team_follower(t.id)
      )
      and (
        g.status in ('live','setup','scheduled')
        or coalesce(g.ended_at,g.updated_at,g.created_at) >= now()-interval '120 days'
      )
    order by sort_rank,sort_time asc nulls last,sort_updated desc
    limit 160
  ) game_rows;

  return jsonb_build_object(
    'teams',teams_json,
    'familyFollows',family_follows_json,
    'games',games_json,
    'policy','cross_club_read_only_team_family_following'
  );
end;
$$;

revoke all on function public.live_following_overview_v2() from public,anon;
grant execute on function public.live_following_overview_v2() to authenticated;
