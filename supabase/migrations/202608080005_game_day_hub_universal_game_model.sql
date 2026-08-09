-- WPI 7.57.6 — Game-Day Hub & Universal Game Model.
-- Adds reconciliation-ready game metadata and manager-only planned-game RPCs.
-- Manual tournament games are provisional canonical records: a later official
-- tournament import must enrich/link the same live_games row rather than create
-- a duplicate scored record.

alter table public.live_games
  add column if not exists game_kind text not null default 'scrimmage',
  add column if not exists creation_source text not null default 'manual',
  add column if not exists tournament_name text,
  add column if not exists scheduled_timezone text,
  add column if not exists tournament_public_id text,
  add column if not exists opponent_wpi_team_id text,
  add column if not exists team_logo_url text,
  add column if not exists opponent_logo_url text,
  add column if not exists reconciliation_status text not null default 'not_applicable',
  add column if not exists reconciliation_confidence numeric(5,4),
  add column if not exists reconciled_at timestamptz,
  add column if not exists reconciled_by uuid references auth.users(id),
  add column if not exists cancelled_reason text;

do $$ begin
  alter table public.live_games
    add constraint live_games_game_kind_check
    check (game_kind in ('tournament','scrimmage','friendly'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.live_games
    add constraint live_games_creation_source_check
    check (creation_source in ('manual','tournament_schedule'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.live_games
    add constraint live_games_reconciliation_status_check
    check (reconciliation_status in ('not_applicable','provisional','possible_match','matched','verified','conflict','dismissed'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.live_games
    add constraint live_games_reconciliation_confidence_check
    check (reconciliation_confidence is null or reconciliation_confidence between 0 and 1);
exception when duplicate_object then null; end $$;

create index if not exists live_games_game_day_queue_idx
  on public.live_games(team_id,status,scheduled_at,updated_at desc);

create index if not exists live_games_reconciliation_candidates_idx
  on public.live_games(team_id,tournament_public_id,scheduled_at)
  where game_kind='tournament' and reconciliation_status in ('provisional','possible_match');

comment on column public.live_games.game_kind is
  'User-facing game category. Tournament games may originate manually or from an official WPI schedule.';
comment on column public.live_games.creation_source is
  'Provenance only. Manual tournament records remain manual-origin after later official reconciliation.';
comment on column public.live_games.reconciliation_status is
  'Manual tournament games begin provisional and are later linked to an official WPI tournament game without duplicating the scored record.';

-- Existing manually-created games predate explicit game kinds. Preserve them as
-- scrimmages unless they already carry a tournament source identifier.
update public.live_games
set game_kind = case when tournament_event_id is not null then 'tournament' else 'scrimmage' end,
    creation_source = case when source_mode='tournament_sheet' then 'tournament_schedule' else 'manual' end,
    reconciliation_status = case
      when tournament_event_id is not null and source_game_id is null then 'provisional'
      when tournament_event_id is not null and source_game_id is not null then 'verified'
      else 'not_applicable'
    end
where game_kind='scrimmage'
  and creation_source='manual'
  and reconciliation_status='not_applicable';

create or replace function public.live_game_day_queue(target_team_id uuid)
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

  select role into member_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if member_role is null then raise exception 'Team membership required'; end if;

  select coalesce(jsonb_agg(row_data order by sort_rank,sort_time desc nulls last,sort_updated desc),'[]'::jsonb)
  into queue
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end as sort_rank,
      g.scheduled_at as sort_time,
      g.updated_at as sort_updated,
      jsonb_build_object(
        'id',g.id,
        'clientGameId',g.client_game_id,
        'teamId',g.team_id,
        'teamName',g.team_name_snapshot,
        'opponentName',g.opponent_name,
        'scheduledAt',g.scheduled_at,
        'venue',g.venue,
        'ageGroup',g.age_group,
        'quarterLengthSeconds',g.quarter_length_seconds,
        'status',g.status,
        'teamScore',g.team_score,
        'opponentScore',g.opponent_score,
        'startedAt',g.started_at,
        'endedAt',g.ended_at,
        'updatedAt',g.updated_at,
        'gameKind',g.game_kind,
        'creationSource',g.creation_source,
        'tournamentName',g.tournament_name,
        'scheduledTimezone',g.scheduled_timezone,
        'tournamentPublicId',g.tournament_public_id,
        'officialTournamentEventId',g.tournament_event_id,
        'officialSourceGameId',g.source_game_id,
        'opponentWpiTeamId',g.opponent_wpi_team_id,
        'teamLogoUrl',g.team_logo_url,
        'opponentLogoUrl',g.opponent_logo_url,
        'reconciliationStatus',g.reconciliation_status,
        'reconciliationConfidence',g.reconciliation_confidence,
        'cancelledReason',g.cancelled_reason,
        'canManage',member_role in ('owner','admin')
      ) as row_data
    from public.live_games g
    where g.team_id=target_team_id
      and g.status <> 'cancelled'
  ) rows;

  return jsonb_build_object('role',member_role,'games',queue);
end;
$$;

grant execute on function public.live_game_day_queue(uuid) to authenticated;

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

  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  select * into team_row
  from public.live_teams
  where id=target_team_id;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'A Team Owner or Admin must add a game';
  end if;
  if cleaned_kind not in ('tournament','scrimmage','friendly') then
    raise exception 'Game type must be tournament, scrimmage, or friendly';
  end if;
  if cleaned_opponent='' then raise exception 'Opponent is required'; end if;
  if cleaned_kind='tournament' and cleaned_tournament is null then
    raise exception 'Tournament name is required for a tournament game';
  end if;
  if not exists(select 1 from pg_timezone_names where name=cleaned_timezone) then cleaned_timezone := 'UTC'; end if;

  select * into roster_row
  from public.live_rosters
  where team_id=target_team_id and active=true
  order by updated_at desc,created_at desc
  limit 1;

  if roster_row.id is null then raise exception 'Set up the team roster before adding a game'; end if;

  select * into destination_row
  from public.live_destinations
  where team_id=target_team_id and provider='groupme'
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id',coalesce(p.client_player_id,p.id::text),
      'remoteId',p.id,
      'cap',p.cap_number,
      'name',p.display_name,
      'createdByUserId',p.created_by
    ) order by p.sort_order,p.cap_number),'[]'::jsonb)
  into roster_json
  from public.live_players p
  where p.roster_id=roster_row.id and p.active=true;

  select coalesce(jsonb_agg(coalesce(p.client_player_id,p.id::text) order by array_position(team_row.default_lineup_player_ids,p.id)),'[]'::jsonb)
  into default_lineup_json
  from public.live_players p
  where p.roster_id=roster_row.id
    and p.active=true
    and p.id=any(team_row.default_lineup_player_ids);

  select coalesce(p.client_player_id,p.id::text)
  into default_goalie_local
  from public.live_players p
  where p.id=team_row.default_goalie_id and p.roster_id=roster_row.id and p.active=true;

  client_id := 'wpi-game-' || game_id::text;
  initial_status := case when requested_scheduled_at is not null then 'scheduled'::public.live_game_status else 'setup'::public.live_game_status end;
  reconcile_status := case when cleaned_kind='tournament' then 'provisional' else 'not_applicable' end;

  state_json := jsonb_build_object(
    'release','7.56.15',
    'environment','sandbox',
    'mode','connected',
    'setup',jsonb_build_object(
      'source',case when cleaned_kind='tournament' then 'manual_tournament' else 'manual_scrimmage' end,
      'gameKind',cleaned_kind,
      'creationSource','manual',
      'tournamentName',cleaned_tournament,
      'tournamentPublicId',nullif(trim(coalesce(requested_tournament_public_id,'')),''),
      'scheduledTimezone',cleaned_timezone,
      'opponentWpiTeamId',nullif(trim(coalesce(requested_opponent_wpi_team_id,'')),''),
      'teamLogoUrl',cleaned_team_logo,
      'opponentLogoUrl',cleaned_opponent_logo,
      'reconciliationStatus',reconcile_status,
      'teamName',team_row.name,
      'opponentName',cleaned_opponent,
      'gameDateTime',case when requested_scheduled_at is null then '' else to_char(requested_scheduled_at at time zone cleaned_timezone,'YYYY-MM-DD"T"HH24:MI') end,
      'venue',coalesce(cleaned_venue,''),
      'ageGroup',team_row.age_group,
      'quarterLength',quarter_minutes,
      'groupMeName',coalesce(destination_row.display_name,'WPI Live'),
      'messageFrequency','all',
      'visibility','team_private',
      'roster',roster_json,
      'defaultLineup',default_lineup_json,
      'defaultGoalieId',default_goalie_local
    ),
    'game',jsonb_build_object(
      'id',client_id,
      'remoteId',game_id,
      'createdByUserId',caller,
      'status','setup',
      'quarter',1,
      'clockMinutes',quarter_minutes,
      'clockSeconds',0,
      'teamScore',0,
      'opponentScore',0,
      'messagesPaused',false,
      'events','[]'::jsonb,
      'messages','[]'::jsonb,
      'lineups','{}'::jsonb,
      'lineupGoalies','{}'::jsonb,
      'pendingQuarter',null,
      'phase','regulation',
      'overtimeLength',2,
      'overtimeMultiplePeriods',true,
      'shootout',jsonb_build_object(
        'active',false,'firstTeam',null,'nextTeam',null,
        'teamAttempts',0,'opponentAttempts',0,'teamGoals',0,'opponentGoals',0
      ),
      'startedAt',null,
      'endedAt',null
    )
  );

  insert into public.live_games(
    id,environment,team_id,roster_id,destination_id,competitive_season,
    client_game_id,source_mode,team_name_snapshot,opponent_name,scheduled_at,venue,
    age_group,quarter_length_seconds,status,visibility,message_frequency,messages_paused,
    current_quarter,current_time_remaining_seconds,team_score,opponent_score,phase,
    overtime_length_minutes,overtime_multiple_periods,created_by,updated_by,state_snapshot,
    last_synced_at,sync_version,updated_at,
    game_kind,creation_source,tournament_name,scheduled_timezone,tournament_public_id,opponent_wpi_team_id,
    team_logo_url,opponent_logo_url,reconciliation_status
  ) values (
    game_id,'sandbox',target_team_id,roster_row.id,
    case when destination_row.enabled then destination_row.id else null end,
    team_row.competitive_season,
    client_id,'manual',team_row.name,cleaned_opponent,requested_scheduled_at,cleaned_venue,
    team_row.age_group,quarter_minutes*60,initial_status,'team_private','all',false,
    1,quarter_minutes*60,0,0,'regulation',2,true,caller,caller,state_json,
    now(),extract(epoch from clock_timestamp())::bigint,now(),
    cleaned_kind,'manual',cleaned_tournament,cleaned_timezone,nullif(trim(coalesce(requested_tournament_public_id,'')),''),
    nullif(trim(coalesce(requested_opponent_wpi_team_id,'')),''),
    cleaned_team_logo,cleaned_opponent_logo,
    reconcile_status
  );

  return jsonb_build_object(
    'gameId',game_id,
    'clientGameId',client_id,
    'status',initial_status,
    'gameKind',cleaned_kind,
    'reconciliationStatus',reconcile_status
  );
end;
$$;

grant execute on function public.live_create_manual_game_v2(uuid,text,text,timestamptz,text,text,integer,text,text,text,text,text) to authenticated;

create or replace function public.live_update_planned_game_v1(
  target_game_id uuid,
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
  game_row public.live_games%rowtype;
  cleaned_kind text := lower(trim(coalesce(requested_game_kind,'')));
  cleaned_opponent text := trim(coalesce(requested_opponent_name,''));
  cleaned_tournament text := nullif(trim(coalesce(requested_tournament_name,'')),'');
  cleaned_venue text := nullif(trim(coalesce(requested_venue,'')),'');
  cleaned_timezone text := coalesce(nullif(trim(coalesce(requested_timezone,'')),''),'UTC');
  cleaned_team_logo text := case when coalesce(requested_team_logo_url,'') ~ '^assets/(logos|branding)/' then requested_team_logo_url else null end;
  cleaned_opponent_logo text := case when coalesce(requested_opponent_logo_url,'') ~ '^assets/(logos|branding)/' then requested_opponent_logo_url else null end;
  quarter_minutes integer := greatest(3,least(15,coalesce(requested_quarter_length_minutes,7)));
  reconcile_status text;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into game_row from public.live_games where id=target_game_id for update;
  if game_row.id is null then raise exception 'Game not found'; end if;

  select role into caller_role from public.live_team_members where team_id=game_row.team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'A Team Owner or Admin must edit this game'; end if;
  if game_row.status not in ('setup','scheduled') or game_row.started_at is not null then
    raise exception 'A live or completed game cannot be rewritten from the Game-Day Hub';
  end if;
  if cleaned_kind not in ('tournament','scrimmage','friendly') then raise exception 'Invalid game type'; end if;
  if game_row.game_kind='tournament'
     and game_row.reconciliation_status in ('matched','verified','conflict')
     and cleaned_kind<>'tournament' then
    raise exception 'A linked tournament game cannot be converted to a scrimmage or friendly';
  end if;
  if cleaned_opponent='' then raise exception 'Opponent is required'; end if;
  if cleaned_kind='tournament' and cleaned_tournament is null then raise exception 'Tournament name is required for a tournament game'; end if;
  if not exists(select 1 from pg_timezone_names where name=cleaned_timezone) then cleaned_timezone := 'UTC'; end if;

  reconcile_status := case
    when cleaned_kind='tournament' and game_row.reconciliation_status in ('matched','verified','conflict') then game_row.reconciliation_status
    when cleaned_kind='tournament' then 'provisional'
    else 'not_applicable'
  end;

  update public.live_games
  set opponent_name=cleaned_opponent,
      scheduled_at=requested_scheduled_at,
      venue=cleaned_venue,
      quarter_length_seconds=quarter_minutes*60,
      current_time_remaining_seconds=quarter_minutes*60,
      status=case when requested_scheduled_at is not null then 'scheduled'::public.live_game_status else 'setup'::public.live_game_status end,
      game_kind=cleaned_kind,
      tournament_name=cleaned_tournament,
      scheduled_timezone=cleaned_timezone,
      tournament_public_id=nullif(trim(coalesce(requested_tournament_public_id,'')),''),
      opponent_wpi_team_id=nullif(trim(coalesce(requested_opponent_wpi_team_id,'')),''),
      team_logo_url=cleaned_team_logo,
      opponent_logo_url=cleaned_opponent_logo,
      reconciliation_status=reconcile_status,
      updated_by=caller,
      updated_at=now(),
      last_synced_at=now(),
      sync_version=extract(epoch from clock_timestamp())::bigint,
      state_snapshot=jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      jsonb_set(
                        jsonb_set(
                          jsonb_set(
                            jsonb_set(state_snapshot,'{setup,opponentName}',to_jsonb(cleaned_opponent),true),
                            '{setup,gameDateTime}',to_jsonb(case when requested_scheduled_at is null then '' else to_char(requested_scheduled_at at time zone cleaned_timezone,'YYYY-MM-DD"T"HH24:MI') end),true
                          ),
                          '{setup,venue}',to_jsonb(coalesce(cleaned_venue,'')),true
                        ),
                        '{setup,quarterLength}',to_jsonb(quarter_minutes),true
                      ),
                      '{setup,gameKind}',to_jsonb(cleaned_kind),true
                    ),
                    '{setup,source}',to_jsonb(case when cleaned_kind='tournament' then 'manual_tournament' else 'manual_scrimmage' end),true
                  ),
                  '{setup,tournamentName}',coalesce(to_jsonb(cleaned_tournament),'null'::jsonb),true
                ),
                '{setup,tournamentPublicId}',coalesce(to_jsonb(nullif(trim(coalesce(requested_tournament_public_id,'')),'')),'null'::jsonb),true
              ),
              '{setup,opponentWpiTeamId}',coalesce(to_jsonb(nullif(trim(coalesce(requested_opponent_wpi_team_id,'')),'')),'null'::jsonb),true
            ),
            '{setup,teamLogoUrl}',coalesce(to_jsonb(cleaned_team_logo),'null'::jsonb),true
          ),
          '{setup,opponentLogoUrl}',coalesce(to_jsonb(cleaned_opponent_logo),'null'::jsonb),true
        ),
        '{setup,reconciliationStatus}',to_jsonb(reconcile_status),true
      )
  where id=target_game_id;

  return jsonb_build_object('gameId',target_game_id,'gameKind',cleaned_kind,'reconciliationStatus',reconcile_status);
