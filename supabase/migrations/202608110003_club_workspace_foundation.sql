-- WPI 7.58.0 — Club Workspace Foundation.
-- Additive Club -> Teams hierarchy around the existing stable live_teams.id.
-- IMPORTANT: existing team IDs are never replaced. Rosters, members, GroupMe
-- destinations, games, series, scorer history, deliveries, and archives remain
-- attached to the same team_id they already use.

create extension if not exists pgcrypto;

do $$
begin
  create type public.live_club_role as enum ('owner','admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.live_clubs (
  id uuid primary key default gen_random_uuid(),
  canonical_wpi_club_id text unique,
  canonical_slug text,
  name text not null check (char_length(trim(name)) between 1 and 120),
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  logo_url text,
  region text,
  owner_id uuid not null references auth.users(id) on delete restrict,
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_club_members (
  club_id uuid not null references public.live_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.live_club_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (club_id,user_id)
);

alter table public.live_teams
  add column if not exists club_id uuid references public.live_clubs(id) on delete restrict,
  add column if not exists canonical_wpi_team_id text,
  add column if not exists display_label text,
  add column if not exists gender text,
  add column if not exists squad_label text,
  add column if not exists active boolean not null default true;

create index if not exists live_teams_club_season_idx
  on public.live_teams(club_id,competitive_season,active,age_group,name);

create unique index if not exists live_teams_canonical_wpi_team_id_idx
  on public.live_teams(canonical_wpi_team_id)
  where canonical_wpi_team_id is not null;

create index if not exists live_club_members_user_idx
  on public.live_club_members(user_id,club_id);

comment on table public.live_clubs is
  'WPI Live club workspace parent. canonical_wpi_club_id links the private workspace to the shared public WPI identity registry.';
comment on column public.live_teams.club_id is
  'Stable club parent for this team. Changing dashboard selection never changes this value or migrates dependent records.';
comment on column public.live_teams.canonical_wpi_team_id is
  'Optional shared public WPI team identity. Keep null when a current-season canonical match has not been verified.';
comment on column public.live_teams.display_label is
  'Concise team label inside a club workspace, for example 14U Boys A. live_teams.name remains the full scoring identity.';

-- Safe pilot backfill. Only explicit Lamorinda identities are linked. The
-- distinct Lamorinda Brentwood club is intentionally excluded. No other
-- legacy team is guessed into a club.
do $$
declare
  lamorinda_owner uuid;
  lamorinda_club_id uuid;
begin
  select t.owner_id into lamorinda_owner
  from public.live_teams t
  where (
      t.slug='lamorinda-a-14u-boys'
      or lower(trim(t.name))='lamorinda a 14u boys'
      or lower(trim(t.name)) like 'lamorinda %'
    )
    and lower(trim(t.name)) not like 'lamorinda brentwood%'
    and t.slug not like 'lamorinda-brentwood%'
  order by
    case when t.slug='lamorinda-a-14u-boys' then 0 else 1 end,
    t.created_at asc
  limit 1;

  if lamorinda_owner is not null then
    insert into public.live_clubs(
      canonical_wpi_club_id,canonical_slug,name,display_name,logo_url,region,
      owner_id,created_by
    ) values (
      'club-lamorinda','lamorinda','Lamorinda','Lamorinda Water Polo',
      'assets/logos/canonical/lamorinda.webp','East Bay',
      lamorinda_owner,lamorinda_owner
    )
    on conflict (canonical_wpi_club_id) do update
      set canonical_slug=excluded.canonical_slug,
          name=excluded.name,
          display_name=excluded.display_name,
          logo_url=excluded.logo_url,
          region=excluded.region,
          updated_at=now()
    returning id into lamorinda_club_id;

    update public.live_teams
    set club_id=lamorinda_club_id,
        gender=coalesce(gender,case
          when lower(name) like '%girls%' then 'Girls'
          when lower(name) like '%boys%' then 'Boys'
          when lower(name) like '%coed%' then 'Coed'
          else null
        end),
        squad_label=coalesce(squad_label,case
          when lower(name) ~ '(^|[[:space:]])a([[:space:]]|$)' or slug like 'lamorinda-a-%' then 'A'
          when lower(name) ~ '(^|[[:space:]])b([[:space:]]|$)' or slug like 'lamorinda-b-%' then 'B'
          when lower(name) ~ '(^|[[:space:]])c([[:space:]]|$)' or slug like 'lamorinda-c-%' then 'C'
          else null
        end),
        display_label=coalesce(display_label,case
          when age_group is not null and lower(name) like '%boys%' then
            trim(age_group || ' Boys ' || coalesce(case
              when lower(name) ~ '(^|[[:space:]])a([[:space:]]|$)' or slug like 'lamorinda-a-%' then 'A'
              when lower(name) ~ '(^|[[:space:]])b([[:space:]]|$)' or slug like 'lamorinda-b-%' then 'B'
              when lower(name) ~ '(^|[[:space:]])c([[:space:]]|$)' or slug like 'lamorinda-c-%' then 'C'
              else null end,''))
          when age_group is not null and lower(name) like '%girls%' then
            trim(age_group || ' Girls ' || coalesce(case
              when lower(name) ~ '(^|[[:space:]])a([[:space:]]|$)' or slug like 'lamorinda-a-%' then 'A'
              when lower(name) ~ '(^|[[:space:]])b([[:space:]]|$)' or slug like 'lamorinda-b-%' then 'B'
              when lower(name) ~ '(^|[[:space:]])c([[:space:]]|$)' or slug like 'lamorinda-c-%' then 'C'
              else null end,''))
          else name
        end),
        updated_at=now()
    where club_id is null
      and (
        slug like 'lamorinda-%'
        or lower(trim(name))='lamorinda'
        or lower(trim(name)) like 'lamorinda %'
      )
      and slug not like 'lamorinda-brentwood%'
      and lower(trim(name)) not like 'lamorinda brentwood%';

    -- Grant the club workspace only to the verified pilot Owner. Do not infer
    -- club-level authority for owners/admins of other team records; team access
    -- remains team-specific until an explicit club permission is granted.
    insert into public.live_club_members(club_id,user_id,role)
    values (lamorinda_club_id,lamorinda_owner,'owner'::public.live_club_role)
    on conflict (club_id,user_id) do update
      set role='owner'::public.live_club_role,updated_at=now();
  end if;
end $$;

create or replace function public.live_is_club_member(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.live_club_members m
    where m.club_id=target_club_id and m.user_id=auth.uid()
  );
$$;

create or replace function public.live_has_club_role(target_club_id uuid, allowed_roles public.live_club_role[])
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.live_club_members m
    where m.club_id=target_club_id
      and m.user_id=auth.uid()
      and m.role=any(allowed_roles)
  );
