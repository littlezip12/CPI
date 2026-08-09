-- WPI 7.57.8 — Tournament Schedule Integration & Reconciliation.
-- Connects the public WPI tournament schedule to private WPI Live without
-- changing the validated scorer/delivery engine. Official schedule rows can
-- create new planned games or reconcile into an existing manual tournament
-- fallback. A scored manual game always remains the canonical live_games row.

alter table public.live_games
  add column if not exists official_scheduled_at timestamptz,
  add column if not exists official_venue text,
  add column if not exists official_opponent_name text,
  add column if not exists official_division_id text,
  add column if not exists official_division_label text,
  add column if not exists official_game_number text,
  add column if not exists official_stage text,
  add column if not exists official_status text,
  add column if not exists official_team_score numeric(6,1),
  add column if not exists official_opponent_score numeric(6,1),
  add column if not exists official_last_seen_at timestamptz,
  add column if not exists official_snapshot jsonb,
  add column if not exists reconciliation_candidate_event_id text,
  add column if not exists reconciliation_candidate_game_id text,
  add column if not exists reconciliation_candidate_snapshot jsonb,
  add column if not exists reconciliation_candidate_seen_at timestamptz;

comment on column public.live_games.official_snapshot is
  'Latest public WPI tournament schedule metadata observed for the linked official matchup. Never replaces the WPI Live event log.';
comment on column public.live_games.reconciliation_candidate_snapshot is
  'Ambiguous official schedule candidate retained for explicit Owner/Admin review before linking.';

-- Database-level duplicate protection: one WPI Live record per official schedule
-- matchup for a team/environment. Manual fallback rows receive these IDs when
-- reconciled, so the later official import cannot create a second record.
create unique index if not exists live_games_unique_official_schedule_game_idx
  on public.live_games(team_id,environment,tournament_event_id,source_game_id)
  where tournament_event_id is not null and source_game_id is not null;

create index if not exists live_games_reconciliation_candidate_idx
  on public.live_games(team_id,reconciliation_candidate_event_id,reconciliation_candidate_game_id)
  where reconciliation_status='possible_match';

