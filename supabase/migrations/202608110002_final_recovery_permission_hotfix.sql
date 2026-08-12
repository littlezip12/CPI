-- WPI 7.57.21 — Final Recovery Permission Hotfix
-- Makes final-game recovery permission-aware for the legitimate most-recent
-- scorer, including a Supporter who accepted a game-scoped scorer handoff.
-- Ordinary Supporters remain unable to reopen games.

create or replace function public.live_reopen_game_eligibility_v1(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  caller_role public.live_team_role;
  latest_session public.live_game_scorer_sessions%rowtype;
  allowed boolean := false;
  expires_at timestamptz;
  recent_scorer boolean := false;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into game_row
  from public.live_games
  where id=target_game_id;

  if game_row.id is null or not public.live_can_read_game(target_game_id) then
    raise exception 'Game is unavailable';
  end if;

  select role into caller_role
  from public.live_team_members
  where team_id=game_row.team_id and user_id=caller;

  select * into latest_session
  from public.live_game_scorer_sessions
  where game_id=target_game_id
  order by activated_at desc,created_at desc
  limit 1;

  if latest_session.id is not null and latest_session.ended_at is not null then
    expires_at := latest_session.ended_at + interval '30 minutes';
  end if;

  recent_scorer := coalesce(
    latest_session.user_id=caller
    and latest_session.ended_at is not null
    and latest_session.ended_at >= now()-interval '30 minutes'
    and (
      caller_role='scorer'
      or latest_session.session_kind='guest'
      or latest_session.source in ('member_handoff','guest_handoff','game_reopen')
    ),
    false
  );

  if game_row.status='final' and (caller_role in ('owner','admin') or recent_scorer) then
    allowed := true;
  end if;

  return jsonb_build_object(
    'gameId',game_row.id,
    'canReopen',allowed,
    'callerRole',caller_role,
    'isMostRecentScorer',coalesce(latest_session.user_id=caller,false),
    'recoveryWindowActive',recent_scorer,
    'expiresAt',case when recent_scorer then expires_at else null end,
    'status',game_row.status
  );
end;
$$;

grant execute on function public.live_reopen_game_eligibility_v1(uuid) to authenticated;

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
  latest_session public.live_game_scorer_sessions%rowtype;
  active_row public.live_game_scorer_sessions%rowtype;
  new_session public.live_game_scorer_sessions%rowtype;
  eligibility jsonb;
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

  eligibility := public.live_reopen_game_eligibility_v1(target_game_id);
  allowed := coalesce((eligibility->>'canReopen')::boolean,false);
  if not allowed then
    raise exception 'Only a Team Owner/Admin or the most recent scorer within 30 minutes can reopen this game';
  end if;

  select * into latest_session
  from public.live_game_scorer_sessions
  where game_id=target_game_id
  order by activated_at desc,created_at desc
  limit 1;

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
    jsonb_build_object('reason',clean_reason,'previousEndedAt',game_row.ended_at,'eligibility',eligibility)
  );

  return public.live_scorer_control_status(target_game_id)
    || jsonb_build_object('reopened',true,'reason',clean_reason);
end;
$$;

grant execute on function public.live_reopen_game_v1(uuid,text) to authenticated;
