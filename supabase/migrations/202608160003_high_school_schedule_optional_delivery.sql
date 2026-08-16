-- WPI 7.61.1 — High School Schedule → Game-Day Integration & Optional Delivery
-- Adds a first-class regular-season game kind for school schedules, source-backed
-- schedule reconciliation, and an explicit per-team score-delivery preference.
-- WPI Live scoring remains canonical whether or not GroupMe is configured.

alter table public.live_teams
  add column if not exists score_delivery_mode text not null default 'wpi_live_only';

do $$ begin
  alter table public.live_teams
    add constraint live_teams_score_delivery_mode_check
    check (score_delivery_mode in ('wpi_live_only','wpi_live_groupme'));
exception when duplicate_object then null; end $$;

comment on column public.live_teams.score_delivery_mode is
  'How supporters receive score updates for new games. WPI Live is always canonical; GroupMe is optional external delivery.';

-- Preserve existing teams that already have a proven GroupMe route.
update public.live_teams t
set score_delivery_mode='wpi_live_groupme',updated_at=now()
where exists(
  select 1 from public.live_destinations d
  where d.team_id=t.id and d.provider='groupme' and d.enabled=true and d.last_test_status='sent'
);

alter table public.live_games
  add column if not exists high_school_schedule_id text;

create unique index if not exists live_games_high_school_schedule_identity_idx
  on public.live_games(team_id,high_school_schedule_id)
  where high_school_schedule_id is not null;

comment on column public.live_games.high_school_schedule_id is
  'Source-backed high-school schedule row identifier. Manual games may later be linked without replacing the canonical scored game.';

-- Expand the universal game/series model without changing tournament or friendly semantics.
alter table public.live_games drop constraint if exists live_games_game_kind_check;
alter table public.live_games
  add constraint live_games_game_kind_check
  check (game_kind in ('tournament','scrimmage','friendly','regular_season'));

alter table public.live_games drop constraint if exists live_games_creation_source_check;
alter table public.live_games
  add constraint live_games_creation_source_check
  check (creation_source in ('manual','tournament_schedule','high_school_schedule'));

alter table public.live_game_series drop constraint if exists live_game_series_series_type_check;
alter table public.live_game_series
  add constraint live_game_series_series_type_check
  check (series_type in ('tournament','scrimmage_weekend','season_schedule'));

alter table public.live_game_series drop constraint if exists live_game_series_creation_source_check;
alter table public.live_game_series
  add constraint live_game_series_creation_source_check
  check (creation_source in ('manual','tournament_schedule','high_school_schedule'));

create or replace function public.live_series_link_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  desired_type text;
  desired_name text;
  desired_public_id text;
  linked_id uuid;
  lock_key text;
begin
  new.environment := 'production';

  if new.game_kind='tournament' and nullif(trim(coalesce(new.tournament_name,'')),'') is not null then
    desired_type := 'tournament';
    desired_name := trim(new.tournament_name);
    desired_public_id := nullif(trim(coalesce(new.tournament_public_id,'')),'');
  elsif new.game_kind='friendly' and nullif(trim(coalesce(new.scrimmage_weekend_name,'')),'') is not null then
    desired_type := 'scrimmage_weekend';
    desired_name := trim(new.scrimmage_weekend_name);
    desired_public_id := null;
  elsif new.game_kind='regular_season' then
    desired_type := 'season_schedule';
    desired_name := 'Regular Season';
    desired_public_id := null;
  else
    new.series_id := null;
    return new;
  end if;

  lock_key := new.team_id::text || ':' || desired_type || ':' || coalesce(desired_public_id,lower(desired_name)) || ':' || coalesce(new.competitive_season,'');
  perform pg_advisory_xact_lock(hashtextextended(lock_key,0));

  if desired_type='tournament' and desired_public_id is not null then
    select id into linked_id
    from public.live_game_series
    where team_id=new.team_id and series_type='tournament' and tournament_public_id=desired_public_id
    limit 1;
  end if;

  if linked_id is null then
    select id into linked_id
    from public.live_game_series
    where team_id=new.team_id
      and series_type=desired_type
      and competitive_season=coalesce(new.competitive_season,'2026-2027')
      and lower(name)=lower(desired_name)
    limit 1;
  end if;

  if linked_id is null then
    insert into public.live_game_series(
      team_id,series_type,name,competitive_season,tournament_public_id,creation_source,created_by
    ) values (
      new.team_id,
      desired_type,
      desired_name,
      coalesce(new.competitive_season,'2026-2027'),
      desired_public_id,
      case
        when desired_type='tournament' and new.creation_source='tournament_schedule' then 'tournament_schedule'
        when desired_type='season_schedule' and new.creation_source='high_school_schedule' then 'high_school_schedule'
        else 'manual'
      end,
      coalesce(new.created_by,auth.uid())
    ) returning id into linked_id;
  else
    update public.live_game_series
    set name=desired_name,
        tournament_public_id=coalesce(desired_public_id,tournament_public_id),
        creation_source=case
          when desired_type='tournament' and new.creation_source='tournament_schedule' then 'tournament_schedule'
          when desired_type='season_schedule' and new.creation_source='high_school_schedule' then 'high_school_schedule'
          else creation_source
        end,
        updated_at=now()
    where id=linked_id;
  end if;

  new.series_id := linked_id;
  return new;
