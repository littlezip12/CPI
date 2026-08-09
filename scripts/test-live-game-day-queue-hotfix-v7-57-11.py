#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, re, sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def check(name,cond):
    if not cond: errors.append(name)
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()

site=json.loads((ROOT/'config/site-release.json').read_text())
html=(ROOT/'live-dashboard.html').read_text()
js=(ROOT/'js/live-dashboard-v7-57-11.js').read_text()
mig=(ROOT/'supabase/migrations/202608090003_game_day_queue_hotfix_dashboard_simplification.sql').read_text()

check('version',site.get('version')=='7.57.11')
check('name',site.get('name')=='Game-Day Queue Hotfix & Dashboard Simplification')
for key in ['liveScoringDashboardRelease','liveScoringGameDayHubRelease','liveScoringGameDayOperationsRelease','liveScoringGamePersistenceRelease','liveScoringGameDayQueueReliabilityRelease','liveScoringDashboardSimplificationRelease']:
    check(key,site.get(key)=='7.57.11')
check('dashboard js wired','js/live-dashboard-v7-57-11.js?v=7.57.11' in html)
check('start game wording','id="saveStartGameDayButton" type="button">Start game</button>' in html and 'Save &amp; start' not in html)
check('single dashboard add entry','id="addGameDayButton"' in html and 'id="createScrimmageLink"' not in html and 'Add first game' not in js)
check('readiness navigates only','Go to Game Day' in js and 'button.dataset.mode === "game-day"' in js)
check('start game direct flow','saveGameDay({startAfter:true})' in js)
check('atomic save preserved','live_save_game_day_v1' in js and 'verifyGameDayRecord' in js and 'refreshSavedGame' in js)
check('queue rpc preserved','live_game_day_queue_v4' in js)
check('migration replaces queue','create or replace function public.live_game_day_queue_v4' in mig)
check('migration explains limit','at most 100 arguments' in mig and 'more than 50 key/value pairs' in mig)
check('chunked json',mig.count('jsonb_build_object(') >= 4 and '|| jsonb_build_object(' in mig)
# Ensure no individual queue jsonb_build_object block carries >50 key/value pairs.
for i,block in enumerate(re.findall(r'jsonb_build_object\((.*?)\)\s*(?:\|\||as row_data|;)',mig,re.S),1):
    keys=re.findall(r"'[^']+'\s*,",block)
    check(f'json chunk {i} under postgres arg limit',len(keys) <= 50)

# Protected runtime/service plane unchanged from 7.57.10 baseline.
expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'js/live-team-context-v7-57-3.js':'def547d5f29e409b972f3efe344f8d24ff9365792f85d43a30a9b19d0621f521',
 'supabase/migrations/202608080007_tournament_schedule_integration_reconciliation.sql':'41e18e38bc9d71e0c10eab6721a88820ee14050c8d736576c96ca93f0be714c2',
 'supabase/migrations/202608090001_scorer_assignments_game_day_operations.sql':'01e9f49c9b1389a9cb7756fd42735c0e9f5475d3eab986514f57d1ebfbdfa189',
 'supabase/migrations/202608090002_game_reliability_role_safe_access.sql':'2277348bafb2b78bf37335c19f39db149f7cd10f3d7e4e19ec715b14ed64fae0'
}
for path,h in expected.items():
    check('protected '+path,sha(path)==h)

if errors:
    print('WPI LIVE GAME-DAY QUEUE HOTFIX 7.57.11 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI LIVE GAME-DAY QUEUE HOTFIX 7.57.11 TEST PASSED')
print(' - Game-Day queue JSON is split below PostgreSQL function-argument limits')
print(' - Atomic Tournament/Friendly save + assignment flow remains intact')
print(' - Game creation is centralized in Game-Day Hub; direct launch is labeled Start game')
print(' - Scoring, handoff, GroupMe, roster vision and tournament reconciliation remain protected')
