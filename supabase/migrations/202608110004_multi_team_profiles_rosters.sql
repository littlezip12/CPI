-- WPI 7.58.2 — Multi-Team Profiles & Rosters.
-- Adds season-aware immutable roster versions and safe per-team profile/default-lineup
-- operations while preserving stable live_teams.id and every historical game roster_id.

alter table public.live_rosters
  add column if not exists version_number integer not null default 1,
  add column if not exists source_roster_id uuid references public.live_rosters(id) on delete set null,
  add column if not exists activated_at timestamptz,
  add column if not exists retired_at timestamptz;

comment on column public.live_rosters.version_number is
  'Monotonic roster version within one team and competitive season. Historical versions remain available for games already linked to them.';
comment on column public.live_rosters.source_roster_id is
  'Prior roster version used as the source when this version was created.';

-- Backfill deterministic version numbers without deleting any historical rows.
with ranked as (
  select id,
         row_number() over (
           partition by team_id,competitive_season
           order by created_at asc,id asc
         )::integer as version_number
  from public.live_rosters
)
update public.live_rosters r
set version_number=ranked.version_number
from ranked
where r.id=ranked.id;

-- If legacy data ever produced more than one active roster for the same team and
-- season, preserve every row but retire all except the newest before enforcing
-- the one-current-roster invariant.
with active_ranked as (
  select id,
         row_number() over (
           partition by team_id,competitive_season
           order by updated_at desc,created_at desc,id desc
         ) as active_rank
  from public.live_rosters
  where active=true
)
update public.live_rosters r
set active=false,
    retired_at=coalesce(r.retired_at,now())
from active_ranked a
where r.id=a.id and a.active_rank>1;

update public.live_rosters
set activated_at=coalesce(activated_at,created_at);

alter table public.live_rosters
  alter column activated_at set default now(),
  alter column activated_at set not null;

create unique index if not exists live_rosters_one_active_team_season_idx
  on public.live_rosters(team_id,competitive_season)
  where active=true;

create index if not exists live_rosters_team_season_version_idx
  on public.live_rosters(team_id,competitive_season,version_number desc,created_at desc);

-- Current workspace always resolves the active roster for the selected team's
-- current competitive season. An old-season roster is never silently loaded
-- into a new-season team context.
create or replace function public.live_team_workspace_v3(target_team_id uuid)
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
  next_version integer := 1;
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
  where team_id=selected_team.id
    and competitive_season=selected_team.competitive_season
    and active=true
  order by version_number desc,created_at desc
  limit 1;

  if selected_roster.id is null then
    select coalesce(max(version_number),0)+1 into next_version
    from public.live_rosters
    where team_id=selected_team.id
      and competitive_season=selected_team.competitive_season;

    insert into public.live_rosters(
      team_id,competitive_season,label,active,created_by,version_number,activated_at
    ) values (
      selected_team.id,selected_team.competitive_season,
      selected_team.name || ' roster',true,selected_team.owner_id,next_version,now()
    )
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
    'rosterVersion',selected_roster.version_number,
    'rosterSeason',selected_roster.competitive_season,
    'rosterLabel',selected_roster.label,
    'rosterCreatedAt',selected_roster.created_at,
    'rosterActivatedAt',selected_roster.activated_at,
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

grant execute on function public.live_team_workspace_v3(uuid) to authenticated;

