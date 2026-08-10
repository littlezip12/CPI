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
js=(ROOT/'js/live-dashboard-v7-57-13.js').read_text()
css=(ROOT/'css/live-dashboard-v7-57-13.css').read_text()
login=(ROOT/'js/live-login-v7-57-12.js').read_text()

check('version',site.get('version')=='7.57.13')
check('name',site.get('name')=='Mobile Game-Day Polish & Pilot Hardening')
for key in ['liveScoringDashboardRelease','liveScoringTeamAdminRelease','liveScoringViewerExperienceRelease','liveScoringSupporterExperienceRelease','liveScoringScorerExperienceRelease','liveScoringMobilePilotRelease']:
    check(key,site.get(key)=='7.57.13')
check('dashboard js wired','js/live-dashboard-v7-57-13.js?v=7.57.13' in html)
check('dashboard css wired','css/live-dashboard-v7-57-13.css?v=7.57.13' in html)
check('mobile admin jump html','id="mobileAdminJump"' in html and 'id="mobileAdminJumpSelect"' in html and '>Game Day<' in html)
check('mobile admin jump behavior','mobileAdminJumpSelect' in js and 'focusSetupStep(targetId' in js)
check('ready dashboard compaction state','overview.dataset.readinessState = allReady ? "ready" : "setup"' in js)
check('ready dashboard compaction css','#dashboardOverview[data-readiness-state="ready"] .live-readiness-grid' in css and '#readinessLaunchSummary' in css)
check('game day path progressive disclosure','hub.dataset.hasGames = deck.length ? "true" : "false"' in js and '#dashboardGameDay[data-has-games="true"] .live-game-day-paths' in css)
check('supporter grouping','title:"Live now"' in js and 'title:"Upcoming"' in js and 'title:"Recent finals"' in js)
check('scorer grouping','title:"Assigned to you"' in js and 'title:"Available to claim"' in js)
check('role section markup','live-role-game-section' in js and 'live-role-game-section-heading' in css)
check('supporter language preserved','viewer:"Supporter"' in js and 'Supporter access first' in html and 'join as Supporter' in login)
check('game day still single creation','id="addGameDayButton"' in html and 'Save &amp; start' not in html and 'Add first game' not in js)
check('no backend migration for release',not (ROOT/'supabase/migrations/202608090004_mobile_game_day_polish.sql').exists())

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
    print('WPI LIVE MOBILE GAME-DAY POLISH 7.57.13 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI LIVE MOBILE GAME-DAY POLISH 7.57.13 TEST PASSED')
print(' - Supporter and Scorer game lists are grouped by the next useful action')
print(' - Ready Owner/Admin workspaces collapse onboarding chrome and keep Game Day primary')
print(' - Mobile Owner/Admin navigation uses a compact jump control instead of a long horizontal strip')
print(' - Scoring, handoff, GroupMe, roster vision, reconciliation and database contracts remain protected')