create or replace function public.live_sync_official_tournament_game_v1(
  target_team_id uuid,
  official_game jsonb,
  candidate_manual_game_id uuid default null,
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
  team_row public.live_teams%rowtype;
  existing_row public.live_games%rowtype;
  candidate_row public.live_games%rowtype;
  created jsonb;
  created_game_id uuid;
  event_id text := nullif(trim(coalesce(official_game->>'eventId','')),'');
  game_id text := nullif(trim(coalesce(official_game->>'gameId','')),'');
  tournament_name text := nullif(trim(coalesce(official_game->>'tournamentName','')),'');
  tournament_public_id text := nullif(trim(coalesce(official_game->>'tournamentPublicId','')),'');
  scheduled_at timestamptz := nullif(official_game->>'scheduledAt','')::timestamptz;
  timezone_name text := coalesce(nullif(trim(coalesce(official_game->>'timezone','')),''),'UTC');
  venue_name text := nullif(trim(coalesce(official_game->>'venue','')),'');
  age_group_name text := nullif(trim(coalesce(official_game->>'ageGroup','')),'');
  opponent_name text := nullif(trim(coalesce(official_game->>'opponentName','')),'');
  opponent_source_name text := coalesce(nullif(trim(coalesce(official_game->>'opponentSourceName','')),''),opponent_name);
  opponent_team_id text := nullif(trim(coalesce(official_game->>'opponentWpiTeamId','')),'');
  opponent_club_id text := nullif(trim(coalesce(official_game->>'opponentWpiClubId','')),'');
  team_logo text := case when coalesce(official_game->>'teamLogoUrl','') ~ '^assets/(logos|branding)/' then official_game->>'teamLogoUrl' else null end;
  opponent_logo text := case when coalesce(official_game->>'opponentLogoUrl','') ~ '^assets/(logos|branding)/' then official_game->>'opponentLogoUrl' else null end;
  official_team_score_value numeric := nullif(official_game->>'teamScore','')::numeric;
  official_opponent_score_value numeric := nullif(official_game->>'opponentScore','')::numeric;
  confidence numeric := case when match_confidence is null then null else greatest(0,least(1,match_confidence)) end;
  resulting_status text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if event_id is null or game_id is null then raise exception 'Official tournament event and game identifiers are required'; end if;
  if tournament_name is null then raise exception 'Official tournament name is required'; end if;
  if opponent_name is null then raise exception 'Official opponent is required'; end if;

  select * into team_row from public.live_teams where id=target_team_id;
  if team_row.id is null then raise exception 'Team not found'; end if;
  select role into caller_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'A Team Owner or Admin must sync the tournament schedule';
  end if;
  if age_group_name is not null and upper(age_group_name)<>upper(team_row.age_group) then
    raise exception 'Official game age group does not match this team';
  end if;
  if not exists(select 1 from pg_timezone_names where name=timezone_name) then timezone_name := 'UTC'; end if;

  perform pg_advisory_xact_lock(hashtextextended(target_team_id::text || ':' || event_id || ':' || game_id,0));

  select * into existing_row
  from public.live_games
  where team_id=target_team_id
    and tournament_event_id=event_id
    and source_game_id=game_id
  order by updated_at desc
  limit 1
  for update;

  -- Already-linked official game: refresh only official metadata. Planned games
  -- may inherit schedule corrections; live/final scoring state is never rewritten.
  if existing_row.id is not null then
    resulting_status := existing_row.reconciliation_status;
    if existing_row.status='final'
       and official_team_score_value is not null
       and official_opponent_score_value is not null then
      if abs(existing_row.team_score::numeric-official_team_score_value) < 0.01
         and abs(existing_row.opponent_score::numeric-official_opponent_score_value) < 0.01 then
        resulting_status := 'verified';
      else
        resulting_status := 'conflict';
      end if;
    elsif resulting_status not in ('conflict') then
      resulting_status := 'verified';
    end if;

    update public.live_games
    set official_scheduled_at=scheduled_at,
        official_venue=venue_name,
        official_opponent_name=opponent_source_name,
        official_division_id=nullif(trim(coalesce(official_game->>'divisionId','')),''),
        official_division_label=nullif(trim(coalesce(official_game->>'divisionLabel','')),''),
        official_game_number=nullif(trim(coalesce(official_game->>'gameNumber','')),''),
        official_stage=nullif(trim(coalesce(official_game->>'stage','')),''),
        official_status=nullif(trim(coalesce(official_game->>'status','')),''),
        official_team_score=official_team_score_value,
        official_opponent_score=official_opponent_score_value,
        official_last_seen_at=now(),
        official_snapshot=official_game,
        reconciliation_status=resulting_status,
        reconciliation_confidence=coalesce(confidence,reconciliation_confidence),
        reconciliation_candidate_event_id=null,
        reconciliation_candidate_game_id=null,
        reconciliation_candidate_snapshot=null,
        reconciliation_candidate_seen_at=null,
        scheduled_at=case when existing_row.started_at is null and existing_row.status in ('setup','scheduled') then coalesce(scheduled_at,existing_row.scheduled_at) else existing_row.scheduled_at end,
        venue=case when existing_row.started_at is null and existing_row.status in ('setup','scheduled') then coalesce(venue_name,existing_row.venue) else existing_row.venue end,
        opponent_name=case when existing_row.started_at is null and existing_row.status in ('setup','scheduled') then coalesce(opponent_name,existing_row.opponent_name) else existing_row.opponent_name end,
        opponent_source_name=coalesce(opponent_source_name,existing_row.opponent_source_name),
        opponent_wpi_team_id=coalesce(opponent_team_id,existing_row.opponent_wpi_team_id),
        opponent_wpi_club_id=coalesce(opponent_club_id,existing_row.opponent_wpi_club_id),
        team_logo_url=coalesce(team_logo,existing_row.team_logo_url),
        opponent_logo_url=coalesce(opponent_logo,existing_row.opponent_logo_url),
        updated_at=now()
    where id=existing_row.id;

    return jsonb_build_object('action','refreshed','gameId',existing_row.id,'reconciliationStatus',resulting_status);
  end if;

  -- A manual fallback candidate was found by the browser-side identity/time matcher.
  if candidate_manual_game_id is not null then
    select * into candidate_row
    from public.live_games
    where id=candidate_manual_game_id and team_id=target_team_id
    for update;

    if candidate_row.id is null then raise exception 'Manual reconciliation candidate was not found'; end if;
    if candidate_row.game_kind<>'tournament' then raise exception 'Only a manual tournament game can be reconciled'; end if;
    if candidate_row.tournament_event_id is not null or candidate_row.source_game_id is not null then
      raise exception 'Manual reconciliation candidate is already linked to an official game';
    end if;
    if candidate_row.reconciliation_status='dismissed'
       and candidate_row.reconciliation_candidate_event_id=event_id
       and candidate_row.reconciliation_candidate_game_id=game_id then
      return jsonb_build_object('action','dismissed','gameId',candidate_row.id,'reconciliationStatus','dismissed');
    end if;

    -- High-confidence unique matches reconcile automatically. Lower-confidence
    -- candidates persist for explicit Owner/Admin review and do not create a
    -- duplicate official schedule row.
    if coalesce(confidence,0) < 0.85 then
      update public.live_games
      set reconciliation_status='possible_match',
          reconciliation_confidence=confidence,
          reconciliation_candidate_event_id=event_id,
          reconciliation_candidate_game_id=game_id,
          reconciliation_candidate_snapshot=official_game,
          reconciliation_candidate_seen_at=now(),
          official_last_seen_at=now(),
          updated_at=now()
      where id=candidate_row.id;
      return jsonb_build_object('action','possible_match','gameId',candidate_row.id,'reconciliationStatus','possible_match','confidence',confidence);
    end if;

    resulting_status := 'verified';
    if candidate_row.status='final'
       and official_team_score_value is not null
       and official_opponent_score_value is not null
       and (abs(candidate_row.team_score::numeric-official_team_score_value) >= 0.01
            or abs(candidate_row.opponent_score::numeric-official_opponent_score_value) >= 0.01) then
      resulting_status := 'conflict';
    end if;

    update public.live_games
    set tournament_event_id=event_id,
        source_game_id=game_id,
        source_mode='tournament_override',
        tournament_name=tournament_name,
        tournament_public_id=coalesce(tournament_public_id,event_id),
        official_scheduled_at=scheduled_at,
        official_venue=venue_name,
        official_opponent_name=opponent_source_name,
        official_division_id=nullif(trim(coalesce(official_game->>'divisionId','')),''),
        official_division_label=nullif(trim(coalesce(official_game->>'divisionLabel','')),''),
        official_game_number=nullif(trim(coalesce(official_game->>'gameNumber','')),''),
        official_stage=nullif(trim(coalesce(official_game->>'stage','')),''),
        official_status=nullif(trim(coalesce(official_game->>'status','')),''),
        official_team_score=official_team_score_value,
        official_opponent_score=official_opponent_score_value,
        official_last_seen_at=now(),
        official_snapshot=official_game,
        reconciliation_status=resulting_status,
        reconciliation_confidence=confidence,
        reconciled_at=now(),
        reconciled_by=caller,
        reconciliation_candidate_event_id=null,
        reconciliation_candidate_game_id=null,
        reconciliation_candidate_snapshot=null,
        reconciliation_candidate_seen_at=null,
        scheduled_at=case when candidate_row.started_at is null and candidate_row.status in ('setup','scheduled') then coalesce(scheduled_at,candidate_row.scheduled_at) else candidate_row.scheduled_at end,
        venue=case when candidate_row.started_at is null and candidate_row.status in ('setup','scheduled') then coalesce(venue_name,candidate_row.venue) else candidate_row.venue end,
        opponent_name=case when candidate_row.started_at is null and candidate_row.status in ('setup','scheduled') then coalesce(opponent_name,candidate_row.opponent_name) else candidate_row.opponent_name end,
        opponent_source_name=coalesce(opponent_source_name,candidate_row.opponent_source_name),
        opponent_wpi_team_id=coalesce(opponent_team_id,candidate_row.opponent_wpi_team_id),
        opponent_wpi_club_id=coalesce(opponent_club_id,candidate_row.opponent_wpi_club_id),
        team_logo_url=coalesce(team_logo,candidate_row.team_logo_url),
        opponent_logo_url=coalesce(opponent_logo,candidate_row.opponent_logo_url),
        updated_by=caller,
        updated_at=now(),
        state_snapshot=jsonb_set(
          jsonb_set(state_snapshot,'{setup,reconciliationStatus}',to_jsonb(resulting_status),true),
          '{setup,source}','"manual_tournament_reconciled"'::jsonb,true
        )
    where id=candidate_row.id;

    return jsonb_build_object('action','reconciled','gameId',candidate_row.id,'reconciliationStatus',resulting_status,'confidence',confidence);
  end if;

  -- No manual fallback candidate: create the normal planned game using the
  -- existing roster/destination inheritance, then mark it as schedule-origin.
  created := public.live_create_manual_game_v3(
    target_team_id,
    'tournament',
    opponent_name,
    opponent_source_name,
    scheduled_at,
    timezone_name,
    venue_name,
    case when upper(team_row.age_group) in ('10U','12U') then 6 else 7 end,
    tournament_name,
    coalesce(tournament_public_id,event_id),
    opponent_team_id,
    opponent_club_id,
    team_logo,
    opponent_logo
  );
  created_game_id := (created->>'gameId')::uuid;

  update public.live_games
  set creation_source='tournament_schedule',
      tournament_event_id=event_id,
      source_game_id=game_id,
      source_mode='tournament_sheet',
      reconciliation_status='verified',
      reconciliation_confidence=1,
      reconciled_at=now(),
      reconciled_by=caller,
      official_scheduled_at=scheduled_at,
      official_venue=venue_name,
      official_opponent_name=opponent_source_name,
      official_division_id=nullif(trim(coalesce(official_game->>'divisionId','')),''),
      official_division_label=nullif(trim(coalesce(official_game->>'divisionLabel','')),''),
      official_game_number=nullif(trim(coalesce(official_game->>'gameNumber','')),''),
      official_stage=nullif(trim(coalesce(official_game->>'stage','')),''),
      official_status=nullif(trim(coalesce(official_game->>'status','')),''),
      official_team_score=official_team_score_value,
      official_opponent_score=official_opponent_score_value,
      official_last_seen_at=now(),
      official_snapshot=official_game,
      state_snapshot=jsonb_set(
        jsonb_set(state_snapshot,'{setup,reconciliationStatus}','"verified"'::jsonb,true),
        '{setup,source}','"tournament_schedule"'::jsonb,true
      ),
      updated_at=now()
  where id=created_game_id;

  return jsonb_build_object('action','created','gameId',created_game_id,'reconciliationStatus','verified','confidence',1);
end;
$$;

grant execute on function public.live_sync_official_tournament_game_v1(uuid,jsonb,uuid,numeric) to authenticated;

create or replace function public.live_confirm_tournament_reconciliation_v1(target_game_id uuid)
returns jsonb
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
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'A Team Owner or Admin must confirm a tournament match'; end if;
  if game_row.reconciliation_status<>'possible_match' or game_row.reconciliation_candidate_snapshot is null then
    raise exception 'There is no tournament match awaiting review';
  end if;
  -- Reuse the same synchronization path with review confidence forced to 1.
  return public.live_sync_official_tournament_game_v1(game_row.team_id,game_row.reconciliation_candidate_snapshot,game_row.id,1);
end;
$$;

grant execute on function public.live_confirm_tournament_reconciliation_v1(uuid) to authenticated;

create or replace function public.live_dismiss_tournament_reconciliation_v1(target_game_id uuid)
returns jsonb
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
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'A Team Owner or Admin must dismiss a tournament match'; end if;
  if game_row.reconciliation_status<>'possible_match' then raise exception 'There is no tournament match awaiting review'; end if;

  update public.live_games
  set reconciliation_status='dismissed',
      reconciliation_confidence=null,
      updated_by=caller,
      updated_at=now()
  where id=target_game_id;

  return jsonb_build_object('gameId',target_game_id,'reconciliationStatus','dismissed');
end;
$$;

grant execute on function public.live_dismiss_tournament_reconciliation_v1(uuid) to authenticated;

create or replace function public.live_game_day_queue_v3(target_team_id uuid)
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
        'reconciliationCandidateEventId',g.reconciliation_candidate_event_id,
        'reconciliationCandidateGameId',g.reconciliation_candidate_game_id,
        'reconciliationCandidateSnapshot',g.reconciliation_candidate_snapshot,
        'officialScheduledAt',g.official_scheduled_at,'officialVenue',g.official_venue,
        'officialOpponentName',g.official_opponent_name,'officialDivisionId',g.official_division_id,
        'officialDivisionLabel',g.official_division_label,'officialGameNumber',g.official_game_number,
        'officialStage',g.official_stage,'officialStatus',g.official_status,
        'officialTeamScore',g.official_team_score,'officialOpponentScore',g.official_opponent_score,
        'officialLastSeenAt',g.official_last_seen_at,
        'cancelledReason',g.cancelled_reason,'canManage',member_role in ('owner','admin')
      ) as row_data
    from public.live_games g
    where g.team_id=target_team_id and g.status <> 'cancelled'
  ) rows;
  return jsonb_build_object('role',member_role,'games',queue);
end;
$$;

grant execute on function public.live_game_day_queue_v3(uuid) to authenticated;
