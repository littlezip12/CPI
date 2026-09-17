-- WPI 7.64.8 — Game-Day Speed & Storytelling
-- Supports name-only / cap-only permanent roster rows, event-level cap defaults,
-- and effective game cap lookup from the canonical game state snapshot.

-- Supabase CLI was not available in the build container, so this migration file
-- follows the repository's existing timestamp naming convention and must be run
-- through the normal WPI SQL workflow before pushing 7.64.8.

alter table public.live_players alter column cap_number drop not null;
alter table public.live_players alter column display_name drop not null;

alter table public.live_players drop constraint if exists live_players_cap_number_check;
alter table public.live_players drop constraint if exists live_players_display_name_check;
alter table public.live_players drop constraint if exists live_players_identity_present_check;

alter table public.live_players
  add constraint live_players_cap_number_check check (cap_number is null or char_length(trim(cap_number)) between 1 and 3),
  add constraint live_players_display_name_check check (display_name is null or char_length(trim(display_name)) between 1 and 100),
  add constraint live_players_identity_present_check check (nullif(trim(coalesce(cap_number,'')),'') is not null or nullif(trim(coalesce(display_name,'')),'') is not null);

alter table public.live_game_series
  add column if not exists player_cap_assignments jsonb not null default '{}'::jsonb;

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
    if cap_value='' and name_value='' then raise exception 'Every roster row needs a cap number, player name, or both'; end if;
    if cap_value<>'' and char_length(cap_value)>3 then raise exception 'Cap number % is too long',cap_value; end if;
    if name_value<>'' and char_length(name_value)>100 then raise exception 'Player name must be 100 characters or fewer'; end if;
    if cap_value<>'' and exists(select 1 from public.live_players p where p.roster_id=new_roster.id and p.cap_number=cap_value) then
      raise exception 'Cap number % appears more than once',cap_value;
    end if;
    if exists(select 1 from public.live_players p where p.roster_id=new_roster.id and p.client_player_id=client_id) then
      raise exception 'The roster contains the same player identity more than once';
    end if;

    insert into public.live_players(
      roster_id,client_player_id,cap_number,display_name,active,sort_order,
      created_by,updated_by,updated_at
    ) values (
      new_roster.id,client_id,nullif(cap_value,''),nullif(name_value,''),true,sort_value,caller,caller,now()
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



create or replace function public.live_game_player_cap_context_v1(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  series_row public.live_game_series%rowtype;
  players_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into game_row from public.live_games where id=target_game_id;
  if game_row.id is null then raise exception 'Game not found'; end if;
  if not public.live_can_view_game(game_row.id) then raise exception 'Game access required'; end if;
  if game_row.series_id is not null then select * into series_row from public.live_game_series where id=game_row.series_id; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'playerId',p.id,
    'clientPlayerId',p.client_player_id,
    'name',p.display_name,
    'defaultCap',p.cap_number,
    'seriesCap',nullif(trim(coalesce(series_row.player_cap_assignments->>p.client_player_id,'')),''),
    'gameCap',nullif(trim(coalesce(state_player.item->>'gameCap','')),''),
    'effectiveCap',coalesce(
      nullif(trim(coalesce(state_player.item->>'gameCap','')),''),
      nullif(trim(coalesce(series_row.player_cap_assignments->>p.client_player_id,'')),''),
      p.cap_number
    )
  ) order by p.sort_order,p.created_at),'[]'::jsonb)
  into players_json
  from public.live_players p
  left join lateral (
    select item
    from jsonb_array_elements(coalesce(game_row.state_snapshot->'setup'->'roster','[]'::jsonb)) item
    where (item->>'remoteId')=p.id::text or (p.client_player_id is not null and item->>'id'=p.client_player_id)
    limit 1
  ) state_player on true
  where p.roster_id=game_row.roster_id and p.active=true;

  return jsonb_build_object(
    'gameId',game_row.id,
    'teamId',game_row.team_id,
    'seriesId',series_row.id,
    'seriesName',series_row.name,
    'players',players_json
  );
end;
$$;

revoke execute on function public.live_game_player_cap_context_v1(uuid) from public,anon;
grant execute on function public.live_game_player_cap_context_v1(uuid) to authenticated;

create or replace function public.live_save_series_cap_assignments_v1(target_series_id uuid,requested_assignments jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  caller uuid := auth.uid();
  series_row public.live_game_series%rowtype;
  caller_role public.live_team_role;
  cleaned jsonb := '{}'::jsonb;
  key text;
  value text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into series_row from public.live_game_series where id=target_series_id;
  if series_row.id is null then raise exception 'Event not found'; end if;
  select role into caller_role from public.live_team_members where team_id=series_row.team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'Team Owner or Admin access is required to set event cap defaults'; end if;
  if requested_assignments is null or jsonb_typeof(requested_assignments)<>'object' then raise exception 'Cap assignments must be an object'; end if;

  for key,value in select * from jsonb_each_text(requested_assignments) loop
    value := upper(regexp_replace(trim(coalesce(value,'')),'^#','','g'));
    if value<>'' and char_length(value)>3 then raise exception 'Cap number % is too long',value; end if;
    if exists(select 1 from public.live_players p where p.roster_id in (select r.id from public.live_rosters r where r.team_id=series_row.team_id) and p.client_player_id=key) then
      cleaned := cleaned || jsonb_build_object(key,value);
    end if;
  end loop;

  update public.live_game_series set player_cap_assignments=cleaned,updated_at=now() where id=series_row.id;
  return jsonb_build_object('seriesId',series_row.id,'seriesName',series_row.name,'assignments',cleaned);
end;
$$;

revoke execute on function public.live_save_series_cap_assignments_v1(uuid,jsonb) from public,anon;
grant execute on function public.live_save_series_cap_assignments_v1(uuid,jsonb) to authenticated;