$$;

grant execute on function public.live_is_club_member(uuid) to authenticated;
grant execute on function public.live_has_club_role(uuid,public.live_club_role[]) to authenticated;

alter table public.live_clubs enable row level security;
alter table public.live_club_members enable row level security;

drop policy if exists live_clubs_member_read on public.live_clubs;
create policy live_clubs_member_read
  on public.live_clubs for select to authenticated
  using (public.live_is_club_member(id));

drop policy if exists live_clubs_manager_update on public.live_clubs;
create policy live_clubs_manager_update
  on public.live_clubs for update to authenticated
  using (public.live_has_club_role(id,array['owner','admin']::public.live_club_role[]))
  with check (public.live_has_club_role(id,array['owner','admin']::public.live_club_role[]));

drop policy if exists live_club_members_member_read on public.live_club_members;
create policy live_club_members_member_read
  on public.live_club_members for select to authenticated
  using (public.live_is_club_member(club_id));

drop policy if exists live_club_members_owner_manage on public.live_club_members;
create policy live_club_members_owner_manage
  on public.live_club_members for all to authenticated
  using (public.live_has_club_role(club_id,array['owner']::public.live_club_role[]))
  with check (public.live_has_club_role(club_id,array['owner']::public.live_club_role[]));

create or replace function public.live_list_user_teams_v2()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(row_data order by sort_club,sort_role,sort_age,sort_name),'[]'::jsonb)
  from (
    select
      lower(coalesce(c.display_name,c.name,'~')) as sort_club,
      case m.role when 'owner' then 0 when 'admin' then 1 when 'scorer' then 2 else 3 end as sort_role,
      coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'999')::integer as sort_age,
      lower(coalesce(t.display_label,t.name)) as sort_name,
      jsonb_build_object(
        'teamId',t.id,
        'teamName',t.name,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'teamSlug',t.slug,
        'ageGroup',t.age_group,
        'gender',t.gender,
        'squadLabel',t.squad_label,
        'competitiveSeason',t.competitive_season,
        'canonicalWpiTeamId',t.canonical_wpi_team_id,
        'teamActive',t.active,
        'role',m.role,
        'canManageGroupMe',case when m.role='owner' then true else coalesce(m.can_manage_groupme,false) end,
        'clubId',c.id,
        'clubName',c.name,
        'clubDisplayName',c.display_name,
        'clubCanonicalWpiId',c.canonical_wpi_club_id,
        'clubCanonicalSlug',c.canonical_slug,
        'clubLogoUrl',c.logo_url,
        'clubRegion',c.region,
        'clubRole',cm.role,
        'activeGameCount',(
          select count(*) from public.live_games g
          where g.team_id=t.id and g.status not in ('final','cancelled')
        )
      ) as row_data
    from public.live_team_members m
    join public.live_teams t on t.id=m.team_id
    left join public.live_clubs c on c.id=t.club_id
    left join public.live_club_members cm on cm.club_id=c.id and cm.user_id=m.user_id
    where m.user_id=auth.uid()
  ) rows;
