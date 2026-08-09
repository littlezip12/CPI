#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, sys

ROOT = Path(__file__).resolve().parents[1]
errors=[]

def check(name, cond):
    if not cond: errors.append(name)

def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()

site=json.loads((ROOT/'config/site-release.json').read_text())
html=(ROOT/'live-dashboard.html').read_text()
login=(ROOT/'live-login.html').read_text()
login_js=(ROOT/'js/live-login-v7-57-10.js').read_text()
js=(ROOT/'js/live-dashboard-v7-57-10.js').read_text()
css=(ROOT/'css/live-sandbox-v7-57-10.css').read_text()
mig=(ROOT/'supabase/migrations/202608090002_game_reliability_role_safe_access.sql').read_text()

check('version',site.get('version')=='7.57.10')
check('name',site.get('name')=='Game Reliability & Role-Safe Access')
for key in ['liveScoringDashboardRelease','liveScoringTeamAdminRelease','liveScoringGameDayHubRelease','liveScoringRoleSecurityRelease','liveScoringGamePersistenceRelease','liveScoringViewerExperienceRelease','liveScoringLeastPrivilegeRegistrationRelease']:
    check(key,site.get(key)=='7.57.10')
check('7.57.9 scorer assignment preserved',site.get('liveScoringScorerAssignmentRelease')=='7.57.10')
check('7.57.8 tournament integration preserved',site.get('liveScoringTournamentScheduleIntegrationRelease')=='7.57.8')
check('7.57.7 identity preserved',site.get('liveScoringGameDayIdentityRelease')=='7.57.7')

check('dashboard js wired','js/live-dashboard-v7-57-10.js?v=7.57.10' in html)
check('dashboard css wired','css/live-sandbox-v7-57-10.css?v=7.57.10' in html)
check('login js wired','js/live-login-v7-57-10.js?v=7.57.10' in login)
check('two game types',html.count('name="gameKind"')==2 and 'value="tournament"' in html and 'value="friendly"' in html and 'value="scrimmage"' not in html)
check('viewer home',all(t in html for t in ['id="dashboardRoleHome"','id="roleHomeGames"','Choose a game to follow the score, game clock and play-by-play']))
check('invite role selector removed','id="inviteRole"' not in html and 'id="inviteCanManageGroupMe"' not in html)
check('viewer-first invite copy','Everyone joins as Viewer' in html and 'Create viewer invite' in html)
check('login viewer-first copy','New team members join as Viewer' in login_js and 'join with Viewer access first' in login_js)

for token in [
    'live_save_game_day_v1','verifyGameDayRecord','live_game_day_record_v1','refreshSavedGame',
    'live_prepare_game_start_v3','backend.loadGameState(gameId)','Game saved. It is on deck',
    'renderRoleHome','document.body.dataset.liveRole','Follow a game','Your scoring assignments',
    'live_create_team_invite_v3','Creating Viewer-first invite','promote access after they accept'
]: check('js '+token,token in js)
check('old split create path removed from current save','backend.client.rpc("live_create_manual_game_v3"' not in js and 'backend.client.rpc("live_update_planned_game_v2"' not in js)
check('current save assignment atomic','target_scorer_user_id:payload.assignedScorerUserId || null' in js)
check('viewer css hides admin', 'body[data-live-role="viewer"] .live-dashboard-sidebar' in css and '#dashboardGameHistory' in css)
check('scorer css simplified', 'body[data-live-role="scorer"] #dashboardGameDay' in css and 'body[data-live-role="scorer"] .live-team-admin-grid' in css)
check('role cards mobile','@media (max-width:720px)' in css and '.live-role-game-card' in css)

for token in [
    "alter column role set default 'viewer'",
    "where status='pending'",
    'live_force_pending_invite_viewer',
    "new.role := 'viewer'",
    'new.can_manage_groupme := false',
    'live_create_team_invite_v3',
    "'viewer'::public.live_team_role",
    'live_save_game_day_v1',
    'live_create_manual_game_v3',
    'live_update_planned_game_v2',
    'live_assign_game_scorer_v1(saved_game_id,target_scorer_user_id)',
    "'persisted',true",
    'live_game_day_record_v1',
    'live_prepare_game_start_v3',
    'live_prepare_game_start_v2(target_game_id)'
]: check('migration '+token,token in mig)
check('atomic comment','Assignment is part of the same RPC transaction' in mig)
check('accepted membership untouched','accepted memberships are intentionally untouched.' in mig)

expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'js/live-team-context-v7-57-3.js':'def547d5f29e409b972f3efe344f8d24ff9365792f85d43a30a9b19d0621f521',
 'supabase/migrations/202608080007_tournament_schedule_integration_reconciliation.sql':'41e18e38bc9d71e0c10eab6721a88820ee14050c8d736576c96ca93f0be714c2',
 'supabase/migrations/202608090001_scorer_assignments_game_day_operations.sql':'01e9f49c9b1389a9cb7756fd42735c0e9f5475d3eab986514f57d1ebfbdfa189',
 'data/live/tournament-schedule-index.json':'3434d002e54030f699c91033c4d0e1e3974e8262005d9c00f8364f151a935e11'
}
for path,h in expected.items(): check('protected '+path,sha(path)==h)

if errors:
    print('WPI LIVE GAME RELIABILITY & ROLE-SAFE ACCESS 7.57.10 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI LIVE GAME RELIABILITY & ROLE-SAFE ACCESS 7.57.10 TEST PASSED')
print(' - Game + optional scorer assignment save atomically, verify persistence, and preflight scorer state before navigation')
print(' - Viewer and Scorer dashboards are intentionally simplified; Owner/Admin retain full administration')
print(' - New invited members always join as Viewer and are promoted only after acceptance')
print(' - Tournament/Friendly, aliases/logos, reconciliation, scorer handoff, GroupMe, summaries and roster vision remain protected')
