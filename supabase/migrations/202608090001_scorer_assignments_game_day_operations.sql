-- WPI 7.57.9 — Scorer Assignments & Game-Day Operations.
-- Adds pre-game scoring coverage without replacing the existing active-scorer
-- control/handoff system. Assignment is operational responsibility; once a game
-- starts, live_game_scorer_sessions remains authoritative for scoring control.

alter table public.live_games
  add column if not exists assigned_scorer_user_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_scorer_display_name text,
  add column if not exists assigned_at timestamptz,
  add column if not exists assigned_by uuid references auth.users(id) on delete set null;

create index if not exists live_games_team_assigned_scorer_status_idx
  on public.live_games(team_id,assigned_scorer_user_id,status,scheduled_at);

create table if not exists public.live_game_assignment_audit (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.live_games(id) on delete cascade,
  team_id uuid not null references public.live_teams(id) on delete cascade,
  previous_scorer_user_id uuid references auth.users(id) on delete set null,
  previous_scorer_display_name text,
  assigned_scorer_user_id uuid references auth.users(id) on delete set null,
  assigned_scorer_display_name text,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now()
);

create index if not exists live_game_assignment_audit_game_idx
  on public.live_game_assignment_audit(game_id,changed_at desc);

alter table public.live_game_assignment_audit enable row level security;

drop policy if exists live_game_assignment_audit_team_read on public.live_game_assignment_audit;
create policy live_game_assignment_audit_team_read
  on public.live_game_assignment_audit
  for select to authenticated
  using (
    exists(
      select 1 from public.live_team_members m
      where m.team_id=live_game_assignment_audit.team_id
        and m.user_id=auth.uid()
    )
  );

create or replace function public.live_assign_game_scorer_v1(
  target_game_id uuid,
  target_scorer_user_id uuid default null
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
  target_role public.live_team_role;
  target_name text;
  prior_user uuid;
  prior_name text;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into game_row
  from public.live_games
  where id=target_game_id
  for update;

  if game_row.id is null then raise exception 'Game not found'; end if;

  select role into caller_role
  from public.live_team_members
  where team_id=game_row.team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'A Team Owner or Admin must assign game coverage';
  end if;

  if game_row.started_at is not null or game_row.status not in ('setup','scheduled') then
    raise exception 'Scorer assignment can only change before the game starts';
  end if;

  prior_user := game_row.assigned_scorer_user_id;
  prior_name := game_row.assigned_scorer_display_name;

  if target_scorer_user_id is not null then
    select role into target_role
    from public.live_team_members
    where team_id=game_row.team_id and user_id=target_scorer_user_id;

    if target_role is null or target_role not in ('owner','admin','scorer') then
      raise exception 'Assigned scorer must be a permanent Owner, Admin, or Scorer on this team';
    end if;

    target_name := public.live_user_display_name(target_scorer_user_id);
  end if;

  update public.live_games
  set assigned_scorer_user_id=target_scorer_user_id,
      assigned_scorer_display_name=case when target_scorer_user_id is null then null else target_name end,
      assigned_at=case when target_scorer_user_id is null then null else now() end,
      assigned_by=case when target_scorer_user_id is null then null else caller end,
      updated_by=caller,
      updated_at=now()
  where id=target_game_id;

  if prior_user is distinct from target_scorer_user_id then
    insert into public.live_game_assignment_audit(
      game_id,team_id,previous_scorer_user_id,previous_scorer_display_name,
      assigned_scorer_user_id,assigned_scorer_display_name,changed_by
    ) values (
      target_game_id,game_row.team_id,prior_user,prior_name,
      target_scorer_user_id,case when target_scorer_user_id is null then null else target_name end,caller
    );
  end if;

  return jsonb_build_object(
    'gameId',target_game_id,
    'assignedScorerUserId',target_scorer_user_id,
    'assignedScorerDisplayName',case when target_scorer_user_id is null then null else target_name end
  );
end;
$$;

grant execute on function public.live_assign_game_scorer_v1(uuid,uuid) to authenticated;

create or replace function public.live_game_day_queue_v4(target_team_id uuid)
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
        'assignedScorerUserId',g.assigned_scorer_user_id,
        'assignedScorerDisplayName',g.assigned_scorer_display_name,
        'assignedAt',g.assigned_at,'assignedBy',g.assigned_by,
        'isAssignedToMe',g.assigned_scorer_user_id=caller,
        'canStart',case
          when g.status='live' then true
          when g.status not in ('setup','scheduled') or g.started_at is not null then false
          when member_role in ('owner','admin') then true
          when member_role='scorer' and (g.assigned_scorer_user_id is null or g.assigned_scorer_user_id=caller) then true
          else false
        end,
        'cancelledReason',g.cancelled_reason,'canManage',member_role in ('owner','admin')
      ) as row_data
    from public.live_games g
    where g.team_id=target_team_id and g.status <> 'cancelled'
  ) rows;
  return jsonb_build_object('role',member_role,'games',queue);