create or replace function public.live_update_team_profile_v1(
  target_team_id uuid,
  requested_team_name text,
  requested_age_group text,
  requested_gender text default null,
  requested_squad_label text default null,
  requested_display_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  cleaned_name text := nullif(trim(coalesce(requested_team_name,'')),'');
  cleaned_age text := nullif(trim(coalesce(requested_age_group,'')),'');
  cleaned_gender text := nullif(trim(coalesce(requested_gender,'')),'');
  cleaned_squad text := nullif(trim(coalesce(requested_squad_label,'')),'');
  cleaned_label text := nullif(trim(coalesce(requested_display_label,'')),'');
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Team Owner or Admin access is required';
  end if;
  if cleaned_name is null then raise exception 'Team name is required'; end if;
  if char_length(cleaned_name)>100 then raise exception 'Team name must be 100 characters or fewer'; end if;
  if cleaned_age not in ('10U','12U','14U','16U','18U') then raise exception 'Choose a supported age group'; end if;
  if cleaned_gender is not null and cleaned_gender not in ('Boys','Girls','Coed') then raise exception 'Gender must be Boys, Girls, or Coed'; end if;
  if cleaned_squad is not null and char_length(cleaned_squad)>30 then raise exception 'Squad / division must be 30 characters or fewer'; end if;
  if cleaned_label is not null and char_length(cleaned_label)>100 then raise exception 'Display label must be 100 characters or fewer'; end if;

  if cleaned_label is null then
    cleaned_label := trim(concat_ws(' ',cleaned_age,cleaned_gender,cleaned_squad));
    if cleaned_label='' then cleaned_label := cleaned_name; end if;
  end if;

  update public.live_teams
  set name=cleaned_name,
      age_group=cleaned_age,
      gender=cleaned_gender,
      squad_label=cleaned_squad,
      display_label=cleaned_label,
      updated_at=now()
  where id=target_team_id;

  return public.live_team_workspace_v3(target_team_id);
end;
$$;

grant execute on function public.live_update_team_profile_v1(uuid,text,text,text,text,text) to authenticated;

create or replace function public.live_list_team_roster_versions_v1(target_team_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select case
    when not public.live_is_team_member(target_team_id) then '[]'::jsonb
    else coalesce((
      select jsonb_agg(jsonb_build_object(
        'rosterId',r.id,
        'competitiveSeason',r.competitive_season,
        'label',r.label,
        'versionNumber',r.version_number,
        'active',r.active,
        'playerCount',(select count(*) from public.live_players p where p.roster_id=r.id and p.active=true),
        'createdAt',r.created_at,
        'activatedAt',r.activated_at,
        'retiredAt',r.retired_at,
        'sourceRosterId',r.source_roster_id
      ) order by r.competitive_season desc,r.version_number desc,r.created_at desc)
      from public.live_rosters r
      where r.team_id=target_team_id
    ),'[]'::jsonb)
  end;
$$;

grant execute on function public.live_list_team_roster_versions_v1(uuid) to authenticated;

create or replace function public.live_save_roster_version_v1(
  target_team_id uuid,
  expected_roster_id uuid,
  requested_players jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  team_row public.live_teams%rowtype;
  current_roster public.live_rosters%rowtype;
  new_roster public.live_rosters%rowtype;
  next_version integer := 1;
  player_row jsonb;
  client_id text;
  cap_value text;
  name_value text;
  sort_value integer;
  old_default_count integer := 0;
  new_default_ids uuid[] := '{}';
  new_goalie_id uuid := null;
  mapped_count integer := 0;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Team Owner or Admin access is required';
  end if;

  select * into team_row from public.live_teams where id=target_team_id;
  if team_row.id is null then raise exception 'Team not found'; end if;

  select * into current_roster
  from public.live_rosters
  where team_id=target_team_id
    and competitive_season=team_row.competitive_season
    and active=true
  order by version_number desc,created_at desc
  limit 1;

  if current_roster.id is null then
    perform public.live_team_workspace_v3(target_team_id);
    select * into current_roster
    from public.live_rosters
    where team_id=target_team_id
      and competitive_season=team_row.competitive_season
      and active=true
    order by version_number desc,created_at desc
    limit 1;
  end if;

  if expected_roster_id is not null and current_roster.id<>expected_roster_id then
    raise exception 'This roster changed in another session. Refresh before saving so no team data is overwritten.';
  end if;

  if requested_players is null or jsonb_typeof(requested_players)<>'array' or jsonb_array_length(requested_players)=0 then
    raise exception 'Add at least one player before saving';
  end if;

  select coalesce(max(version_number),0)+1 into next_version
  from public.live_rosters
  where team_id=target_team_id and competitive_season=team_row.competitive_season;

  insert into public.live_rosters(
    team_id,competitive_season,label,active,created_by,version_number,source_roster_id,activated_at
  ) values (
    target_team_id,team_row.competitive_season,
    team_row.name || ' roster · v' || next_version,false,caller,next_version,current_roster.id,now()
  ) returning * into new_roster;

  for player_row in select value from jsonb_array_elements(requested_players)
  loop
    client_id := nullif(trim(coalesce(player_row->>'clientPlayerId','')),'');
    cap_value := upper(regexp_replace(trim(coalesce(player_row->>'cap','')),'^#','','g'));
    name_value := regexp_replace(trim(coalesce(player_row->>'name','')),'[[:space:]]+',' ','g');
    sort_value := coalesce(nullif(player_row->>'sortOrder','')::integer,0);

    if client_id is null then client_id := 'player-' || replace(gen_random_uuid()::text,'-',''); end if;
    if cap_value='' or name_value='' then raise exception 'Every roster row needs both a cap number and player name'; end if;
    if char_length(cap_value)>3 then raise exception 'Cap number % is too long',cap_value; end if;
    if char_length(name_value)>100 then raise exception 'Player name must be 100 characters or fewer'; end if;
    if exists(select 1 from public.live_players p where p.roster_id=new_roster.id and p.cap_number=cap_value) then
      raise exception 'Cap number % appears more than once',cap_value;
    end if;
    if exists(select 1 from public.live_players p where p.roster_id=new_roster.id and p.client_player_id=client_id) then
      raise exception 'The roster contains the same player identity more than once';
    end if;

    insert into public.live_players(
      roster_id,client_player_id,cap_number,display_name,active,sort_order,
      created_by,updated_by,updated_at
    ) values (
      new_roster.id,client_id,cap_value,name_value,true,sort_value,caller,caller,now()
    );
  end loop;

  old_default_count := cardinality(coalesce(team_row.default_lineup_player_ids,'{}'::uuid[]));

  if old_default_count>0 then
    select coalesce(array_agg(np.id order by old_ids.ordinality),'{}'::uuid[]),count(np.id)
      into new_default_ids,mapped_count
    from unnest(team_row.default_lineup_player_ids) with ordinality old_ids(old_id,ordinality)
    join public.live_players op
      on op.id=old_ids.old_id and op.roster_id=current_roster.id
    join public.live_players np
      on np.roster_id=new_roster.id
     and np.client_player_id=op.client_player_id
     and np.active=true;
  end if;

  if team_row.default_goalie_id is not null then
    select np.id into new_goalie_id
    from public.live_players op
    join public.live_players np
      on np.roster_id=new_roster.id
     and np.client_player_id=op.client_player_id
     and np.active=true
    where op.id=team_row.default_goalie_id
      and op.roster_id=current_roster.id
    limit 1;
  end if;

  update public.live_rosters
  set active=false,retired_at=coalesce(retired_at,now())
  where team_id=target_team_id
    and competitive_season=team_row.competitive_season
    and active=true;

  update public.live_rosters
  set active=true,activated_at=now(),retired_at=null
  where id=new_roster.id;

  if old_default_count>0 and mapped_count=old_default_count and new_goalie_id is not null and new_goalie_id=any(new_default_ids) then
    update public.live_teams
    set default_lineup_player_ids=new_default_ids,
        default_goalie_id=new_goalie_id,
        updated_at=now()
    where id=target_team_id;
  else
    update public.live_teams
    set default_lineup_player_ids='{}'::uuid[],
        default_goalie_id=null,
        updated_at=now()
    where id=target_team_id;
  end if;

  return public.live_team_workspace_v3(target_team_id);
end;
$$;

grant execute on function public.live_save_roster_version_v1(uuid,uuid,jsonb) to authenticated;

create or replace function public.live_set_default_lineup_v1(
  target_team_id uuid,
  target_roster_id uuid,
  requested_player_ids uuid[],
  requested_goalie_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  team_row public.live_teams%rowtype;
  current_roster public.live_rosters%rowtype;
  expected_total integer;
  requested_total integer;
  valid_total integer;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Team Owner or Admin access is required';
  end if;

  select * into team_row from public.live_teams where id=target_team_id;
  if team_row.id is null then raise exception 'Team not found'; end if;

  select * into current_roster
  from public.live_rosters
  where id=target_roster_id
    and team_id=target_team_id
    and competitive_season=team_row.competitive_season
    and active=true;

  if current_roster.id is null then
    raise exception 'The selected roster is not the current roster for this team and season';
  end if;

  requested_total := cardinality(coalesce(requested_player_ids,'{}'::uuid[]));
  if requested_total=0 and requested_goalie_id is null then
    update public.live_teams
    set default_lineup_player_ids='{}'::uuid[],default_goalie_id=null,updated_at=now()
    where id=target_team_id;
    return public.live_team_workspace_v3(target_team_id);
  end if;

  expected_total := case
    when coalesce(nullif(regexp_replace(team_row.age_group,'[^0-9]','','g'),''),'14')::integer <= 12 then 6
    else 7
  end;

  if requested_total<>expected_total then
    raise exception 'Choose exactly % starters for %',expected_total,team_row.age_group;
  end if;
  if requested_goalie_id is null or not (requested_goalie_id=any(requested_player_ids)) then
    raise exception 'Choose one goalie from the selected starters';
  end if;
  if cardinality(array(select distinct unnest(requested_player_ids)))<>requested_total then
    raise exception 'A starter cannot be selected more than once';
  end if;

  select count(*) into valid_total
  from public.live_players p
  where p.roster_id=current_roster.id
    and p.active=true
    and p.id=any(requested_player_ids);

  if valid_total<>requested_total then
    raise exception 'Every default starter must belong to the current roster';
  end if;

  update public.live_teams
  set default_lineup_player_ids=requested_player_ids,
      default_goalie_id=requested_goalie_id,
      updated_at=now()
  where id=target_team_id;

  return public.live_team_workspace_v3(target_team_id);
end;
$$;

grant execute on function public.live_set_default_lineup_v1(uuid,uuid,uuid[],uuid) to authenticated;