$$;

grant execute on function public.live_list_user_teams_v2() to authenticated;

create or replace function public.live_list_user_clubs_v1()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(row_data order by sort_name),'[]'::jsonb)
  from (
    select
      lower(c.display_name) as sort_name,
      jsonb_build_object(
        'clubId',c.id,
        'clubName',c.name,
        'clubDisplayName',c.display_name,
        'canonicalWpiClubId',c.canonical_wpi_club_id,
        'canonicalSlug',c.canonical_slug,
        'logoUrl',c.logo_url,
        'region',c.region,
        'role',m.role,
        'teamCount',(select count(*) from public.live_teams t where t.club_id=c.id and t.active=true),
        'liveGameCount',(
          select count(*) from public.live_games g
          join public.live_teams t on t.id=g.team_id
          where t.club_id=c.id and g.status='live'
        ),
        'needsScorerCount',(
          select count(*) from public.live_games g
          join public.live_teams t on t.id=g.team_id
          where t.club_id=c.id
            and g.status in ('setup','scheduled')
            and g.assigned_scorer_user_id is null
        )
      ) as row_data
    from public.live_club_members m
    join public.live_clubs c on c.id=m.club_id
    where m.user_id=auth.uid() and c.active=true
  ) rows;
$$;

grant execute on function public.live_list_user_clubs_v1() to authenticated;