end;
$$;

grant execute on function public.live_game_day_queue_v4(uuid) to authenticated;

create or replace function public.live_prepare_game_start_v2(target_game_id uuid)
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
  if caller_role is null or caller_role not in ('owner','admin','scorer') then raise exception 'Scorer access required'; end if;

  if caller_role='scorer'
     and game_row.assigned_scorer_user_id is not null
     and game_row.assigned_scorer_user_id<>caller then
    raise exception 'This game is assigned to %. Ask an Owner/Admin to reassign it or use scorer handoff after the game starts.',
      coalesce(game_row.assigned_scorer_display_name,'another scorer');
  end if;

  -- An unassigned permanent Scorer who launches the game claims pre-game
  -- responsibility automatically. Owners/Admins remain emergency-capable and
  -- do not silently rewrite an existing assignment.
  if caller_role='scorer' and game_row.assigned_scorer_user_id is null and game_row.started_at is null then
    display_name := public.live_user_display_name(caller);
    update public.live_games
    set assigned_scorer_user_id=caller,
        assigned_scorer_display_name=display_name,
        assigned_at=now(),
        assigned_by=caller,
        updated_by=caller,
        updated_at=now()
    where id=target_game_id;

    insert into public.live_game_assignment_audit(
      game_id,team_id,assigned_scorer_user_id,assigned_scorer_display_name,changed_by
    ) values (target_game_id,game_row.team_id,caller,display_name,caller);
  end if;

  select * into active_row
  from public.live_game_scorer_sessions
  where game_id=target_game_id and status='active'
  order by activated_at desc limit 1;

  if active_row.id is not null then
    if active_row.user_id=caller then return public.live_scorer_control_status(target_game_id); end if;
    raise exception 'Scoring is currently controlled by %',active_row.display_name;
  end if;

  display_name := coalesce(display_name,public.live_user_display_name(caller));
  -- Existing scorer-control RPC remains authoritative for session creation,
  -- control versioning, exactly-one-active-scorer enforcement, and scorer audit.
  return public.live_claim_game_scorer(target_game_id,display_name);
end;
$$;

grant execute on function public.live_prepare_game_start_v2(uuid) to authenticated;

create or replace function public.live_clear_invalid_game_assignments()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  affected_team uuid;
  affected_user uuid;
  should_clear boolean := false;
begin
  if tg_op='DELETE' then
    affected_team := old.team_id;
    affected_user := old.user_id;
    should_clear := true;
  else
    affected_team := new.team_id;
    affected_user := new.user_id;
    should_clear := new.role='viewer';
  end if;

  if should_clear then
    update public.live_games
    set assigned_scorer_user_id=null,
        assigned_scorer_display_name=null,
        assigned_at=null,
        assigned_by=null,
        updated_at=now()
    where team_id=affected_team
      and assigned_scorer_user_id=affected_user
      and started_at is null
      and status in ('setup','scheduled');
  end if;

  if tg_op='DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists live_clear_invalid_game_assignments_trigger on public.live_team_members;
create trigger live_clear_invalid_game_assignments_trigger
  after delete or update of role on public.live_team_members
  for each row execute function public.live_clear_invalid_game_assignments();

comment on column public.live_games.assigned_scorer_user_id is 'Pregame scoring coverage assignment. Active scoring control remains authoritative in live_game_scorer_sessions.';
comment on table public.live_game_assignment_audit is 'Immutable pregame scoring coverage assignment history; separate from active scorer-control/handoff audit.';
