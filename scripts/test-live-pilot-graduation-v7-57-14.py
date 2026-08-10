#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def check(name,cond):
    if not cond: errors.append(name)
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()

site=json.loads((ROOT/'config/site-release.json').read_text())
config=(ROOT/'config/live-sandbox.js').read_text()
login_html=(ROOT/'live-login.html').read_text()
dash_html=(ROOT/'live-dashboard.html').read_text()
game_html=(ROOT/'live-game.html').read_text()
legacy_html=(ROOT/'live-sandbox.html').read_text()
handoff_html=(ROOT/'live-scorer-handoff.html').read_text()
login_js=(ROOT/'js/live-login-v7-57-14.js').read_text()
dash_js=(ROOT/'js/live-dashboard-v7-57-14.js').read_text()
game_js=(ROOT/'js/live-game-v7-57-14.js').read_text()
handoff_js=(ROOT/'js/live-scorer-handoff-v7-57-14.js').read_text()

check('version',site.get('version')=='7.57.14')
check('name',site.get('name')=='WPI Live Pilot Graduation')
for key in ['liveScoringDashboardRelease','liveScoringAuthGatewayRelease','liveScoringMobileWorkflowRelease','liveScoringPilotGraduationRelease','liveScoringCanonicalGameRouteRelease','liveScoringLocalDemoRetirementRelease','liveScoringProductionSurfaceRelease']:
    check(key,site.get(key)=='7.57.14')

check('connected config', 'mode: "connected"' in config and 'environment: "pilot"' in config and 'allowLocalDemo: false' in config)
check('login graduated', 'Sandbox · test data only' not in login_html and 'Continue to local sandbox' not in login_html and 'Private team access' in login_html)
check('login connected only', 'enterDemo' not in login_js and 'continueDemoButton' not in login_js and 'Open the local sandbox' not in login_js)
check('dashboard demo removed', 'dashboardDemoPanel' not in dash_html and 'Open local scoring sandbox' not in dash_html and 'Local demo mode' not in dash_js)
check('dashboard canonical game routes', 'live-sandbox.html' not in dash_js and dash_js.count('live-game.html') >= 6)
check('canonical game page exists', 'js/live-game-v7-57-14.js?v=7.57.14' in game_html and '<h1 id="liveGameTitle">Live Scoring</h1>' in game_html)
check('visible sandbox copy retired', all(token not in game_html for token in ['Sandbox preview','Live sandbox','Sandbox analytics and recap','Reset test game','sandbox scrimmage']))
check('visible supporter copy', 'Short context for supporters' in game_html and 'Editable game recap' in game_html)
check('reset controls internal', game_html.count('hidden aria-hidden="true" tabindex="-1">Internal reset</button>') == 3)
check('game controller copy retired', all(token not in game_js for token in ['Sandbox preview','sandbox scrimmage','End this sandbox game','wpi-sandbox-']))
check('supporter role copy', 'workspace.role === "viewer" ? "Supporter"' in game_js and '"Supporter"} · read-only game view' in game_js)
check('reset controls never exposed', '["resetSandboxTopButton","resetSandboxGameButton","resetSandboxButton"].forEach' in game_js and 'control.hidden = true' in game_js)
check('local demo removed from active scorer auth', 'Local demo mode' not in game_js and 'Events remain on this browser' not in game_js)
check('handoff canonical route', 'live-game.html?game=' in handoff_js and 'live-sandbox.html?game=' not in handoff_js and 'js/live-scorer-handoff-v7-57-14.js?v=7.57.14' in handoff_html)
check('legacy redirect', 'live-game.html${window.location.search}${window.location.hash}' in legacy_html and 'js/live-sandbox-v7-56-15.js' not in legacy_html)

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
    print('WPI LIVE PILOT GRADUATION 7.57.14 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI LIVE PILOT GRADUATION 7.57.14 TEST PASSED')
print(' - live-game.html is the canonical connected WPI Live scoring route')
print(' - the legacy live-sandbox.html route safely redirects while preserving game/pass parameters')
print(' - local demo and visible test/reset controls are retired from the pilot product surface')
print(' - the validated 7.56.15 scoring/delivery engine and backend services remain protected')