create or replace function public.live_team_workspace_v2(target_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  selected_team public.live_teams%rowtype;
  selected_role public.live_team_role;
  selected_groupme boolean := false;
  selected_roster public.live_rosters%rowtype;
  selected_club public.live_clubs%rowtype;
  selected_club_role public.live_club_role;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select t.* into selected_team
  from public.live_team_members m
  join public.live_teams t on t.id=m.team_id
  where m.user_id=caller and m.team_id=target_team_id;

  if selected_team.id is null then
    raise exception 'You do not have access to this team workspace';
  end if;

  select m.role,coalesce(m.can_manage_groupme,false)
    into selected_role,selected_groupme
  from public.live_team_members m
  where m.user_id=caller and m.team_id=target_team_id;

  if selected_team.club_id is not null then
    select * into selected_club from public.live_clubs where id=selected_team.club_id;
    select role into selected_club_role
    from public.live_club_members
    where club_id=selected_team.club_id and user_id=caller;
  end if;

  select * into selected_roster
  from public.live_rosters
  where team_id=selected_team.id and active=true
  order by created_at desc
  limit 1;

  if selected_roster.id is null then
    insert into public.live_rosters(team_id,competitive_season,label,active,created_by)
    values (selected_team.id,selected_team.competitive_season,selected_team.name || ' roster',true,caller)
    returning * into selected_roster;
  end if;

  return jsonb_build_object(
    'teamId',selected_team.id,
    'teamName',selected_team.name,
    'teamDisplayLabel',coalesce(nullif(trim(selected_team.display_label),''),selected_team.name),
    'teamSlug',selected_team.slug,
    'ageGroup',selected_team.age_group,
    'gender',selected_team.gender,
    'squadLabel',selected_team.squad_label,
    'competitiveSeason',selected_team.competitive_season,
    'canonicalWpiTeamId',selected_team.canonical_wpi_team_id,
    'teamActive',selected_team.active,
    'role',selected_role,
    'canManageGroupMe',case when selected_role='owner' then true else selected_groupme end,
    'rosterId',selected_roster.id,
    'defaultLineupPlayerIds',selected_team.default_lineup_player_ids,
    'defaultGoalieId',selected_team.default_goalie_id,
    'clubId',selected_club.id,
    'clubName',selected_club.name,
    'clubDisplayName',selected_club.display_name,
    'clubCanonicalWpiId',selected_club.canonical_wpi_club_id,
    'clubCanonicalSlug',selected_club.canonical_slug,
    'clubLogoUrl',selected_club.logo_url,
    'clubRegion',selected_club.region,
    'clubRole',selected_club_role
  );
end;
$$;

grant execute on function public.live_team_workspace_v2(uuid) to authenticated;

create or replace function public.live_club_workspace_v1(target_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  selected_club public.live_clubs%rowtype;
  selected_role public.live_club_role;
  team_rows jsonb := '[]'::jsonb;
  operational_rows jsonb := '[]'::jsonb;
  final_rows jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into selected_club
  from public.live_clubs
  where id=target_club_id;

  select role into selected_role
  from public.live_club_members
  where club_id=target_club_id and user_id=caller;

  if selected_club.id is null or selected_role is null then
    raise exception 'Club workspace access required';
  end if;

  select coalesce(jsonb_agg(row_data order by sort_age,sort_gender,sort_squad,sort_name),'[]'::jsonb)
  into team_rows
  from (
    select
      coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'999')::integer as sort_age,
      lower(coalesce(t.gender,'')) as sort_gender,
      lower(coalesce(t.squad_label,'')) as sort_squad,
      lower(coalesce(t.display_label,t.name)) as sort_name,
      jsonb_build_object(
        'teamId',t.id,
        'teamName',t.name,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,
        'gender',t.gender,
        'squadLabel',t.squad_label,
        'competitiveSeason',t.competitive_season,
        'canonicalWpiTeamId',t.canonical_wpi_team_id,
        'active',t.active,
        'myTeamRole',(select m.role from public.live_team_members m where m.team_id=t.id and m.user_id=caller),
        'rosterPlayerCount',coalesce((
          select count(*) from public.live_players p
          where p.roster_id=(
            select r.id from public.live_rosters r
            where r.team_id=t.id and r.active=true
            order by r.created_at desc limit 1
          ) and p.active=true
        ),0),
        'memberCount',(select count(*) from public.live_team_members m where m.team_id=t.id),
        'scorerEligibleCount',(select count(*) from public.live_team_members m where m.team_id=t.id and m.role in ('owner','admin','scorer')),
        'groupMeReady',exists(select 1 from public.live_destinations d where d.team_id=t.id and d.enabled=true),
        'liveGameCount',(select count(*) from public.live_games g where g.team_id=t.id and g.status='live'),
        'upcomingGameCount',(select count(*) from public.live_games g where g.team_id=t.id and g.status in ('setup','scheduled')),
        'needsScorerCount',(select count(*) from public.live_games g where g.team_id=t.id and g.status in ('setup','scheduled') and g.assigned_scorer_user_id is null),
        'recentFinalCount',(select count(*) from public.live_games g where g.team_id=t.id and g.status='final' and coalesce(g.ended_at,g.updated_at) >= now()-interval '14 days')
      ) as row_data
    from public.live_teams t
    where t.club_id=target_club_id and t.active=true
  ) teams;

  select coalesce(jsonb_agg(row_data order by sort_rank,sort_time asc nulls last,sort_updated desc),'[]'::jsonb)
  into operational_rows
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 else 3 end as sort_rank,
      g.scheduled_at as sort_time,
      g.updated_at as sort_updated,
      jsonb_build_object(
        'gameId',g.id,
        'teamId',g.team_id,
        'teamName',g.team_name_snapshot,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'opponentName',g.opponent_name,
        'scheduledAt',g.scheduled_at,
        'venue',g.venue,
        'status',g.status,
        'teamScore',g.team_score,
        'opponentScore',g.opponent_score,
        'assignedScorerUserId',g.assigned_scorer_user_id,
        'assignedScorerDisplayName',g.assigned_scorer_display_name,
        'gameKind',g.game_kind,
        'tournamentName',g.tournament_name,
        'seriesId',g.series_id
      ) as row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id
    where t.club_id=target_club_id
      and g.status in ('live','scheduled','setup')
    order by sort_rank,sort_time asc nulls last,sort_updated desc
    limit 30
  ) games;

  select coalesce(jsonb_agg(row_data order by sort_time desc),'[]'::jsonb)
  into final_rows
  from (
    select
      coalesce(g.ended_at,g.updated_at,g.scheduled_at) as sort_time,
      jsonb_build_object(
        'gameId',g.id,
        'teamId',g.team_id,
        'teamName',g.team_name_snapshot,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'opponentName',g.opponent_name,
        'scheduledAt',g.scheduled_at,
        'endedAt',g.ended_at,
        'teamScore',g.team_score,
        'opponentScore',g.opponent_score,
        'gameKind',g.game_kind,
        'tournamentName',g.tournament_name,
        'seriesId',g.series_id
      ) as row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id
    where t.club_id=target_club_id and g.status='final'
    order by sort_time desc
    limit 12
  ) finals;

  return jsonb_build_object(
    'clubId',selected_club.id,
    'clubName',selected_club.name,
    'clubDisplayName',selected_club.display_name,
    'canonicalWpiClubId',selected_club.canonical_wpi_club_id,
    'canonicalSlug',selected_club.canonical_slug,
    'logoUrl',selected_club.logo_url,
    'region',selected_club.region,
    'role',selected_role,
    'teams',team_rows,
    'operationalGames',operational_rows,
    'recentFinals',final_rows
  );
