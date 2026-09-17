-- WPI 7.64.10 — BAWPL Event & TBD Game Readiness
-- Adds durable league/event series plus planned game slots so teams can stage
-- a known number of games on a known date without inventing opponents or times.

alter table public.live_games
  add column if not exists league_event_name text,
  add column if not exists planned_game_slot_id uuid;

alter table public.live_games drop constraint if exists live_games_game_kind_check;
alter table public.live_games
  add constraint live_games_game_kind_check
  check (game_kind in ('tournament','scrimmage','friendly','regular_season','league'));

alter table public.live_game_series drop constraint if exists live_game_series_series_type_check;
alter table public.live_game_series
  add constraint live_game_series_series_type_check
  check (series_type in ('tournament','scrimmage_weekend','season_schedule','league_event'));

create table if not exists public.live_planned_game_slots (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.live_teams(id) on delete cascade,
  series_id uuid not null references public.live_game_series(id) on delete cascade,
  planned_date date not null,
  slot_number integer not null check (slot_number between 1 and 24),
  status text not null default 'planned' check (status in ('planned','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists live_planned_game_slots_active_identity_idx
  on public.live_planned_game_slots(series_id,planned_date,slot_number)
  where status='planned';
create index if not exists live_planned_game_slots_team_date_idx
  on public.live_planned_game_slots(team_id,planned_date,status);

alter table public.live_games
  drop constraint if exists live_games_planned_game_slot_id_fkey;
alter table public.live_games
  add constraint live_games_planned_game_slot_id_fkey
  foreign key (planned_game_slot_id) references public.live_planned_game_slots(id) on delete set null;
create unique index if not exists live_games_planned_game_slot_unique_idx
  on public.live_games(planned_game_slot_id)
  where planned_game_slot_id is not null and status<>'cancelled';

alter table public.live_planned_game_slots enable row level security;
drop policy if exists live_planned_game_slots_member_read on public.live_planned_game_slots;
create policy live_planned_game_slots_member_read
  on public.live_planned_game_slots for select to authenticated
  using (public.live_is_team_member(team_id));

comment on table public.live_planned_game_slots is
  'Non-game planning slots for a known event/date when opponent and/or start time are not yet published. A slot is never a scored game and never appears publicly.';
comment on column public.live_games.league_event_name is
  'Reusable league/event label (for example BAWPL) used to attach a league game to a durable WPI Live event series.';
comment on column public.live_games.planned_game_slot_id is
  'Optional planning-slot origin. The real WPI Live game remains canonical once schedule details are known.';

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
  elsif new.game_kind='league' and nullif(trim(coalesce(new.league_event_name,'')),'') is not null then
    desired_type := 'league_event';
    desired_name := trim(new.league_event_name);
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
      new.team_id,desired_type,desired_name,coalesce(new.competitive_season,'2026-2027'),desired_public_id,
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

revoke all on function public.live_series_link_trigger_v1() from public,anon;

drop trigger if exists live_games_series_link_trigger on public.live_games;
create trigger live_games_series_link_trigger
  before insert or update of game_kind,tournament_name,tournament_public_id,scrimmage_weekend_name,league_event_name,competitive_season,creation_source
  on public.live_games
  for each row execute function public.live_series_link_trigger_v1();

create or replace function public.live_plan_game_slots_v1(
  target_team_id uuid,
  requested_series_name text,
  requested_planned_date date,
  requested_game_count integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  team_row public.live_teams%rowtype;
  series_row public.live_game_series%rowtype;
  clean_name text := nullif(regexp_replace(trim(coalesce(requested_series_name,'')),'[[:space:]]+',' ','g'),'');
  desired_count integer := greatest(1,least(12,coalesce(requested_game_count,1)));
  slot_no integer;
  slots_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_has_team_role(target_team_id,array['owner','admin']::public.live_team_role[]) then
    raise exception 'Team Owner/Admin access required';
  end if;
  select * into team_row from public.live_teams where id=target_team_id and active=true;
  if team_row.id is null then raise exception 'Active team not found'; end if;
  if clean_name is null then raise exception 'Enter the league or event name'; end if;
  if char_length(clean_name)>120 then raise exception 'Event name must be 120 characters or fewer'; end if;
  if requested_planned_date is null then raise exception 'Choose the game date'; end if;
  if extract(year from requested_planned_date)::int not in (
    nullif(substring(team_row.competitive_season from '^[0-9]{4}'),'')::int,
    nullif(substring(team_row.competitive_season from '[0-9]{4}$'),'')::int
  ) then
    raise exception 'That date is outside %',team_row.competitive_season;
  end if;

  select * into series_row
  from public.live_game_series
  where team_id=target_team_id and series_type='league_event'
    and competitive_season=team_row.competitive_season and lower(name)=lower(clean_name)
  limit 1;

  if series_row.id is null then
    insert into public.live_game_series(team_id,series_type,name,competitive_season,creation_source,created_by)
    values(target_team_id,'league_event',clean_name,team_row.competitive_season,'manual',caller)
    returning * into series_row;
  end if;

  for slot_no in 1..desired_count loop
    if not exists(
      select 1 from public.live_planned_game_slots s
      where s.series_id=series_row.id and s.planned_date=requested_planned_date
        and s.slot_number=slot_no and s.status='planned'
    ) then
      insert into public.live_planned_game_slots(team_id,series_id,planned_date,slot_number,status,created_by)
      values(target_team_id,series_row.id,requested_planned_date,slot_no,'planned',caller);
    end if;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id',s.id,'seriesId',s.series_id,'seriesName',series_row.name,'seriesType',series_row.series_type,
      'plannedDate',s.planned_date,'slotNumber',s.slot_number,'status',s.status
    ) order by s.slot_number),'[]'::jsonb)
  into slots_json
  from public.live_planned_game_slots s
  where s.series_id=series_row.id and s.planned_date=requested_planned_date and s.status='planned'
    and not exists(select 1 from public.live_games g where g.planned_game_slot_id=s.id and g.status<>'cancelled');

  return jsonb_build_object(
    'series',jsonb_build_object('id',series_row.id,'name',series_row.name,'seriesType',series_row.series_type,'competitiveSeason',series_row.competitive_season),
    'plannedDate',requested_planned_date,'slots',slots_json
  );
end;
$$;
revoke all on function public.live_plan_game_slots_v1(uuid,text,date,integer) from public,anon;
grant execute on function public.live_plan_game_slots_v1(uuid,text,date,integer) to authenticated;

create or replace function public.live_cancel_game_slot_v1(target_slot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  slot_row public.live_planned_game_slots%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into slot_row from public.live_planned_game_slots where id=target_slot_id;
  if slot_row.id is null then raise exception 'Planned game slot not found'; end if;
  if not public.live_has_team_role(slot_row.team_id,array['owner','admin']::public.live_team_role[]) then
    raise exception 'Team Owner/Admin access required';
  end if;
  if exists(select 1 from public.live_games g where g.planned_game_slot_id=slot_row.id and g.status<>'cancelled') then
    raise exception 'This slot already has a real game. Edit or cancel the game instead.';
  end if;
  update public.live_planned_game_slots set status='cancelled',updated_at=now() where id=slot_row.id;
  return jsonb_build_object('slotId',slot_row.id,'status','cancelled');
end;
$$;
revoke all on function public.live_cancel_game_slot_v1(uuid) from public,anon;
grant execute on function public.live_cancel_game_slot_v1(uuid) to authenticated;

create or replace function public.live_save_game_day_v4(
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
  target_scorer_user_id uuid,
  target_planned_slot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  cleaned_kind text := lower(trim(coalesce(requested_game_kind,'')));
  clean_series text := nullif(regexp_replace(trim(coalesce(requested_series_name,'')),'[[:space:]]+',' ','g'),'');
  slot_row public.live_planned_game_slots%rowtype;
  slot_series public.live_game_series%rowtype;
  result jsonb;
  game_id uuid;
  saved_series public.live_game_series%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if cleaned_kind<>'league' then
    if target_planned_slot_id is not null then raise exception 'Only a league/event game can fill a planned game slot'; end if;
    return public.live_save_game_day_v3(
      target_team_id,target_game_id,requested_game_kind,requested_opponent_name,requested_opponent_source_name,requested_scheduled_at,
      requested_timezone,requested_venue,requested_quarter_length_minutes,requested_tournament_name,requested_tournament_public_id,requested_series_name,
      requested_opponent_wpi_team_id,requested_opponent_wpi_club_id,requested_team_logo_url,requested_opponent_logo_url,target_scorer_user_id
    );
  end if;

  if not public.live_has_team_role(target_team_id,array['owner','admin']::public.live_team_role[]) then raise exception 'Team Owner/Admin access required'; end if;
  if nullif(trim(coalesce(requested_opponent_name,'')),'') is null then raise exception 'Enter the opponent before creating the real game'; end if;

  if target_planned_slot_id is not null then
    select * into slot_row from public.live_planned_game_slots where id=target_planned_slot_id and team_id=target_team_id and status='planned';
    if slot_row.id is null then raise exception 'That planned game slot is no longer available'; end if;
    if exists(select 1 from public.live_games g where g.planned_game_slot_id=slot_row.id and g.status<>'cancelled' and g.id is distinct from target_game_id) then
      raise exception 'That planned slot already has a real game';
    end if;
    select * into slot_series from public.live_game_series where id=slot_row.series_id and team_id=target_team_id and series_type='league_event';
    if slot_series.id is null then raise exception 'Planned event record is unavailable'; end if;
    clean_series := slot_series.name;
    if requested_scheduled_at is not null and (requested_scheduled_at at time zone coalesce(nullif(trim(requested_timezone),''),'UTC'))::date <> slot_row.planned_date then
      raise exception 'This slot is planned for %. Use that date or cancel the slot and create a new one.',slot_row.planned_date;
    end if;
  end if;

  if clean_series is null then raise exception 'Choose or enter the league/event name'; end if;

  result := public.live_save_game_day_v1(
    target_team_id,target_game_id,'friendly',requested_opponent_name,requested_opponent_source_name,requested_scheduled_at,
    requested_timezone,requested_venue,requested_quarter_length_minutes,null,null,
    requested_opponent_wpi_team_id,requested_opponent_wpi_club_id,requested_team_logo_url,requested_opponent_logo_url,target_scorer_user_id
  );
  game_id := nullif(result->>'gameId','')::uuid;
  if game_id is null then raise exception 'Game save did not return an ID'; end if;

  update public.live_games
  set game_kind='league',
      league_event_name=clean_series,
      scrimmage_weekend_name=null,
      tournament_name=null,
      tournament_public_id=null,
      planned_game_slot_id=coalesce(target_planned_slot_id,planned_game_slot_id),
      reconciliation_status='not_applicable',
      state_snapshot=jsonb_set(
        coalesce(state_snapshot,'{}'::jsonb),'{setup}',
        coalesce(state_snapshot->'setup','{}'::jsonb) || jsonb_build_object(
          'gameKind','league','source','manual_league','creationSource','manual','seriesName',clean_series
        ),true
      ),
      updated_by=caller,updated_at=now()
  where id=game_id and team_id=target_team_id;

  select s.* into saved_series from public.live_games g join public.live_game_series s on s.id=g.series_id where g.id=game_id;
  if saved_series.id is null or saved_series.series_type<>'league_event' then raise exception 'WPI could not attach the game to its league/event record'; end if;
  perform public.live_apply_game_delivery_mode_v1(game_id);

  return result || jsonb_build_object(
    'gameId',game_id,'gameKind','league','seriesId',saved_series.id,'seriesType',saved_series.series_type,'seriesName',saved_series.name,
    'plannedSlotId',target_planned_slot_id
  );
end;
$$;
revoke all on function public.live_save_game_day_v4(uuid,uuid,text,text,text,timestamptz,text,text,integer,text,text,text,text,text,text,text,uuid,uuid) from public,anon;
grant execute on function public.live_save_game_day_v4(uuid,uuid,text,text,text,timestamptz,text,text,integer,text,text,text,text,text,text,text,uuid,uuid) to authenticated;

create or replace function public.live_game_day_queue_v6(target_team_id uuid)
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
  slots_json jsonb := '[]'::jsonb;
  league_events_json jsonb := '[]'::jsonb;
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
      coalesce(g.scheduled_at,(pgs.planned_date::timestamp at time zone coalesce(nullif(g.scheduled_timezone,''),'UTC'))) as sort_time,
      g.updated_at as sort_updated,
      (jsonb_build_object(
        'id',g.id,'clientGameId',g.client_game_id,'teamId',g.team_id,'teamName',g.team_name_snapshot,'opponentName',g.opponent_name,
        'opponentSourceName',coalesce(g.opponent_source_name,g.opponent_name),'scheduledAt',g.scheduled_at,'plannedDate',pgs.planned_date,'venue',g.venue,'ageGroup',g.age_group,
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
        'scrimmageWeekendName',g.scrimmage_weekend_name,'leagueEventName',g.league_event_name,'plannedGameSlotId',g.planned_game_slot_id
      )) as row_data
    from public.live_games g
    left join public.live_game_series s on s.id=g.series_id
    left join public.live_planned_game_slots pgs on pgs.id=g.planned_game_slot_id
    where g.team_id=target_team_id and g.status<>'cancelled'
  ) rows;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id',s.id,'teamId',s.team_id,'seriesId',s.series_id,'seriesName',gs.name,'seriesType',gs.series_type,
      'plannedDate',s.planned_date,'slotNumber',s.slot_number,'status',s.status,'canManage',member_role in ('owner','admin')
    ) order by s.planned_date,s.slot_number),'[]'::jsonb)
  into slots_json
  from public.live_planned_game_slots s
  join public.live_game_series gs on gs.id=s.series_id
  where s.team_id=target_team_id and s.status='planned'
    and not exists(select 1 from public.live_games g where g.planned_game_slot_id=s.id and g.status<>'cancelled');

  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'competitiveSeason',s.competitive_season) order by lower(s.name)),'[]'::jsonb)
  into league_events_json
  from public.live_game_series s
  where s.team_id=target_team_id and s.series_type='league_event';

  return jsonb_build_object('role',member_role,'games',queue,'plannedSlots',slots_json,'leagueEvents',league_events_json);
end;
$$;
revoke all on function public.live_game_day_queue_v6(uuid) from public,anon;
grant execute on function public.live_game_day_queue_v6(uuid) to authenticated;
