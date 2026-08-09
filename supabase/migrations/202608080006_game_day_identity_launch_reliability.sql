-- WPI 7.57.7 — Game-Day Identity & Launch Reliability.
-- Preserves the raw opponent label for future tournament reconciliation while
-- allowing a canonical WPI display name/logo in scoring. Adds an explicit
-- scorer-control preparation RPC so every pre-created Tournament/Friendly game
-- can start reliably without changing the validated 7.56.15 scoring engine.

alter table public.live_games
  add column if not exists opponent_source_name text,
  add column if not exists opponent_wpi_club_id text;

update public.live_games
set opponent_source_name=opponent_name
where opponent_source_name is null;

comment on column public.live_games.opponent_source_name is
  'Exact manual/imported opponent label retained for later tournament reconciliation even when opponent_name uses a canonical WPI display label.';
comment on column public.live_games.opponent_wpi_club_id is
  'Canonical WPI club identity used for display/logo resolution without forcing an uncertain team-level match.';

create or replace function public.live_create_manual_game_v3(
  target_team_id uuid,
  requested_game_kind text,
  requested_opponent_name text,
  requested_opponent_source_name text default null,
  requested_scheduled_at timestamptz default null,
  requested_timezone text default 'UTC',
  requested_venue text default null,
  requested_quarter_length_minutes integer default 7,
  requested_tournament_name text default null,
  requested_tournament_public_id text default null,
  requested_opponent_wpi_team_id text default null,
  requested_opponent_wpi_club_id text default null,
  requested_team_logo_url text default null,
  requested_opponent_logo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
  created_game_id uuid;
  cleaned_source text := coalesce(nullif(trim(coalesce(requested_opponent_source_name,'')),''),trim(coalesce(requested_opponent_name,'')));
  cleaned_kind text := lower(trim(coalesce(requested_game_kind,'')));
begin
  -- Scrimmage is retained only as backward-compatible input. New 7.57.7 UX
  -- exposes Tournament or Friendly, and maps any legacy scrimmage request to Friendly.
  if cleaned_kind='scrimmage' then cleaned_kind := 'friendly'; end if;
  if cleaned_kind not in ('tournament','friendly') then
    raise exception 'Game type must be tournament or friendly';
  end if;

  result := public.live_create_manual_game_v2(
    target_team_id,
    cleaned_kind,
    requested_opponent_name,
    requested_scheduled_at,
    requested_timezone,
    requested_venue,
    requested_quarter_length_minutes,
    requested_tournament_name,
    requested_tournament_public_id,
    requested_opponent_wpi_team_id,
    requested_team_logo_url,
    requested_opponent_logo_url
  );
  created_game_id := (result->>'gameId')::uuid;

  update public.live_games
  set opponent_source_name=cleaned_source,
      opponent_wpi_club_id=nullif(trim(coalesce(requested_opponent_wpi_club_id,'')),''),
      game_kind=cleaned_kind,
      updated_at=now()
  where id=created_game_id;

  return result || jsonb_build_object(
    'gameKind',cleaned_kind,
    'opponentSourceName',cleaned_source,
    'opponentWpiClubId',nullif(trim(coalesce(requested_opponent_wpi_club_id,'')),'')
  );
end;
$$;

grant execute on function public.live_create_manual_game_v3(uuid,text,text,text,timestamptz,text,text,integer,text,text,text,text,text,text) to authenticated;

create or replace function public.live_update_planned_game_v2(
  target_game_id uuid,
  requested_game_kind text,
  requested_opponent_name text,
  requested_opponent_source_name text default null,
  requested_scheduled_at timestamptz default null,
  requested_timezone text default 'UTC',
  requested_venue text default null,
  requested_quarter_length_minutes integer default 7,
  requested_tournament_name text default null,
  requested_tournament_public_id text default null,
  requested_opponent_wpi_team_id text default null,
  requested_opponent_wpi_club_id text default null,
  requested_team_logo_url text default null,
  requested_opponent_logo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
  cleaned_source text := coalesce(nullif(trim(coalesce(requested_opponent_source_name,'')),''),trim(coalesce(requested_opponent_name,'')));
  cleaned_kind text := lower(trim(coalesce(requested_game_kind,'')));
begin
  if cleaned_kind='scrimmage' then cleaned_kind := 'friendly'; end if;
  if cleaned_kind not in ('tournament','friendly') then
    raise exception 'Game type must be tournament or friendly';
  end if;

  result := public.live_update_planned_game_v1(
    target_game_id,
    cleaned_kind,
    requested_opponent_name,
    requested_scheduled_at,
    requested_timezone,
    requested_venue,
    requested_quarter_length_minutes,
    requested_tournament_name,
    requested_tournament_public_id,
    requested_opponent_wpi_team_id,
    requested_team_logo_url,
    requested_opponent_logo_url
  );

  update public.live_games
  set opponent_source_name=cleaned_source,
      opponent_wpi_club_id=nullif(trim(coalesce(requested_opponent_wpi_club_id,'')),''),
      game_kind=cleaned_kind,
      updated_at=now()
  where id=target_game_id;

  return result || jsonb_build_object(
    'gameKind',cleaned_kind,
    'opponentSourceName',cleaned_source,
    'opponentWpiClubId',nullif(trim(coalesce(requested_opponent_wpi_club_id,'')),'')
  );
end;
$$;

grant execute on function public.live_update_planned_game_v2(uuid,text,text,text,timestamptz,text,text,integer,text,text,text,text,text,text) to authenticated;

create or replace function public.live_game_day_queue_v2(target_team_id uuid)
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

  select coalesce(jsonb_agg(row_data order by sort_rank,sort_time desc nulls last,sort_updated desc),'[]'::jsonb)
  into queue
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end as sort_rank,
      g.scheduled_at as sort_time,
      g.updated_at as sort_updated,
      jsonb_build_object(
        'id',g.id,'clientGameId',g.client_game_id,'teamId',g.team_id,
        'teamName',g.team_name_snapshot,'opponentName',g.opponent_name,
        'opponentSourceName',coalesce(g.opponent_source_name,g.opponent_name),
        'scheduledAt',g.scheduled_at,'venue',g.venue,'ageGroup',g.age_group,
        'quarterLengthSeconds',g.quarter_length_seconds,'status',g.status,
        'teamScore',g.team_score,'opponentScore',g.opponent_score,
        'startedAt',g.started_at,'endedAt',g.ended_at,'updatedAt',g.updated_at,
        'gameKind',g.game_kind,'creationSource',g.creation_source,
        'tournamentName',g.tournament_name,'scheduledTimezone',g.scheduled_timezone,
        'tournamentPublicId',g.tournament_public_id,
        'officialTournamentEventId',g.tournament_event_id,'officialSourceGameId',g.source_game_id,
        'opponentWpiTeamId',g.opponent_wpi_team_id,'opponentWpiClubId',g.opponent_wpi_club_id,
        'teamLogoUrl',g.team_logo_url,'opponentLogoUrl',g.opponent_logo_url,
        'reconciliationStatus',g.reconciliation_status,'reconciliationConfidence',g.reconciliation_confidence,
        'cancelledReason',g.cancelled_reason,'canManage',member_role in ('owner','admin')
      ) as row_data
    from public.live_games g
    where g.team_id=target_team_id and g.status <> 'cancelled'
  ) rows;
  return jsonb_build_object('role',member_role,'games',queue);
end;
$$;

grant execute on function public.live_game_day_queue_v2(uuid) to authenticated;

create or replace function public.live_prepare_game_start_v1(target_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  caller_role public.live_team_role;
  active_row public.live_game_scorer_sessions%rowtype;
  display_name text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_game_id::text || ':scorer-control',0));
  select * into game_row from public.live_games where id=target_game_id for update;
  if game_row.id is null then raise exception 'Game not found'; end if;
  if game_row.status in ('final','cancelled') then raise exception 'This game is no longer open for scoring'; end if;

  select role into caller_role from public.live_team_members where team_id=game_row.team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin','scorer') then
    raise exception 'Scorer access required';
  end if;

  select * into active_row
  from public.live_game_scorer_sessions
  where game_id=target_game_id and status='active'
  order by activated_at desc limit 1;

  if active_row.id is not null then
    if active_row.user_id=caller then return public.live_scorer_control_status(target_game_id); end if;
    raise exception 'Scoring is currently controlled by %',active_row.display_name;
  end if;

  display_name := public.live_user_display_name(caller);
  -- The existing scorer-control RPC remains authoritative for session creation,
  -- audit history, control versioning, and exactly-one-active-scorer enforcement.
  return public.live_claim_game_scorer(target_game_id,display_name);
end;
$$;

grant execute on function public.live_prepare_game_start_v1(uuid) to authenticated;