end;
$$;

grant execute on function public.live_update_planned_game_v1(uuid,text,text,timestamptz,text,text,integer,text,text,text,text,text) to authenticated;

create or replace function public.live_cancel_planned_game_v1(target_game_id uuid,cancel_reason text default null)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  game_row public.live_games%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into game_row from public.live_games where id=target_game_id for update;
  if game_row.id is null then raise exception 'Game not found'; end if;
  select role into caller_role from public.live_team_members where team_id=game_row.team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'A Team Owner or Admin must cancel this game'; end if;
  if game_row.status not in ('setup','scheduled') or game_row.started_at is not null then
    raise exception 'A live or completed game cannot be cancelled from the Game-Day Hub';
  end if;

  update public.live_games
  set status='cancelled',
      cancelled_reason=nullif(trim(coalesce(cancel_reason,'')),''),
      updated_by=caller,
      updated_at=now(),
      state_snapshot=jsonb_set(state_snapshot,'{game,status}','"cancelled"'::jsonb,true)
  where id=target_game_id;
end;
$$;

grant execute on function public.live_cancel_planned_game_v1(uuid,text) to authenticated;

-- 7.57.7 will use these canonical rows during schedule reconciliation. The
-- safety contract is explicit here: official identifiers may be attached to a
-- provisional manual tournament row only if doing so does not collide with an
-- already-linked official source row. Scored state is never overwritten here.
create or replace function public.live_link_manual_tournament_game_v1(
  target_game_id uuid,
  official_tournament_event_id text,
  official_source_game_id text,
  match_confidence numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  game_row public.live_games%rowtype;
  duplicate_id uuid;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into game_row from public.live_games where id=target_game_id for update;
  if game_row.id is null then raise exception 'Game not found'; end if;
  select role into caller_role from public.live_team_members where team_id=game_row.team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'A Team Owner or Admin must verify a tournament match'; end if;
  if game_row.game_kind<>'tournament' then raise exception 'Only tournament games can be reconciled'; end if;
  if nullif(trim(coalesce(official_tournament_event_id,'')),'') is null or nullif(trim(coalesce(official_source_game_id,'')),'') is null then
    raise exception 'Official tournament and game identifiers are required';
  end if;

  select id into duplicate_id
  from public.live_games
  where team_id=game_row.team_id
    and environment=game_row.environment
    and tournament_event_id=official_tournament_event_id
    and source_game_id=official_source_game_id
    and id<>target_game_id
  limit 1;

  if duplicate_id is not null then
    raise exception 'Official tournament game is already linked to another WPI Live record';
  end if;

  update public.live_games
  set tournament_event_id=official_tournament_event_id,
      source_game_id=official_source_game_id,
      source_mode='tournament_override',
      reconciliation_status='verified',
      reconciliation_confidence=case when match_confidence is null then null else greatest(0,least(1,match_confidence)) end,
      reconciled_at=now(),
      reconciled_by=caller,
      updated_by=caller,
      updated_at=now(),
      state_snapshot=jsonb_set(state_snapshot,'{setup,reconciliationStatus}','"verified"'::jsonb,true)
  where id=target_game_id;

  return jsonb_build_object('gameId',target_game_id,'reconciliationStatus','verified');
end;
$$;

grant execute on function public.live_link_manual_tournament_game_v1(uuid,text,text,numeric) to authenticated;
