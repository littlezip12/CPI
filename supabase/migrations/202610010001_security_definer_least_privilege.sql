-- WPHQ 7.64.41 — Supabase SECURITY DEFINER Least-Privilege Hardening
-- Production baseline audited in 7.64.40: 77 public-schema SECURITY DEFINER
-- functions were executable by the signed-out Postgres anon role.
--
-- Runtime boundary:
--   13 public RPCs       -> anon, authenticated, service_role
--   54 application RPCs  -> authenticated, service_role
--   10 trigger helpers   -> service_role only
--
-- Supabase anonymous Auth users intentionally use the authenticated Postgres
-- role, so guest scorer flows remain available without leaving protected RPCs
-- callable by a fully signed-out public client.

do $$
declare
  expected_names text[] := array[
      'live_accept_team_invite',
      'live_ad_select_v1',
      'live_ad_select_v2',
      'live_add_owner_membership',
      'live_can_manage_groupme',
      'live_can_view_game',
      'live_cancel_planned_game_v1',
      'live_capture_account_registry',
      'live_clear_invalid_game_assignments',
      'live_club_pilot_validation_v1',
      'live_club_workspace_v1',
      'live_confirm_tournament_reconciliation_v1',
      'live_dismiss_tournament_reconciliation_v1',
      'live_end_scorer_session_with_game',
      'live_game_day_queue',
      'live_game_day_queue_v2',
      'live_game_day_queue_v3',
      'live_game_day_queue_v4',
      'live_game_day_record_v1',
      'live_game_series_archive_v1',
      'live_game_series_archive_v2',
      'live_game_series_archive_v3',
      'live_game_series_archive_v4',
      'live_groupme_delivery_summary',
      'live_guard_game_configuration',
      'live_guard_scorer_control_columns',
      'live_guard_team_owner_change',
      'live_handle_new_user',
      'live_has_club_role',
      'live_has_team_role',
      'live_is_club_member',
      'live_is_team_member',
      'live_link_manual_tournament_game_v1',
      'live_list_team_access',
      'live_list_team_followers_v1',
      'live_list_team_roster_versions_v1',
      'live_list_user_clubs_v1',
      'live_list_user_teams',
      'live_list_user_teams_v2',
      'live_merge_game_series_v1',
      'live_prepare_game_start_v1',
      'live_prepare_game_start_v2',
      'live_prepare_game_start_v3',
      'live_preserve_created_by',
      'live_promote_supporter_to_scorer_v1',
      'live_public_game_score_v1',
      'live_public_game_score_v2',
      'live_public_organization_overview_v1',
      'live_public_scoreboard_v1',
      'live_public_scoreboard_v2',
      'live_public_scoreboard_v3',
      'live_public_tournament_catalog_v1',
      'live_public_tournament_v1',
      'live_public_tournament_v2',
      'live_record_ad_delivery_v1',
      'live_registration_status',
      'live_reissue_team_invite',
      'live_remove_team_member',
      'live_reopen_game_eligibility_v1',
      'live_reopen_game_v1',
      'live_revoke_team_invite',
      'live_save_game_day_v1',
      'live_save_game_day_v2',
      'live_save_roster_version_v1',
      'live_set_default_lineup_v1',
      'live_set_team_follow_v1',
      'live_sync_account_registry_from_profile',
      'live_sync_official_tournament_game_v1',
      'live_team_workspace',
      'live_team_workspace_v2',
      'live_team_workspace_v3',
      'live_team_workspace_v4',
      'live_transfer_team_ownership',
      'live_update_planned_game_v1',
      'live_update_planned_game_v2',
      'live_update_team_member_access',
      'live_update_team_profile_v1'
  ];
  public_names text[] := array[
      'live_ad_select_v1',
      'live_ad_select_v2',
      'live_public_game_score_v1',
      'live_public_game_score_v2',
      'live_public_organization_overview_v1',
      'live_public_scoreboard_v1',
      'live_public_scoreboard_v2',
      'live_public_scoreboard_v3',
      'live_public_tournament_catalog_v1',
      'live_public_tournament_v1',
      'live_public_tournament_v2',
      'live_record_ad_delivery_v1',
      'live_registration_status'
  ];
  trigger_names text[] := array[
      'live_add_owner_membership',
      'live_capture_account_registry',
      'live_clear_invalid_game_assignments',
      'live_end_scorer_session_with_game',
      'live_guard_game_configuration',
      'live_guard_scorer_control_columns',
      'live_guard_team_owner_change',
      'live_handle_new_user',
      'live_preserve_created_by',
      'live_sync_account_registry_from_profile'
  ];
  fn record;
  missing_names text[];
  unexpected_names text[];
  duplicate_names text[];
  classified_count integer;
