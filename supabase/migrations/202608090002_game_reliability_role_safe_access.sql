-- WPI 7.57.10 — Game Reliability & Role-Safe Access.
-- 1) Makes manual Game-Day save + pre-game assignment atomic and verifiable.
-- 2) Enforces least-privilege onboarding: every pending invitation is Viewer-first.
--    Owners/Admins promote accepted members afterward using existing access controls.
-- 3) Keeps active scorer control, handoff, event persistence, GroupMe delivery,
--    Final Whistle and game summaries unchanged.

-- ---------------------------------------------------------------------------
-- Least-privilege invitations
-- ---------------------------------------------------------------------------
alter table public.live_team_invites
  alter column role set default 'viewer';

-- Any invitation that has not yet been accepted becomes Viewer-first. Existing
-- accepted memberships are intentionally untouched.
update public.live_team_invites
set role='viewer',
    can_manage_groupme=false,
    updated_at=now()
where status='pending'
  and (role<>'viewer' or can_manage_groupme=true);

create or replace function public.live_force_pending_invite_viewer()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status='pending' and new.accepted_by is null then
    new.role := 'viewer';
    new.can_manage_groupme := false;
  end if;
  return new;
end;
$$;

drop trigger if exists live_force_pending_invite_viewer_trigger on public.live_team_invites;
create trigger live_force_pending_invite_viewer_trigger
  before insert or update on public.live_team_invites
  for each row execute function public.live_force_pending_invite_viewer();

create or replace function public.live_create_team_invite_v3(
  target_team_id uuid,
  invite_email text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
begin
  -- The existing v2 RPC remains the authorization authority. The database
  -- trigger above additionally guarantees that no older client can create a
  -- pending elevated invitation.
  result := public.live_create_team_invite_v2(
    target_team_id,
    invite_email,
    'viewer'::public.live_team_role,
    false
  );
  return result || jsonb_build_object(
    'role','viewer',
    'canManageGroupMe',false,
    'viewerFirst',true
  );
end;
$$;

grant execute on function public.live_create_team_invite_v3(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic Game-Day persistence
-- ---------------------------------------------------------------------------
create or replace function public.live_save_game_day_v1(
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
  game_result jsonb;
  assignment_result jsonb;
  saved_game_id uuid;
  saved_row public.live_games%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  if target_game_id is not null then
    if not exists(
      select 1 from public.live_games g
      where g.id=target_game_id and g.team_id=target_team_id
    ) then
      raise exception 'Game does not belong to this team workspace';
    end if;

    game_result := public.live_update_planned_game_v2(
      target_game_id,
      requested_game_kind,
      requested_opponent_name,
      requested_opponent_source_name,
      requested_scheduled_at,
      requested_timezone,
      requested_venue,
      requested_quarter_length_minutes,
      requested_tournament_name,
      requested_tournament_public_id,
      requested_opponent_wpi_team_id,
      requested_opponent_wpi_club_id,
      requested_team_logo_url,
      requested_opponent_logo_url
    );
    saved_game_id := target_game_id;
  else
    game_result := public.live_create_manual_game_v3(
      target_team_id,
      requested_game_kind,
      requested_opponent_name,
      requested_opponent_source_name,
      requested_scheduled_at,
      requested_timezone,
      requested_venue,
      requested_quarter_length_minutes,
      requested_tournament_name,
      requested_tournament_public_id,
      requested_opponent_wpi_team_id,
      requested_opponent_wpi_club_id,
      requested_team_logo_url,
      requested_opponent_logo_url
    );
    saved_game_id := (game_result->>'gameId')::uuid;
  end if;

  if saved_game_id is null then raise exception 'Game save did not return an ID'; end if;

  -- Assignment is part of the same RPC transaction. If assignment validation
  -- fails, a newly created game does not get left behind in a half-saved state.
  assignment_result := public.live_assign_game_scorer_v1(saved_game_id,target_scorer_user_id);

  select * into saved_row
  from public.live_games
  where id=saved_game_id and team_id=target_team_id;

  if saved_row.id is null then raise exception 'Saved game could not be verified'; end if;

  return game_result || jsonb_build_object(
    'gameId',saved_row.id,
    'persisted',true,
    'status',saved_row.status,
    'assignedScorerUserId',saved_row.assigned_scorer_user_id,
    'assignedScorerDisplayName',saved_row.assigned_scorer_display_name,
    'assignment',assignment_result
  );
end;
$$;

grant execute on function public.live_save_game_day_v1(
  uuid,uuid,text,text,text,timestamptz,text,text,integer,text,text,text,text,text,text,uuid
) to authenticated;

-- Small post-save verification endpoint used before the dialog closes or WPI
-- navigates into the scorer. This prevents a client-side navigation from making
-- a failed/incomplete save look successful.
create or replace function public.live_game_day_record_v1(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select g.* into game_row
  from public.live_games g
  where g.id=target_game_id
    and exists(
      select 1 from public.live_team_members m
      where m.team_id=g.team_id and m.user_id=caller
    );

  if game_row.id is null then raise exception 'Game not found in this team workspace'; end if;

  return jsonb_build_object(
    'gameId',game_row.id,
    'teamId',game_row.team_id,
    'status',game_row.status,
    'startedAt',game_row.started_at,
    'assignedScorerUserId',game_row.assigned_scorer_user_id,
    'assignedScorerDisplayName',game_row.assigned_scorer_display_name,
    'stateReady',game_row.state_snapshot is not null
  );
end;
$$;

grant execute on function public.live_game_day_record_v1(uuid) to authenticated;

create or replace function public.live_prepare_game_start_v3(target_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  game_row public.live_games%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into game_row from public.live_games where id=target_game_id;
  if game_row.id is null then raise exception 'Game not found'; end if;
  if game_row.state_snapshot is null then raise exception 'Game setup is incomplete; save the game again before starting'; end if;

  -- v2 remains the authority for role/assignment validation and delegates
  -- active scorer-session creation to the existing live_claim_game_scorer RPC.
  return public.live_prepare_game_start_v2(target_game_id);
end;
$$;

grant execute on function public.live_prepare_game_start_v3(uuid) to authenticated;

comment on function public.live_save_game_day_v1(uuid,uuid,text,text,text,timestamptz,text,text,integer,text,text,text,text,text,text,uuid)
is 'Atomically persists a planned Tournament/Friendly game and its optional pre-game scorer assignment.';
comment on function public.live_create_team_invite_v3(uuid,text)
is 'Creates Viewer-first team invitations. Elevated roles are granted only after the member accepts.';