end;
$$;

drop trigger if exists live_games_series_link_trigger on public.live_games;
create trigger live_games_series_link_trigger
  before insert or update of game_kind,tournament_name,tournament_public_id,scrimmage_weekend_name,competitive_season,creation_source
  on public.live_games
  for each row execute function public.live_series_link_trigger_v1();

create or replace function public.live_team_score_delivery_v1(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  team_row public.live_teams%rowtype;
  role_row public.live_team_role;
  destination_row public.live_destinations%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into role_row from public.live_team_members where team_id=target_team_id and user_id=caller;
  if role_row is null then raise exception 'Team membership required'; end if;
  select * into team_row from public.live_teams where id=target_team_id and active=true;
  if team_row.id is null then raise exception 'Active team not found'; end if;
  select * into destination_row from public.live_destinations
  where team_id=target_team_id and provider='groupme' limit 1;
  return jsonb_build_object(
    'teamId',team_row.id,
    'mode',team_row.score_delivery_mode,
    'canManage',role_row in ('owner','admin'),
    'groupMeConfigured',destination_row.id is not null,
    'groupMeEnabled',coalesce(destination_row.enabled,false),
    'groupMeTested',coalesce(destination_row.last_test_status='sent',false),
    'ready',case
      when team_row.score_delivery_mode='wpi_live_only' then true
      else coalesce(destination_row.enabled,false) and coalesce(destination_row.last_test_status='sent',false)
    end
  );
end;
$$;

revoke all on function public.live_team_score_delivery_v1(uuid) from public,anon;
grant execute on function public.live_team_score_delivery_v1(uuid) to authenticated;

create or replace function public.live_apply_game_delivery_mode_v1(target_game_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  game_row public.live_games%rowtype;
  mode_value text;
  destination_id_value uuid;
begin
  select * into game_row from public.live_games where id=target_game_id;
  if game_row.id is null then raise exception 'Game not found'; end if;
  select score_delivery_mode into mode_value from public.live_teams where id=game_row.team_id;
  if mode_value='wpi_live_groupme' then
    select id into destination_id_value from public.live_destinations
    where team_id=game_row.team_id and provider='groupme' and enabled=true and last_test_status='sent'
    order by updated_at desc nulls last,created_at desc limit 1;
  end if;
  update public.live_games
  set destination_id=destination_id_value,
      state_snapshot=jsonb_set(
        coalesce(state_snapshot,'{}'::jsonb),
        '{setup,groupMeName}',
        to_jsonb(case when destination_id_value is null then 'WPI Live' else coalesce((select display_name from public.live_destinations where id=destination_id_value),'GroupMe') end),
        true
      ),
      updated_at=now()
  where id=target_game_id;
  return destination_id_value;
end;
$$;

revoke all on function public.live_apply_game_delivery_mode_v1(uuid) from public,anon;

create or replace function public.live_set_team_score_delivery_mode_v1(target_team_id uuid,requested_mode text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  cleaned text := lower(trim(coalesce(requested_mode,'')));
  game_row record;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_has_team_role(target_team_id,array['owner','admin']::public.live_team_role[]) then
    raise exception 'Team Owner/Admin access required';
  end if;
  if cleaned not in ('wpi_live_only','wpi_live_groupme') then raise exception 'Invalid score-delivery mode'; end if;
  update public.live_teams set score_delivery_mode=cleaned,updated_at=now() where id=target_team_id and active=true;
  if not found then raise exception 'Active team not found'; end if;

  for game_row in select id from public.live_games where team_id=target_team_id and status in ('setup','scheduled') and started_at is null loop
    perform public.live_apply_game_delivery_mode_v1(game_row.id);
  end loop;
  return public.live_team_score_delivery_v1(target_team_id);
end;
$$;

revoke all on function public.live_set_team_score_delivery_mode_v1(uuid,text) from public,anon;
grant execute on function public.live_set_team_score_delivery_mode_v1(uuid,text) to authenticated;

-- Extend the existing manual creator so regular-season games are first-class and
-- destination inheritance honors the explicit WPI Live / GroupMe preference.
create or replace function public.live_create_manual_game_v2(
  target_team_id uuid,
  requested_game_kind text,
  requested_opponent_name text,
  requested_scheduled_at timestamptz default null,
  requested_timezone text default 'UTC',
  requested_venue text default null,
  requested_quarter_length_minutes integer default 7,
  requested_tournament_name text default null,
  requested_tournament_public_id text default null,
  requested_opponent_wpi_team_id text default null,
  requested_team_logo_url text default null,
  requested_opponent_logo_url text default null
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
  roster_row public.live_rosters%rowtype;
  destination_row public.live_destinations%rowtype;
  game_id uuid := gen_random_uuid();
  client_id text;
  cleaned_kind text := lower(trim(coalesce(requested_game_kind,'')));
  cleaned_opponent text := trim(coalesce(requested_opponent_name,''));
  cleaned_tournament text := nullif(trim(coalesce(requested_tournament_name,'')),'');
  cleaned_venue text := nullif(trim(coalesce(requested_venue,'')),'');
  cleaned_timezone text := coalesce(nullif(trim(coalesce(requested_timezone,'')),''),'UTC');
  cleaned_team_logo text := case when coalesce(requested_team_logo_url,'') ~ '^assets/(logos|branding)/' then requested_team_logo_url else null end;
  cleaned_opponent_logo text := case when coalesce(requested_opponent_logo_url,'') ~ '^assets/(logos|branding)/' then requested_opponent_logo_url else null end;
  roster_json jsonb := '[]'::jsonb;
  default_lineup_json jsonb := '[]'::jsonb;
  default_goalie_local text := null;
  state_json jsonb;
  quarter_minutes integer := greatest(3,least(15,coalesce(requested_quarter_length_minutes,7)));
  initial_status public.live_game_status;
  reconcile_status text;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role into caller_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  select * into team_row from public.live_teams where id=target_team_id;
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'A Team Owner or Admin must add a game'; end if;
  if cleaned_kind not in ('tournament','scrimmage','friendly','regular_season') then raise exception 'Unsupported game type'; end if;
  if cleaned_opponent='' then raise exception 'Opponent is required'; end if;
  if cleaned_kind='tournament' and cleaned_tournament is null then raise exception 'Tournament name is required for a tournament game'; end if;
  if not exists(select 1 from pg_timezone_names where name=cleaned_timezone) then cleaned_timezone := 'UTC'; end if;

  select * into roster_row from public.live_rosters
  where team_id=target_team_id and active=true order by updated_at desc,created_at desc limit 1;
  if roster_row.id is null then raise exception 'Set up the team roster before adding a game'; end if;

  if team_row.score_delivery_mode='wpi_live_groupme' then
    select * into destination_row from public.live_destinations
    where team_id=target_team_id and provider='groupme' and enabled=true and last_test_status='sent'
    order by updated_at desc nulls last,created_at desc limit 1;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id',coalesce(p.client_player_id,p.id::text),'remoteId',p.id,'cap',p.cap_number,'name',p.display_name,'createdByUserId',p.created_by
    ) order by p.sort_order,p.cap_number),'[]'::jsonb)
  into roster_json from public.live_players p where p.roster_id=roster_row.id and p.active=true;

  select coalesce(jsonb_agg(coalesce(p.client_player_id,p.id::text) order by array_position(team_row.default_lineup_player_ids,p.id)),'[]'::jsonb)
  into default_lineup_json from public.live_players p
  where p.roster_id=roster_row.id and p.active=true and p.id=any(team_row.default_lineup_player_ids);

  select coalesce(p.client_player_id,p.id::text) into default_goalie_local
  from public.live_players p where p.id=team_row.default_goalie_id and p.roster_id=roster_row.id and p.active=true;

  client_id := 'wpi-game-' || game_id::text;
  initial_status := case when requested_scheduled_at is not null then 'scheduled'::public.live_game_status else 'setup'::public.live_game_status end;
  reconcile_status := case when cleaned_kind='tournament' then 'provisional' else 'not_applicable' end;

  state_json := jsonb_build_object(
    'release','7.61.1','environment','production','mode','connected',
    'setup',jsonb_build_object(
      'source',case when cleaned_kind='tournament' then 'manual_tournament' when cleaned_kind='regular_season' then 'manual_regular_season' else 'manual_scrimmage' end,
      'gameKind',cleaned_kind,'creationSource','manual','tournamentName',cleaned_tournament,
      'tournamentPublicId',nullif(trim(coalesce(requested_tournament_public_id,'')),''),'scheduledTimezone',cleaned_timezone,
      'opponentWpiTeamId',nullif(trim(coalesce(requested_opponent_wpi_team_id,'')),''),'teamLogoUrl',cleaned_team_logo,
      'opponentLogoUrl',cleaned_opponent_logo,'reconciliationStatus',reconcile_status,'teamName',team_row.name,'opponentName',cleaned_opponent,
      'gameDateTime',case when requested_scheduled_at is null then '' else to_char(requested_scheduled_at at time zone cleaned_timezone,'YYYY-MM-DD"T"HH24:MI') end,
      'venue',coalesce(cleaned_venue,''),'ageGroup',team_row.age_group,'quarterLength',quarter_minutes,
      'groupMeName',case when destination_row.id is null then 'WPI Live' else coalesce(destination_row.display_name,'GroupMe') end,
      'messageFrequency','all','visibility','team_private','roster',roster_json,'defaultLineup',default_lineup_json,'defaultGoalieId',default_goalie_local
    ),
    'game',jsonb_build_object(
      'id',client_id,'remoteId',game_id,'createdByUserId',caller,'status','setup','quarter',1,'clockMinutes',quarter_minutes,'clockSeconds',0,
      'teamScore',0,'opponentScore',0,'messagesPaused',false,'events','[]'::jsonb,'messages','[]'::jsonb,'lineups','{}'::jsonb,
      'lineupGoalies','{}'::jsonb,'pendingQuarter',null,'phase','regulation','overtimeLength',2,'overtimeMultiplePeriods',true,
      'shootout',jsonb_build_object('active',false,'firstTeam',null,'nextTeam',null,'teamAttempts',0,'opponentAttempts',0,'teamGoals',0,'opponentGoals',0),
      'startedAt',null,'endedAt',null
    )
  );

  insert into public.live_games(
    id,environment,team_id,roster_id,destination_id,competitive_season,client_game_id,source_mode,team_name_snapshot,opponent_name,
    scheduled_at,venue,age_group,quarter_length_seconds,status,visibility,message_frequency,messages_paused,current_quarter,
    current_time_remaining_seconds,team_score,opponent_score,phase,overtime_length_minutes,overtime_multiple_periods,created_by,updated_by,state_snapshot,
    last_synced_at,sync_version,updated_at,game_kind,creation_source,tournament_name,scheduled_timezone,tournament_public_id,opponent_wpi_team_id,
    team_logo_url,opponent_logo_url,reconciliation_status
  ) values (
    game_id,'production',target_team_id,roster_row.id,destination_row.id,team_row.competitive_season,client_id,'manual',team_row.name,cleaned_opponent,
    requested_scheduled_at,cleaned_venue,team_row.age_group,quarter_minutes*60,initial_status,'team_private','all',false,1,quarter_minutes*60,0,0,
    'regulation',2,true,caller,caller,state_json,now(),extract(epoch from clock_timestamp())::bigint,now(),cleaned_kind,'manual',cleaned_tournament,
    cleaned_timezone,nullif(trim(coalesce(requested_tournament_public_id,'')),''),nullif(trim(coalesce(requested_opponent_wpi_team_id,'')),''),
    cleaned_team_logo,cleaned_opponent_logo,reconcile_status
  );

  return jsonb_build_object('gameId',game_id,'clientGameId',client_id,'status',initial_status,'gameKind',cleaned_kind,'reconciliationStatus',reconcile_status);
end;
$$;

grant execute on function public.live_create_manual_game_v2(uuid,text,text,timestamptz,text,text,integer,text,text,text,text,text) to authenticated;

create or replace function public.live_save_game_day_v3(
  target_team_id uuid,
  target_game_id uuid,
  requested_game_kind text,
  requested_opponent_name text,
  requested_opponent_source_name text,
  requested_scheduled_at timestamptz,
  requested_timezone text,
  requested_venue text,
  requested_quarter_length_minutes integer,
  requested_tournament_name text,
  requested_tournament_public_id text,
  requested_series_name text,
  requested_opponent_wpi_team_id text,
  requested_opponent_wpi_club_id text,
  requested_team_logo_url text,
  requested_opponent_logo_url text,
  target_scorer_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  cleaned_kind text := lower(trim(coalesce(requested_game_kind,'')));
  result jsonb;
  game_id uuid;
  game_row public.live_games%rowtype;
  assignment_result jsonb;
  cleaned_opponent text := trim(coalesce(requested_opponent_name,''));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if cleaned_kind<>'regular_season' then
    result := public.live_save_game_day_v2(
      target_team_id,target_game_id,requested_game_kind,requested_opponent_name,requested_opponent_source_name,requested_scheduled_at,
      requested_timezone,requested_venue,requested_quarter_length_minutes,requested_tournament_name,requested_tournament_public_id,requested_series_name,
      requested_opponent_wpi_team_id,requested_opponent_wpi_club_id,requested_team_logo_url,requested_opponent_logo_url,target_scorer_user_id
    );
    perform public.live_apply_game_delivery_mode_v1((result->>'gameId')::uuid);
    return result;
  end if;

  if not public.live_has_team_role(target_team_id,array['owner','admin']::public.live_team_role[]) then raise exception 'Team Owner/Admin access required'; end if;
  if cleaned_opponent='' then raise exception 'Opponent is required'; end if;

  if target_game_id is null then
    result := public.live_create_manual_game_v2(
      target_team_id,'regular_season',cleaned_opponent,requested_scheduled_at,requested_timezone,requested_venue,requested_quarter_length_minutes,
      null,null,requested_opponent_wpi_team_id,requested_team_logo_url,requested_opponent_logo_url
    );
    game_id := (result->>'gameId')::uuid;
    update public.live_games set opponent_source_name=coalesce(nullif(trim(requested_opponent_source_name),''),cleaned_opponent),
      opponent_wpi_club_id=nullif(trim(coalesce(requested_opponent_wpi_club_id,'')),''),updated_at=now()
    where id=game_id and team_id=target_team_id;
  else
    select * into game_row from public.live_games where id=target_game_id and team_id=target_team_id;
    if game_row.id is null then raise exception 'Game does not belong to this team workspace'; end if;
    if game_row.status not in ('setup','scheduled') or game_row.started_at is not null then raise exception 'Only an unstarted game can be edited'; end if;
    update public.live_games set
      game_kind='regular_season',creation_source=case when high_school_schedule_id is null then 'manual' else creation_source end,
      opponent_name=cleaned_opponent,opponent_source_name=coalesce(nullif(trim(requested_opponent_source_name),''),cleaned_opponent),
      scheduled_at=requested_scheduled_at,scheduled_timezone=coalesce(nullif(trim(requested_timezone),''),'UTC'),venue=nullif(trim(coalesce(requested_venue,'')),''),
      quarter_length_seconds=greatest(3,least(15,coalesce(requested_quarter_length_minutes,7)))*60,
      opponent_wpi_team_id=nullif(trim(coalesce(requested_opponent_wpi_team_id,'')),''),opponent_wpi_club_id=nullif(trim(coalesce(requested_opponent_wpi_club_id,'')),''),
      team_logo_url=case when coalesce(requested_team_logo_url,'') ~ '^assets/(logos|branding)/' then requested_team_logo_url else team_logo_url end,
      opponent_logo_url=case when coalesce(requested_opponent_logo_url,'') ~ '^assets/(logos|branding)/' then requested_opponent_logo_url else null end,
      tournament_name=null,tournament_public_id=null,scrimmage_weekend_name=null,reconciliation_status='not_applicable',updated_by=auth.uid(),updated_at=now(),
      status=case when requested_scheduled_at is null then 'setup'::public.live_game_status else 'scheduled'::public.live_game_status end,
      current_time_remaining_seconds=greatest(3,least(15,coalesce(requested_quarter_length_minutes,7)))*60,
      last_synced_at=now(),sync_version=extract(epoch from clock_timestamp())::bigint,
      state_snapshot=jsonb_set(
        jsonb_set(
          coalesce(state_snapshot,'{}'::jsonb),
          '{setup}',
          coalesce(state_snapshot->'setup','{}'::jsonb) || jsonb_build_object(
            'opponentName',cleaned_opponent,
            'gameDateTime',case when requested_scheduled_at is null then '' else to_char(requested_scheduled_at at time zone coalesce(nullif(trim(requested_timezone),''),'UTC'),'YYYY-MM-DD"T"HH24:MI') end,
            'scheduledTimezone',coalesce(nullif(trim(requested_timezone),''),'UTC'),
            'venue',coalesce(nullif(trim(coalesce(requested_venue,'')),''),''),
            'quarterLength',greatest(3,least(15,coalesce(requested_quarter_length_minutes,7))),
            'gameKind','regular_season','source',case when high_school_schedule_id is null then 'manual_regular_season' else 'high_school_schedule' end,
            'creationSource',case when high_school_schedule_id is null then 'manual' else creation_source end,
            'tournamentName',null,'tournamentPublicId',null,
            'opponentWpiTeamId',nullif(trim(coalesce(requested_opponent_wpi_team_id,'')),''),
            'teamLogoUrl',case when coalesce(requested_team_logo_url,'') ~ '^assets/(logos|branding)/' then requested_team_logo_url else team_logo_url end,
            'opponentLogoUrl',case when coalesce(requested_opponent_logo_url,'') ~ '^assets/(logos|branding)/' then requested_opponent_logo_url else null end,
            'reconciliationStatus','not_applicable'
          ),true
        ),
        '{game}',
        coalesce(state_snapshot->'game','{}'::jsonb) || jsonb_build_object(
          'clockMinutes',greatest(3,least(15,coalesce(requested_quarter_length_minutes,7))),
          'clockSeconds',0
        ),true
      )
    where id=target_game_id and team_id=target_team_id;
    game_id := target_game_id;
    result := jsonb_build_object('gameId',game_id,'status',(select status from public.live_games where id=game_id),'gameKind','regular_season','persisted',true);
  end if;

  assignment_result := public.live_assign_game_scorer_v1(game_id,target_scorer_user_id);
  perform public.live_apply_game_delivery_mode_v1(game_id);
  return result || jsonb_build_object('assignment',assignment_result,'seriesName','Regular Season','seriesType','season_schedule');
end;
$$;

revoke all on function public.live_save_game_day_v3(uuid,uuid,text,text,text,timestamptz,text,text,integer,text,text,text,text,text,text,text,uuid) from public,anon;
grant execute on function public.live_save_game_day_v3(uuid,uuid,text,text,text,timestamptz,text,text,integer,text,text,text,text,text,text,text,uuid) to authenticated;

create or replace function public.live_sync_high_school_schedule_game_v1(target_team_id uuid,schedule_game jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  team_row public.live_teams%rowtype;
  club_row public.live_clubs%rowtype;
  schedule_id text := nullif(trim(coalesce(schedule_game->>'scheduleId','')),'');
  family_key text := nullif(trim(coalesce(schedule_game->>'teamFamilyKey','')),'');
  opponent text := trim(coalesce(schedule_game->>'opponent',''));
  scheduled_at_value timestamptz;
  timezone_value text := coalesce(nullif(trim(coalesce(schedule_game->>'timezone','')),''),'America/Los_Angeles');
  venue_value text := nullif(trim(coalesce(schedule_game->>'venue','')),'');
  existing_id uuid;
  candidate_id uuid;
  candidate_count integer := 0;
  result jsonb;
  team_logo text := nullif(trim(coalesce(schedule_game->>'teamLogoUrl','')),'');
  opponent_logo text := nullif(trim(coalesce(schedule_game->>'opponentLogoUrl','')),'');
  opponent_team_id text := nullif(trim(coalesce(schedule_game->>'opponentWpiTeamId','')),'');
  opponent_club_id text := nullif(trim(coalesce(schedule_game->>'opponentWpiClubId','')),'');
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_has_team_role(target_team_id,array['owner','admin']::public.live_team_role[]) then raise exception 'Team Owner/Admin access required'; end if;
  select * into team_row from public.live_teams where id=target_team_id and active=true;
  if team_row.id is null then raise exception 'Active team not found'; end if;
  select * into club_row from public.live_clubs where id=team_row.club_id and active=true;
  if club_row.organization_type<>'high_school' then raise exception 'High-school schedule sync is only available for high-school teams'; end if;
  if schedule_id is null or family_key is null or opponent='' then raise exception 'Schedule identity is incomplete'; end if;
  if coalesce(team_row.canonical_wpi_team_family_key,'')<>family_key then raise exception 'Schedule row does not belong to this team'; end if;
  if coalesce(schedule_game->>'time','')='TBA' or nullif(schedule_game->>'scheduledAt','') is null then
    return jsonb_build_object('scheduleId',schedule_id,'synced',false,'status','time_tba');
  end if;
  scheduled_at_value := (schedule_game->>'scheduledAt')::timestamptz;

  select id into existing_id from public.live_games where team_id=target_team_id and high_school_schedule_id=schedule_id limit 1;
  if existing_id is not null then
    return jsonb_build_object('scheduleId',schedule_id,'gameId',existing_id,'synced',true,'status','existing');
  end if;

  select count(*),min(id) into candidate_count,candidate_id
  from public.live_games g
  where g.team_id=target_team_id and g.status<>'cancelled'
    and public.live_identity_normalize_v1(g.opponent_name)=public.live_identity_normalize_v1(opponent)
    and g.scheduled_at is not null
    and abs(extract(epoch from (g.scheduled_at-scheduled_at_value))) <= 14400;

  if candidate_count=1 and candidate_id is not null then
    update public.live_games
    set high_school_schedule_id=schedule_id,
        game_kind='regular_season',
        tournament_name=null,tournament_public_id=null,scrimmage_weekend_name=null,
        scheduled_at=case when status in ('setup','scheduled') and started_at is null then scheduled_at_value else scheduled_at end,
        scheduled_timezone=timezone_value,
        venue=case when status in ('setup','scheduled') and started_at is null then coalesce(venue_value,venue) else venue end,
        team_logo_url=coalesce(team_logo,team_logo_url),opponent_logo_url=coalesce(opponent_logo,opponent_logo_url),
        opponent_wpi_team_id=coalesce(opponent_team_id,opponent_wpi_team_id),opponent_wpi_club_id=coalesce(opponent_club_id,opponent_wpi_club_id),
        reconciliation_status='not_applicable',updated_at=now(),updated_by=caller,
        state_snapshot=jsonb_set(
          coalesce(state_snapshot,'{}'::jsonb),
          '{setup}',
          coalesce(state_snapshot->'setup','{}'::jsonb) || jsonb_build_object(
            'gameKind','regular_season','source','high_school_schedule','creationSource',creation_source,
            'scheduledTimezone',timezone_value,'reconciliationStatus','not_applicable',
            'teamLogoUrl',coalesce(team_logo,team_logo_url),'opponentLogoUrl',coalesce(opponent_logo,opponent_logo_url),
            'opponentWpiTeamId',coalesce(opponent_team_id,opponent_wpi_team_id)
          ),true
        )
    where id=candidate_id;
    perform public.live_apply_game_delivery_mode_v1(candidate_id);
    return jsonb_build_object('scheduleId',schedule_id,'gameId',candidate_id,'synced',true,'status','linked_manual');
  end if;

  result := public.live_create_manual_game_v2(
    target_team_id,'regular_season',opponent,scheduled_at_value,timezone_value,venue_value,7,null,null,opponent_team_id,team_logo,opponent_logo
  );
  existing_id := (result->>'gameId')::uuid;
  update public.live_games set
    high_school_schedule_id=schedule_id,creation_source='high_school_schedule',opponent_source_name=opponent,
    opponent_wpi_club_id=opponent_club_id,updated_at=now(),updated_by=caller,
    state_snapshot=jsonb_set(jsonb_set(coalesce(state_snapshot,'{}'::jsonb),'{setup,source}',to_jsonb('high_school_schedule'::text),true),'{setup,creationSource}',to_jsonb('high_school_schedule'::text),true)
  where id=existing_id;
  perform public.live_apply_game_delivery_mode_v1(existing_id);
  return jsonb_build_object('scheduleId',schedule_id,'gameId',existing_id,'synced',true,'status','created');
end;
$$;

revoke all on function public.live_sync_high_school_schedule_game_v1(uuid,jsonb) from public,anon;
grant execute on function public.live_sync_high_school_schedule_game_v1(uuid,jsonb) to authenticated;

create or replace function public.live_game_day_queue_v5(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  member_role public.live_team_role;
  queue jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into member_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  if member_role is null then raise exception 'Team membership required'; end if;

  select coalesce(jsonb_agg(row_data order by sort_rank,sort_mine,sort_time asc nulls last,sort_updated desc),'[]'::jsonb)
  into queue
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end as sort_rank,
      case when g.assigned_scorer_user_id=caller then 0 when g.assigned_scorer_user_id is null then 1 else 2 end as sort_mine,
      g.scheduled_at as sort_time,g.updated_at as sort_updated,
      (jsonb_build_object(
        'id',g.id,'clientGameId',g.client_game_id,'teamId',g.team_id,'teamName',g.team_name_snapshot,'opponentName',g.opponent_name,
        'opponentSourceName',coalesce(g.opponent_source_name,g.opponent_name),'scheduledAt',g.scheduled_at,'venue',g.venue,'ageGroup',g.age_group,
        'quarterLengthSeconds',g.quarter_length_seconds,'status',g.status,'teamScore',g.team_score,'opponentScore',g.opponent_score,'startedAt',g.started_at,
        'endedAt',g.ended_at,'updatedAt',g.updated_at,'gameKind',g.game_kind,'creationSource',g.creation_source,'highSchoolScheduleId',g.high_school_schedule_id
      ) || jsonb_build_object(
        'tournamentName',g.tournament_name,'scheduledTimezone',g.scheduled_timezone,'tournamentPublicId',g.tournament_public_id,
        'officialTournamentEventId',g.tournament_event_id,'officialSourceGameId',g.source_game_id,'opponentWpiTeamId',g.opponent_wpi_team_id,
        'opponentWpiClubId',g.opponent_wpi_club_id,'teamLogoUrl',g.team_logo_url,'opponentLogoUrl',g.opponent_logo_url,
        'reconciliationStatus',g.reconciliation_status,'reconciliationConfidence',g.reconciliation_confidence,
        'reconciliationCandidateEventId',g.reconciliation_candidate_event_id,'reconciliationCandidateGameId',g.reconciliation_candidate_game_id,
        'reconciliationCandidateSnapshot',g.reconciliation_candidate_snapshot,'officialScheduledAt',g.official_scheduled_at,'officialVenue',g.official_venue,
        'officialOpponentName',g.official_opponent_name,'officialDivisionId',g.official_division_id
      ) || jsonb_build_object(
        'officialDivisionLabel',g.official_division_label,'officialGameNumber',g.official_game_number,'officialStage',g.official_stage,'officialStatus',g.official_status,
        'officialTeamScore',g.official_team_score,'officialOpponentScore',g.official_opponent_score,'officialLastSeenAt',g.official_last_seen_at,
        'assignedScorerUserId',g.assigned_scorer_user_id,'assignedScorerDisplayName',g.assigned_scorer_display_name,'assignedAt',g.assigned_at,'assignedBy',g.assigned_by,
        'isAssignedToMe',g.assigned_scorer_user_id=caller,'canStart',case when g.status='live' then true when g.status not in ('setup','scheduled') or g.started_at is not null then false
          when member_role in ('owner','admin') then true when member_role='scorer' and (g.assigned_scorer_user_id is null or g.assigned_scorer_user_id=caller) then true else false end,
        'cancelledReason',g.cancelled_reason,'canManage',member_role in ('owner','admin'),'seriesId',g.series_id,'seriesName',s.name,'seriesType',s.series_type,
        'scrimmageWeekendName',g.scrimmage_weekend_name
      )) as row_data
    from public.live_games g left join public.live_game_series s on s.id=g.series_id
    where g.team_id=target_team_id and g.status<>'cancelled'
  ) rows;
  return jsonb_build_object('role',member_role,'games',queue);
end;
$$;

revoke all on function public.live_game_day_queue_v5(uuid) from public,anon;
grant execute on function public.live_game_day_queue_v5(uuid) to authenticated;

-- Club-level launch readiness must use the same delivery contract as the team
-- dashboard. WPI Live-only is a complete supported mode; GroupMe is required
-- only when that team explicitly opts into WPI Live + GroupMe.
create or replace function public.live_club_launch_readiness_v1(target_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  team_rows jsonb := '[]'::jsonb;
  active_count integer := 0;
  ready_count integer := 0;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_has_club_role(target_club_id,array['owner','admin']::public.live_club_role[]) then
    raise exception 'Club Owner/Admin access required';
  end if;

  select count(*)::int into active_count
  from public.live_teams t where t.club_id=target_club_id and t.active=true;

  with readiness as (
    select
      t.id team_id,
      t.name team_name,
      coalesce(nullif(trim(t.display_label),''),t.name) team_label,
      t.age_group,
      t.gender,
      t.squad_label,
      t.competitive_season,
      t.score_delivery_mode,
      case when coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'14')::integer <= 12 then 6 else 7 end starter_count,
      (nullif(trim(coalesce(t.name,'')),'') is not null
        and nullif(trim(coalesce(t.display_label,'')),'') is not null
        and nullif(trim(coalesce(t.age_group,'')),'') is not null
        and nullif(trim(coalesce(t.gender,'')),'') is not null
        and nullif(trim(coalesce(t.competitive_season,'')),'') is not null) profile_ready,
      coalesce((select count(*) from public.live_players p where p.roster_id=(select r.id from public.live_rosters r where r.team_id=t.id and r.active=true order by r.created_at desc limit 1) and p.active=true),0)::int roster_count,
      (select count(*) from public.live_team_members m where m.team_id=t.id and m.role in ('owner','admin','scorer'))::int scorer_count,
      exists(select 1 from public.live_destinations d where d.team_id=t.id and d.provider='groupme' and d.enabled=true and d.last_test_status='sent') groupme_ready,
      cardinality(coalesce(t.default_lineup_player_ids,'{}'::uuid[]))::int default_lineup_count,
      t.default_goalie_id,
      (select count(*) from public.live_games g where g.team_id=t.id and g.status in ('setup','scheduled'))::int upcoming_count,
      (select count(*) from public.live_games g where g.team_id=t.id and g.status in ('setup','scheduled') and g.assigned_scorer_user_id is null)::int unassigned_count,
      (select r.id from public.live_rosters r where r.team_id=t.id and r.active=true order by r.created_at desc limit 1) active_roster_id
    from public.live_teams t
    where t.club_id=target_club_id and t.active=true
  ), evaluated as (
    select r.*,
      (r.roster_count >= r.starter_count) roster_ready,
      (r.scorer_count >= 1) access_ready,
      (r.score_delivery_mode='wpi_live_only' or r.groupme_ready) score_delivery_ready,
      (r.default_goalie_id is not null
       and r.default_lineup_count=r.starter_count
       and r.default_goalie_id=any(coalesce((select t.default_lineup_player_ids from public.live_teams t where t.id=r.team_id),'{}'::uuid[]))
       and (select count(*) from public.live_players p where p.roster_id=r.active_roster_id and p.active=true and p.id=any(coalesce((select t.default_lineup_player_ids from public.live_teams t where t.id=r.team_id),'{}'::uuid[])))=r.starter_count
      ) default_lineup_ready
    from readiness r
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'teamId',team_id,
      'teamName',team_name,
      'teamDisplayLabel',team_label,
      'ageGroup',age_group,
      'gender',gender,
      'squadLabel',squad_label,
      'competitiveSeason',competitive_season,
      'profileReady',profile_ready,
      'rosterReady',roster_ready,
      'rosterPlayerCount',roster_count,
      'starterCount',starter_count,
      'accessReady',access_ready,
      'scorerEligibleCount',scorer_count,
      'scoreDeliveryMode',score_delivery_mode,
      'scoreDeliveryReady',score_delivery_ready,
      'groupMeReady',groupme_ready,
      'defaultLineupReady',default_lineup_ready,
      'defaultLineupCount',default_lineup_count,
      'upcomingGameCount',upcoming_count,
      'unassignedGameCount',unassigned_count,
      'launchReady',(profile_ready and roster_ready and access_ready and score_delivery_ready and default_lineup_ready)
    ) order by coalesce(nullif(regexp_replace(age_group,'[^0-9]','','g'),''),'999')::integer,lower(team_label)),'[]'::jsonb),
    count(*) filter (where profile_ready and roster_ready and access_ready and score_delivery_ready and default_lineup_ready)::int
  into team_rows,ready_count
  from evaluated;

  return jsonb_build_object(
    'clubId',target_club_id,
    'generatedAt',now(),
    'summary',jsonb_build_object('activeTeamCount',active_count,'readyTeamCount',ready_count,'attentionTeamCount',greatest(active_count-ready_count,0)),
    'teams',team_rows
  );
end;
$$;

revoke all on function public.live_club_launch_readiness_v1(uuid) from public,anon;
grant execute on function public.live_club_launch_readiness_v1(uuid) to authenticated;
comment on function public.live_club_launch_readiness_v1(uuid) is
  'Owner/Admin read-only launch readiness: profile, roster, scorer access, explicit score-delivery mode, and valid default starters. WPI Live-only is Ready without GroupMe.';
