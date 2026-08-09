#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def check(name,cond):
    if not cond: errors.append(name)
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()

site=json.loads((ROOT/'config/site-release.json').read_text())
html=(ROOT/'live-dashboard.html').read_text()
js=(ROOT/'js/live-dashboard-v7-57-12.js').read_text()
login=(ROOT/'js/live-login-v7-57-12.js').read_text()
css=(ROOT/'css/live-dashboard-v7-57-12.css').read_text()

check('version',site.get('version')=='7.57.12')
check('name',site.get('name')=='Supporter & Scorer Experience')
for key in ['liveScoringDashboardRelease','liveScoringTeamAdminRelease','liveScoringViewerExperienceRelease','liveScoringLeastPrivilegeRegistrationRelease','liveScoringSupporterExperienceRelease','liveScoringScorerExperienceRelease']:
    check(key,site.get(key)=='7.57.12')
check('dashboard js wired','js/live-dashboard-v7-57-12.js?v=7.57.12' in html)
check('dashboard css wired','css/live-dashboard-v7-57-12.css?v=7.57.12' in html)
check('login copy wired','js/live-login-v7-57-12.js?v=7.57.12' in (ROOT/'live-login.html').read_text())
check('supporter label maps database viewer','viewer:"Supporter"' in js)
check('supporter follow surface','Follow a game' in js and 'Follow live' in js and 'View final' in js)
check('scorer focused surface','Your games' in js and 'Assigned to you' in js and 'Available to claim' in js)
check('viewer remains internal database role','workspace.role === "viewer"' in js and 'data-live-role="viewer"' in css)
check('supporter first access copy','Supporter access first' in html and 'Invite supporter' in html and 'join as Supporter' in login)
check('no visible Viewer copy dashboard','Viewer' not in html)
check('no visible Viewer copy login','Viewer' not in login)
check('compact roles hide admin','body[data-live-role="viewer"] .live-dashboard-sidebar' in (ROOT/'css/live-sandbox-v7-57-10.css').read_text() and 'body[data-live-role="scorer"] .live-dashboard-sidebar' in (ROOT/'css/live-sandbox-v7-57-10.css').read_text())
check('technical strip hidden compact','body[data-live-role="viewer"] .live-status-strip' in css and 'body[data-live-role="scorer"] .live-status-strip' in css)
check('game day remains single create','id="addGameDayButton"' in html and 'Add first game' not in js and 'Save &amp; start' not in html)

# No backend/service/migration changes in this UX-only release.
expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'js/live-team-context-v7-57-3.js':'def547d5f29e409b972f3efe344f8d24ff9365792f85d43a30a9b19d0621f521',
 'supabase/migrations/202608080007_tournament_schedule_integration_reconciliation.sql':'41e18e38bc9d71e0c10eab6721a88820ee14050c8d736576c96ca93f0be714c2',
 'supabase/migrations/202608090001_scorer_assignments_game_day_operations.sql':'01e9f49c9b1389a9cb7756fd42735c0e9f5475d3eab986514f57d1ebfbdfa189',
 'supabase/migrations/202608090002_game_reliability_role_safe_access.sql':'2277348bafb2b78bf37335c19f39db149f7cd10f3d7e4e19ec715b14ed64fae0',
 'supabase/migrations/202608090003_game_day_queue_hotfix_dashboard_simplification.sql':'12e9844f14d6fccf7a31dc96c8dd2acf9e3671c7a9bfff90fc9ab56563ff36d8'
}
for path,h in expected.items():
    check('protected '+path,sha(path)==h)

if errors:
    print('WPI LIVE SUPPORTER & SCORER EXPERIENCE 7.57.12 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI LIVE SUPPORTER & SCORER EXPERIENCE 7.57.12 TEST PASSED')
print(' - Viewer remains the internal database role; Supporter is the user-facing name')
print(' - Supporters get a simple Follow a game surface; Scorers get a focused Your games surface')
print(' - Owner/Admin administration remains isolated from compact role experiences')
print(' - Scoring, handoff, GroupMe, roster vision, Game-Day and reconciliation services remain protected')
