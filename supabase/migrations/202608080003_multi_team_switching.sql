-- WPI 7.57.3 — Multi-Team & Team Switching.
-- Membership discovery and workspace selection are validated server-side.
-- No credentials or provider secrets are stored here.

create or replace function public.live_list_user_teams()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(row_data order by sort_role, sort_name), '[]'::jsonb)
  from (
    select
      case m.role when 'owner' then 0 when 'admin' then 1 when 'scorer' then 2 else 3 end as sort_role,
      lower(t.name) as sort_name,
      jsonb_build_object(
        'teamId', t.id,
        'teamName', t.name,
        'teamSlug', t.slug,
        'ageGroup', t.age_group,
        'competitiveSeason', t.competitive_season,
        'role', m.role,
        'canManageGroupMe', case when m.role='owner' then true else coalesce(m.can_manage_groupme,false) end,
        'activeGameCount', (
          select count(*) from public.live_games g
          where g.team_id=t.id and g.status not in ('final','cancelled')
        )
      ) as row_data
    from public.live_team_members m
    join public.live_teams t on t.id=m.team_id
    where m.user_id=auth.uid()
  ) rows;
$$;

grant execute on function public.live_list_user_teams() to authenticated;

create or replace function public.live_team_workspace(target_team_id uuid)
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
    'teamSlug',selected_team.slug,
    'ageGroup',selected_team.age_group,
    'competitiveSeason',selected_team.competitive_season,
    'role',selected_role,
    'canManageGroupMe',case when selected_role='owner' then true else selected_groupme end,
    'rosterId',selected_roster.id,
    'defaultLineupPlayerIds',selected_team.default_lineup_player_ids,
    'defaultGoalieId',selected_team.default_goalie_id
  );
end;
$$;

grant execute on function public.live_team_workspace(uuid) to authenticated;

create or replace function public.live_create_additional_team(
  requested_team_name text,
  requested_age_group text default '14U',
  requested_season text default '2026-2027'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  created_team public.live_teams%rowtype;
  created_roster public.live_rosters%rowtype;
  final_slug text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not exists(
    select 1 from public.live_team_members
    where user_id=caller and role='owner'
  ) then
    raise exception 'An existing Team Owner may create an additional team';
  end if;
  if nullif(trim(coalesce(requested_team_name,'')),'') is null then
    raise exception 'Team name is required';
  end if;
  if char_length(trim(requested_team_name)) > 100 then
    raise exception 'Team name must be 100 characters or fewer';
  end if;

  final_slug := regexp_replace(lower(trim(requested_team_name)),'[^a-z0-9]+','-','g');
  final_slug := trim(both '-' from final_slug);
  if final_slug='' then final_slug := 'wpi-live-team'; end if;
  if exists(select 1 from public.live_teams where slug=final_slug) then
    final_slug := final_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  end if;

  insert into public.live_teams(name,slug,owner_id,age_group,competitive_season)
  values (
    trim(requested_team_name),
    final_slug,
    caller,
    coalesce(nullif(trim(requested_age_group),''),'14U'),
    coalesce(nullif(trim(requested_season),''),'2026-2027')
  )
  returning * into created_team;

  insert into public.live_rosters(team_id,competitive_season,label,active,created_by)
  values (created_team.id,created_team.competitive_season,created_team.name || ' roster',true,caller)
  returning * into created_roster;

  return jsonb_build_object(
    'teamId',created_team.id,
    'teamName',created_team.name,
    'teamSlug',created_team.slug,
    'ageGroup',created_team.age_group,
    'competitiveSeason',created_team.competitive_season,
    'role','owner',
    'canManageGroupMe',true,
    'rosterId',created_roster.id,
    'defaultLineupPlayerIds',created_team.default_lineup_player_ids,
    'defaultGoalieId',created_team.default_goalie_id
  );
end;
$$;

grant execute on function public.live_create_additional_team(text,text,text) to authenticated;
