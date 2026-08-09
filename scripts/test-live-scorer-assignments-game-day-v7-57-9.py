#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def check(name,cond):
    if not cond: errors.append(name)
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
site=json.loads((ROOT/'config/site-release.json').read_text())
html=(ROOT/'live-dashboard.html').read_text()
js=(ROOT/'js/live-dashboard-v7-57-9.js').read_text()
css=(ROOT/'css/live-sandbox-v7-57-9.css').read_text()
mig=(ROOT/'supabase/migrations/202608090001_scorer_assignments_game_day_operations.sql').read_text()

check('version',site.get('version')=='7.57.9')
check('name',site.get('name')=='Scorer Assignments & Game-Day Operations')
for key in ['liveScoringDashboardRelease','liveScoringTeamAdminRelease','liveScoringGameDayHubRelease','liveScoringScorerAssignmentRelease','liveScoringGameDayOperationsRelease']:
    check(key,site.get(key)=='7.57.9')
check('tournament integration preserved',site.get('liveScoringTournamentScheduleIntegrationRelease')=='7.57.8' and site.get('liveScoringTournamentReconciliationRelease')=='7.57.8')
check('dashboard js wired','js/live-dashboard-v7-57-9.js?v=7.57.9' in html)
check('dashboard css wired','css/live-sandbox-v7-57-9.css?v=7.57.9' in html)
check('coverage UI',all(token in html for token in ['id="gameDayCoverage"','Scoring coverage','id="gameAssignedScorer"','Scorer (optional)']))
check('two game types remain',html.count('name="gameKind"')==2 and 'value="tournament"' in html and 'value="friendly"' in html and 'value="scrimmage"' not in html)

for token in [
    'assignableGameScorers','scorerAssignmentOptions','populateGameScorerSelect','assignGameScorer',
    'live_assign_game_scorer_v1','live_game_day_queue_v4','live_prepare_game_start_v2',
    'assignedScorerUserId','assignedScorerDisplayName','isAssignedToMe','gameDayCoverage',
    'Assigned to ${escapeHtml(assignmentName)}','live-game-day-assignment-controls',
    '["owner","admin","scorer"].includes(member.role)',
    'game.canStart !== false'
]: check('js '+token,token in js)
check('start path v2 only','live_prepare_game_start_v1' not in js)
check('queue v4 only','live_game_day_queue_v3' not in js)
check('assignment css','live-game-day-assignment' in css and 'live-game-day-coverage' in css and '@media (max-width:720px)' in css)

for token in [
    'assigned_scorer_user_id uuid','assigned_scorer_display_name text','assigned_at timestamptz','assigned_by uuid',
    'live_game_assignment_audit','live_assign_game_scorer_v1','live_game_day_queue_v4','live_prepare_game_start_v2',
    "target_role not in ('owner','admin','scorer')", "game_row.status not in ('setup','scheduled')",
    "caller_role='scorer'", 'assigned_scorer_user_id<>caller',
    'live_claim_game_scorer(target_game_id,display_name)',
    'live_clear_invalid_game_assignments','after delete or update of role on public.live_team_members',
    'Active scoring control remains authoritative in live_game_scorer_sessions.'
]: check('migration '+token,token in mig)
check('assignment cannot change after start',"if game_row.started_at is not null or game_row.status not in ('setup','scheduled')" in mig)
check('viewer cannot be assigned',"target_role not in ('owner','admin','scorer')" in mig)
check('scorer auto claims unassigned',"caller_role='scorer' and game_row.assigned_scorer_user_id is null" in mig)
check('manager emergency start preserved',"when member_role in ('owner','admin') then true" in mig)

expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/migrations/202608080007_tournament_schedule_integration_reconciliation.sql':'41e18e38bc9d71e0c10eab6721a88820ee14050c8d736576c96ca93f0be714c2',
 'js/live-team-context-v7-57-3.js':'def547d5f29e409b972f3efe344f8d24ff9365792f85d43a30a9b19d0621f521',
 'js/live-dashboard-v7-57-8.js':'b5f43f54c99aef4eae37c8d8de0f7a2f74f3948ff6bed0bfc11d5d3908012b02',
 'data/live/tournament-schedule-index.json':'3434d002e54030f699c91033c4d0e1e3974e8262005d9c00f8364f151a935e11'
}
for path,h in expected.items(): check('protected '+path,sha(path)==h)

if errors:
    print('WPI LIVE SCORER ASSIGNMENTS & GAME-DAY OPERATIONS 7.57.9 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI LIVE SCORER ASSIGNMENTS & GAME-DAY OPERATIONS 7.57.9 TEST PASSED')
print(' - Owners/Admins can assign permanent scoring-capable team members before a game starts')
print(' - Permanent Scorers can launch their assigned games or claim an unassigned game')
print(' - Assignment is operational metadata; existing active-scorer sessions and handoff remain authoritative')
print(' - Assignment changes are audited and stale assignments clear if a member becomes Viewer or is removed')
print(' - Tournament/Friendly, identity, schedule reconciliation, scoring, GroupMe, and roster vision remain protected')