begin
  select array_agg(x order by x) into missing_names
  from unnest(expected_names) x
  where not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=x and p.prosecdef
  );

  if coalesce(array_length(missing_names,1),0) > 0 then
    raise exception '7.64.41 expected SECURITY DEFINER functions are missing: %', missing_names;
  end if;

  select array_agg(proname order by proname) into duplicate_names
  from (
    select p.proname
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.proname=any(expected_names)
    group by p.proname
    having count(*) <> 1
  ) d;

  if coalesce(array_length(duplicate_names,1),0) > 0 then
    raise exception '7.64.41 expected exactly one SECURITY DEFINER overload per classified name; review: %', duplicate_names;
  end if;

  select count(*) into classified_count
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef and p.proname=any(expected_names);

  if classified_count <> 77 then
    raise exception '7.64.41 expected 77 classified SECURITY DEFINER functions, found %', classified_count;
  end if;

  select array_agg(p.proname order by p.proname) into unexpected_names
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and has_function_privilege('anon',p.oid,'EXECUTE')
    and not (p.proname = any(expected_names));

  if coalesce(array_length(unexpected_names,1),0) > 0 then
    raise exception '7.64.41 found unexpected anon-executable SECURITY DEFINER functions; classify before proceeding: %', unexpected_names;
  end if;

  for fn in
    select p.oid,p.proname,pg_get_function_result(p.oid) result_type
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.proname=any(expected_names)
    order by p.proname
  loop
    -- Remove implicit/inherited client execution first, then grant only the
    -- runtime roles approved for the function category.
    execute format('revoke execute on function %s from public, anon, authenticated', fn.oid::regprocedure);

    if fn.proname = any(public_names) then
      execute format('grant execute on function %s to anon, authenticated, service_role', fn.oid::regprocedure);
    elsif fn.proname = any(trigger_names) then
      execute format('grant execute on function %s to service_role', fn.oid::regprocedure);
    else
      execute format('grant execute on function %s to authenticated, service_role', fn.oid::regprocedure);
    end if;
  end loop;

  -- Auth-owned triggers are invoked by the auth service. Trigger execution does
  -- not require general client RPC exposure, but retaining this explicit role is
  -- a compatibility guard for auth lifecycle behavior.
  grant execute on function public.live_capture_account_registry() to supabase_auth_admin;
  grant execute on function public.live_handle_new_user() to supabase_auth_admin;
end
$$;

-- Make future public-schema RPC exposure opt-in for client roles. Existing
-- functions above are explicitly re-granted by category. service_role is left
-- unchanged so server-side operational code keeps its existing default posture.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

comment on function public.live_public_scoreboard_v3(text,text,text,text,integer,integer) is
  '7.64.41 public allowlist: signed-out public scoreboard RPC; SECURITY DEFINER EXECUTE intentionally granted to anon/authenticated/service_role.';
comment on function public.live_has_team_role(uuid,public.live_team_role[]) is
  '7.64.41 authenticated boundary: RLS/helper RPC available to authenticated sessions (including anonymous Auth guest scorers), not signed-out anon.';
comment on function public.live_handle_new_user() is
  '7.64.41 internal auth trigger helper: no direct client EXECUTE; service_role and supabase_auth_admin only.';
