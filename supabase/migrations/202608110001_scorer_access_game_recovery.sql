-- WPI 7.57.18 — Scorer Access & Game Recovery.
-- 1) Adds a dedicated, idempotent Supporter -> Scorer promotion RPC for Team Access.
-- 2) Adds a guarded Reopen Game action for accidental Final Whistle / end-game taps.
-- 3) Preserves all scoring events and delivery audit; reopening creates a new scorer session.
-- No secrets belong in this migration.

create or replace function public.live_promote_supporter_to_scorer_v1(
  target_team_id uuid,
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  target_role public.live_team_role;
  target_name text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if caller=target_user_id then raise exception 'You cannot change your own team role here'; end if;

  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Owner or Admin role required';
  end if;

  select role into target_role
  from public.live_team_members
  where team_id=target_team_id and user_id=target_user_id
  for update;

  if target_role is null then raise exception 'Team member not found'; end if;
  if target_role='scorer' then
    return jsonb_build_object(
      'userId',target_user_id,
      'role','scorer',
      'changed',false,
      'message','This member already has Scorer access.'
    );
  end if;
  if target_role<>'viewer' then
    raise exception 'Only a Supporter can be promoted to Scorer with this action';
  end if;

  update public.live_team_members
  set role='scorer',
      can_manage_groupme=false,
      updated_at=now(),
      updated_by=caller
  where team_id=target_team_id and user_id=target_user_id;

  select coalesce(nullif(trim(p.display_name),''),split_part(coalesce(u.email,''),'@',1),'Team member')
    into target_name
  from auth.users u
  left join public.live_profiles p on p.user_id=u.id
  where u.id=target_user_id;

  return jsonb_build_object(
    'userId',target_user_id,
    'displayName',target_name,
    'role','scorer',
    'changed',true,
    'message','Scorer access granted.'
  );
end;
$$;

grant execute on function public.live_promote_supporter_to_scorer_v1(uuid,uuid) to authenticated;

-- Extend the existing scorer-session audit vocabulary for an explicit game reopen.
alter table public.live_game_scorer_sessions
  drop constraint if exists live_game_scorer_sessions_source_check;
alter table public.live_game_scorer_sessions
  add constraint live_game_scorer_sessions_source_check check (source in (
    'initial_claim','member_assignment','member_handoff','guest_handoff','admin_takeover','migration_backfill','game_reopen'
  ));

alter table public.live_game_scorer_audit
  drop constraint if exists live_game_scorer_audit_action_check;
alter table public.live_game_scorer_audit
  add constraint live_game_scorer_audit_action_check check (action in (
    'initial_claim','handoff_created','handoff_accepted','handoff_revoked','admin_takeover','session_ended','game_reopened'
  ));

create or replace function public.live_reopen_game_v1(
  target_game_id uuid,
  reopen_reason text default 'Game ended prematurely'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  caller_role public.live_team_role;
  latest_session public.live_game_scorer_sessions%rowtype;
  active_row public.live_game_scorer_sessions%rowtype;
  new_session public.live_game_scorer_sessions%rowtype;
  allowed boolean := false;
  session_kind text := 'member';
  display_name text;
  clean_reason text := left(coalesce(nullif(trim(reopen_reason),''),'Game ended prematurely'),140);
begin
  if caller is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_game_id::text || ':reopen-game',0));

  select * into game_row
  from public.live_games
  where id=target_game_id
  for update;

  if game_row.id is null then raise exception 'Game not found'; end if;
  if game_row.status<>'final' then raise exception 'Only a final game can be reopened'; end if;

  select role into caller_role
  from public.live_team_members
  where team_id=game_row.team_id and user_id=caller;

  select * into latest_session
  from public.live_game_scorer_sessions
  where game_id=target_game_id
  order by activated_at desc,created_at desc
  limit 1;

  if caller_role in ('owner','admin') then
    allowed := true;
  elsif latest_session.user_id=caller
    and latest_session.ended_at is not null
    and latest_session.ended_at >= now()-interval '30 minutes'
    and (caller_role='scorer' or latest_session.session_kind='guest') then
    allowed := true;
  end if;

  if not allowed then
    raise exception 'Only a Team Owner/Admin or the most recent scorer within 30 minutes can reopen this game';
  end if;

  select * into active_row
  from public.live_game_scorer_sessions
  where game_id=target_game_id and status='active'
  for update;
  if active_row.id is not null then raise exception 'This game already has an active scorer'; end if;

  if latest_session.user_id=caller and latest_session.session_kind='guest' then
    session_kind := 'guest';
    display_name := latest_session.display_name;
  elsif latest_session.user_id=caller and latest_session.display_name is not null then
    session_kind := 'member';
    display_name := latest_session.display_name;
  else
    session_kind := 'member';
    display_name := coalesce(public.live_user_display_name(caller),'WPI scorer');
  end if;

  update public.live_games
  set status='live',
      ended_at=null,
      updated_by=caller,
      updated_at=now(),
      last_synced_at=now(),
      state_snapshot=jsonb_set(
        jsonb_set(
          jsonb_set(coalesce(state_snapshot,'{}'::jsonb),'{game,status}',to_jsonb('live'::text),true),
          '{game,endedAt}','null'::jsonb,true
        ),
        '{game,endedByUserId}','null'::jsonb,true
      )
  where id=target_game_id;

  insert into public.live_game_scorer_sessions(
    game_id,user_id,display_name,session_kind,status,source,created_by
  ) values (
    target_game_id,caller,display_name,session_kind,'active','game_reopen',caller
  ) returning * into new_session;

  perform set_config('wpi.scorer_control_mutation','allowed',true);
  update public.live_games
  set active_scorer_session_id=new_session.id,
      active_scorer_user_id=caller,
      active_scorer_display_name=display_name,
      active_scorer_kind=session_kind,
      scorer_control_version=scorer_control_version+1,
      scorer_control_updated_at=now(),
      updated_at=now()
  where id=target_game_id;

  insert into public.live_game_scorer_audit(
    game_id,action,actor_user_id,actor_display_name,from_session_id,to_session_id,details
  ) values (
    target_game_id,'game_reopened',caller,display_name,latest_session.id,new_session.id,
    jsonb_build_object('reason',clean_reason,'previousEndedAt',game_row.ended_at)
  );

  return public.live_scorer_control_status(target_game_id)
    || jsonb_build_object('reopened',true,'reason',clean_reason);
end;
$$;

grant execute on function public.live_reopen_game_v1(uuid,text) to authenticated;
