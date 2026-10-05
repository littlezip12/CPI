-- WPHQ 7.64.41 post-migration validation (read-only)
-- Run after 202610010001_security_definer_least_privilege.sql.

with classified as (
  select p.oid,p.proname,pg_get_function_result(p.oid) result_type,
    case
      when p.proname = any(array['live_ad_select_v1','live_ad_select_v2','live_public_game_score_v1','live_public_game_score_v2','live_public_organization_overview_v1','live_public_scoreboard_v1','live_public_scoreboard_v2','live_public_scoreboard_v3','live_public_tournament_catalog_v1','live_public_tournament_v1','live_public_tournament_v2','live_record_ad_delivery_v1','live_registration_status']) then 'public_anon'
      when p.proname = any(array['live_add_owner_membership','live_capture_account_registry','live_clear_invalid_game_assignments','live_end_scorer_session_with_game','live_guard_game_configuration','live_guard_scorer_control_columns','live_guard_team_owner_change','live_handle_new_user','live_preserve_created_by','live_sync_account_registry_from_profile']) then 'internal_trigger'
      else 'authenticated'
    end category,
    has_function_privilege('anon',p.oid,'EXECUTE') anon_exec,
    has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_exec,
    has_function_privilege('service_role',p.oid,'EXECUTE') service_exec,
    exists (select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') public_exec
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef and p.proname=any(array['live_accept_team_invite','live_ad_select_v1','live_ad_select_v2','live_add_owner_membership','live_can_manage_groupme','live_can_view_game','live_cancel_planned_game_v1','live_capture_account_registry','live_clear_invalid_game_assignments','live_club_pilot_validation_v1','live_club_workspace_v1','live_confirm_tournament_reconciliation_v1','live_dismiss_tournament_reconciliation_v1','live_end_scorer_session_with_game','live_game_day_queue','live_game_day_queue_v2','live_game_day_queue_v3','live_game_day_queue_v4','live_game_day_record_v1','live_game_series_archive_v1','live_game_series_archive_v2','live_game_series_archive_v3','live_game_series_archive_v4','live_groupme_delivery_summary','live_guard_game_configuration','live_guard_scorer_control_columns','live_guard_team_owner_change','live_handle_new_user','live_has_club_role','live_has_team_role','live_is_club_member','live_is_team_member','live_link_manual_tournament_game_v1','live_list_team_access','live_list_team_followers_v1','live_list_team_roster_versions_v1','live_list_user_clubs_v1','live_list_user_teams','live_list_user_teams_v2','live_merge_game_series_v1','live_prepare_game_start_v1','live_prepare_game_start_v2','live_prepare_game_start_v3','live_preserve_created_by','live_promote_supporter_to_scorer_v1','live_public_game_score_v1','live_public_game_score_v2','live_public_organization_overview_v1','live_public_scoreboard_v1','live_public_scoreboard_v2','live_public_scoreboard_v3','live_public_tournament_catalog_v1','live_public_tournament_v1','live_public_tournament_v2','live_record_ad_delivery_v1','live_registration_status','live_reissue_team_invite','live_remove_team_member','live_reopen_game_eligibility_v1','live_reopen_game_v1','live_revoke_team_invite','live_save_game_day_v1','live_save_game_day_v2','live_save_roster_version_v1','live_set_default_lineup_v1','live_set_team_follow_v1','live_sync_account_registry_from_profile','live_sync_official_tournament_game_v1','live_team_workspace','live_team_workspace_v2','live_team_workspace_v3','live_team_workspace_v4','live_transfer_team_ownership','live_update_planned_game_v1','live_update_planned_game_v2','live_update_team_member_access','live_update_team_profile_v1'])
)
select category,count(*) function_count,
       count(*) filter(where anon_exec) anon_exec_count,
       count(*) filter(where authenticated_exec) authenticated_exec_count,
       count(*) filter(where service_exec) service_exec_count,
       count(*) filter(where public_exec) public_exec_count
from classified group by category order by category;

-- Expected: public_anon 13/13 anon + auth + service; authenticated 54/0 anon + 54 auth/service;
-- internal_trigger 10/0 anon + 0 authenticated + 10 service; PUBLIC execution 0 for all categories.

select p.proname,pg_get_function_identity_arguments(p.oid) args
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'EXECUTE')
  and not (p.proname=any(array['live_ad_select_v1','live_ad_select_v2','live_public_game_score_v1','live_public_game_score_v2','live_public_organization_overview_v1','live_public_scoreboard_v1','live_public_scoreboard_v2','live_public_scoreboard_v3','live_public_tournament_catalog_v1','live_public_tournament_v1','live_public_tournament_v2','live_record_ad_delivery_v1','live_registration_status']))
order by p.proname;
-- Expected: zero rows.