end;
$$;

grant execute on function public.live_club_workspace_v1(uuid) to authenticated;

create or replace function public.live_create_additional_team_v2(
  requested_club_id uuid,
  requested_team_name text,
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
  club_role public.live_club_role;
  created_team public.live_teams%rowtype;
  created_roster public.live_rosters%rowtype;
  final_slug text;
  cleaned_gender text := nullif(trim(coalesce(requested_gender,'')),'');
  cleaned_squad text := nullif(trim(coalesce(requested_squad_label,'')),'');
  cleaned_age text := coalesce(nullif(trim(requested_age_group),''),'14U');
  team_label text;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role into club_role
  from public.live_club_members
  where club_id=requested_club_id and user_id=caller;

  if club_role is null or club_role <> 'owner' then
    raise exception 'Club Owner access is required to create a team';
  end if;
  if nullif(trim(coalesce(requested_team_name,'')),'') is null then
    raise exception 'Team name is required';
  end if;
  if char_length(trim(requested_team_name)) > 100 then
    raise exception 'Team name must be 100 characters or fewer';
  end if;
  if cleaned_gender is not null and cleaned_gender not in ('Boys','Girls','Coed') then
    raise exception 'Gender must be Boys, Girls, or Coed';
  end if;

  final_slug := regexp_replace(lower(trim(requested_team_name)),'[^a-z0-9]+','-','g');
  final_slug := trim(both '-' from final_slug);
  if final_slug='' then final_slug := 'wpi-live-team'; end if;
  if exists(select 1 from public.live_teams where slug=final_slug) then
    final_slug := final_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  end if;

  team_label := trim(concat_ws(' ',cleaned_age,cleaned_gender,cleaned_squad));
  if team_label='' then team_label := trim(requested_team_name); end if;

  insert into public.live_teams(
    name,slug,owner_id,age_group,competitive_season,club_id,
    display_label,gender,squad_label,active
  ) values (
    trim(requested_team_name),final_slug,caller,cleaned_age,
    coalesce(nullif(trim(requested_season),''),'2026-2027'),requested_club_id,
    team_label,cleaned_gender,cleaned_squad,true
  )
  returning * into created_team;

  insert into public.live_rosters(team_id,competitive_season,label,active,created_by)
  values (created_team.id,created_team.competitive_season,created_team.name || ' roster',true,caller)
  returning * into created_roster;

  return public.live_team_workspace_v2(created_team.id);
end;
$$;

grant execute on function public.live_create_additional_team_v2(uuid,text,text,text,text,text) to authenticated;
