-- WPHQ 7.64.41 — emergency rollback for SECURITY DEFINER EXECUTE hardening
-- Restores the exact pre-7.64.41 client-role ACL pattern observed in production
-- during the 7.64.40 audit. Use only if the privilege migration causes a
-- regression that cannot be corrected immediately.

do $$
declare
  all_names text[] := array[
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
  public_direct_names text[] := array[
      'live_accept_team_invite',
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
  fn record;
begin
  for fn in
    select p.oid,p.proname
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.proname=any(all_names)
    order by p.proname
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, service_role, supabase_auth_admin', fn.oid::regprocedure);
    execute format('grant execute on function %s to anon, authenticated, service_role', fn.oid::regprocedure);
    if fn.proname=any(public_direct_names) then
      execute format('grant execute on function %s to public', fn.oid::regprocedure);
    end if;
  end loop;
end
$$;

-- Restore the pre-7.64.41 postgres/public function default ACL: explicit
-- anon/authenticated/service_role EXECUTE, with no PUBLIC default grant.
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;

comment on function public.live_public_scoreboard_v3(text,text,text,text,integer,integer) is
  'Bounded public-team scoreboard page with server-side search/type/gender/status filtering. Max page size 100; no roster/player/scorer/private data.';
comment on function public.live_has_team_role(uuid,public.live_team_role[]) is null;
comment on function public.live_handle_new_user() is null;
