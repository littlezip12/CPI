#!/usr/bin/env python3
"""Static acceptance checks for WPI Live 7.58.1 Owner Dashboard Refactor."""
from pathlib import Path
import hashlib, json, re
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def require(ok,msg):
    if not ok: raise AssertionError(msg)
release=json.loads(read('config/site-release.json'))
html=read('live-dashboard.html')
js=read('js/live-dashboard-v7-58-1.js')
css=read('css/live-dashboard-v7-58-1.css')
require(read('VERSION.md').strip()=='# WPI 7.58.1 — Owner Dashboard Refactor','VERSION mismatch')
require(release.get('version')=='7.58.1' and release.get('name')=='Owner Dashboard Refactor','release metadata mismatch')
for key in ('liveScoringDashboardRelease','liveScoringOwnerDashboardRefactorRelease','liveScoringTeamReadinessUxRelease','liveScoringGameDaySetupUxRelease'):
    require(release.get(key)=='7.58.1',f'missing 7.58.1 release marker: {key}')
require(release.get('liveScoringClubWorkspaceRelease')=='7.58.0','Club Workspace foundation marker must remain 7.58.0')
require(release.get('liveScoringClubTeamHierarchyRelease')=='7.58.0','Club → Teams hierarchy must remain 7.58.0')

for token in ('css/live-dashboard-v7-58-1.css?v=7.58.1','js/live-dashboard-v7-58-1.js?v=7.58.1','js/live-team-context-v7-58-0.js?v=7.58.0'):
    require(token in html,f'missing dashboard asset: {token}')
require('Guided team launch' not in html and 'Guided Team Launch' not in html,'persistent Guided Team Launch copy remains')
require('Games on deck' not in html and 'games on deck' not in html,'Games on Deck remains as a product concept')
for token in ('id="dashboardTeamProfile"','id="dashboardOverview"','id="dashboardGameDay"','id="dashboardGameDaySetup"','id="dashboardGameArchive"'):
    require(token in html,f'missing dashboard hierarchy element: {token}')
order=[html.index('id="dashboardTeamProfile"'),html.index('id="dashboardOverview"'),html.index('id="dashboardGameDay"'),html.index('id="dashboardGameDaySetup"'),html.index('id="dashboardGameArchive"')]
require(order==sorted(order),'Owner dashboard hierarchy is not Team Profile → Readiness → Game-Day Hub → Setup → Archive')
setup_start=html.index('<details class="live-game-day-setup-disclosure" id="dashboardGameDaySetup">')
setup_end=html.index('</details>',setup_start)
setup=html[setup_start:setup_end]
require('<details class="live-game-day-setup-disclosure" id="dashboardGameDaySetup" open' not in html,'Game Day Setup must be collapsed by default')
for token in ('id="dashboardRoster"','id="dashboardTeamAccess"','id="dashboardGroupMe"'):
    require(token in setup,f'{token} must live inside Game Day Setup')
require('id="dashboardTeamProfile"' not in setup,'Team Profile must remain outside Game Day Setup')
require('Game-Day Hub' in html and 'one operational queue' in html,'Game-Day Hub single-queue language missing')
require('function focusSetupStep' in js and 'target.closest("details")' in js and 'disclosure.open = true' in js,'setup links must reveal collapsed disclosure')
require('gameDaySetupStatus' in js and 'reusableSetupRemaining' in js,'Game Day Setup status must follow readiness')
require(".live-game-day-setup-disclosure" in css and '#dashboardOverview[data-readiness-state="ready"] .live-readiness-grid' in css,'compact readiness/setup disclosure CSS missing')
require('body[data-live-role="viewer"] #dashboardTeamProfile' in css and 'body[data-live-role="scorer"] #dashboardGameDaySetup' in css,'role-shaped admin hiding must be preserved after DOM move')

# No new database migration belongs to this UI-only release.
migrations=sorted(p.name for p in (ROOT/'supabase/migrations').glob('20260811*.sql'))
require(migrations[-1]=='202608110003_club_workspace_foundation.sql',f'unexpected 7.58.1 migration found: {migrations[-1]}')

# Every literal $("id") reference in the new controller must still resolve in the dashboard DOM.
ids=set(re.findall(r'id="([^"]+)"',html))
refs=set(re.findall(r'\$\("([A-Za-z0-9_-]+)"\)',js))
missing=sorted(refs-ids)
require(not missing,f'dashboard controller references missing DOM ids: {missing}')

# Protected server/scoring foundations must remain byte-identical to 7.58.0.
protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-game-v7-57-22.js':'a03145737d61767d6fbca3676b585d8476c3724dd0e45f4f2fd83c2deb87fca4',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608110003_club_workspace_foundation.sql':'5d8c8413fc4ce1b76834114a1e289a305571d9dda4d6442546a76a9622f41b81',
}
for rel,digest in protected.items():
    require(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'protected foundation changed: {rel}')
print('WPI Live 7.58.1 Owner Dashboard Refactor static checks passed.')
