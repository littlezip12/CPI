#!/usr/bin/env python3
"""Static acceptance checks for WPI Live 7.58.4 Event Archive & Game Recaps."""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def require(ok,msg):
    if not ok: raise AssertionError(msg)
release=json.loads(read('config/site-release.json'))
html=read('live-dashboard.html')
js=read('js/live-dashboard-v7-58-4.js')
css=read('css/live-dashboard-v7-58-4.css')
recap_html=read('live-game-recap.html')
recap_js=read('js/live-game-recap-v7-58-4.js')
recap_css=read('css/live-game-recap-v7-58-4.css')
game_html=read('live-game.html')
game_js=read('js/live-game-v7-58-4.js')
game_css=read('css/live-game-v7-58-4.css')
sql=read('supabase/migrations/202608130001_event_archive_game_recaps.sql')

require(read('VERSION.md').strip()=='# WPI 7.58.4 — Event Archive & Game Recaps','VERSION mismatch')
require(release.get('version')=='7.58.4' and release.get('name')=='Event Archive & Game Recaps','release metadata mismatch')
for key in ('liveScoringDashboardRelease','liveScoringGameArchiveRelease','liveScoringEventArchiveRelease','liveScoringGameRecapRelease','liveScoringEventGroupingRelease','liveScoringArchiveReconciliationRelease'):
    require(release.get(key)=='7.58.4',f'missing 7.58.4 marker: {key}')
require(release.get('liveScoringMultiTeamAccessFollowingRelease')=='7.58.3','7.58.3 following foundation marker changed')
require(release.get('liveScoringGameFlowUxRelease')=='7.58.4','game-flow UX marker missing')
require(release.get('liveScoringGameNavigationRelease')=='7.58.4','game navigation marker missing')

for token in ('css/live-dashboard-v7-58-4.css?v=7.58.4','js/live-dashboard-v7-58-4.js?v=7.58.4-flowfix1'):
    require(token in html,f'missing 7.58.4 dashboard asset: {token}')
for token in ('css/live-game-recap-v7-58-4.css?v=7.58.4','js/live-game-recap-v7-58-4.js?v=7.58.4','js/live-backend-v7-56-8.js'):
    require(token in recap_html,f'missing recap asset: {token}')

# One event -> multiple games UX, explicit reuse rather than repeated free text.
for token in ('id="gameScrimmageWeekendSelect"','Create new Scrimmage Weekend','One weekend, multiple games','id="gameScrimmageWeekendNew"'):
    require(token in html,f'missing reusable Scrimmage Weekend UX: {token}')
require('gameScrimmageWeekendSuggestions' not in html,'legacy free-text datalist should be retired')
require('populateScrimmageWeekendSelect' in js and 'scrimmageWeekendOptions' in js,'existing weekend selection controller missing')

# Permanent recap route and structured content.
for token in ('Permanent game record','id="recapPeriodScores"','id="recapLineups"','id="recapPlayerStats"','id="recapTimeline"','id="recapDeliveryPanel"'):
    require(token in recap_html,f'missing recap surface: {token}')
for token in ('live_game_recap_detail_v1','data.events','data.lineups','data.playerStats','data.deliveryAudit'):
    require(token in recap_js,f'missing recap controller behavior: {token}')
require('state_snapshot' not in recap_js,'recap page must not consume raw private scorer snapshot')
require('live-game-recap.html' in js,'archive/final routes do not open permanent recap page')

# Game launch is one dashboard action followed directly by starter confirmation.
for token in ('function liveGameLaunchUrl(gameId)','launch:1','window.location.assign(liveGameLaunchUrl(gameId))'):
    require(token in js,f'missing single-action game launch behavior: {token}')
for token in ('js/live-game-v7-58-4.js?v=7.58.4','css/live-game-v7-58-4.css?v=7.58.4','id="dashboardTopButton"','id="gameDashboardButton"','id="summaryDashboardButton"'):
    require(token in game_html,f'missing game navigation asset/control: {token}')
for token in ('function maybeAutoLaunchFromDashboard()','url.searchParams.get("launch") !== "1"','openLineupDialog(1)','Confirm starters & begin','function returnToDashboard()','live-dashboard.html'):
    require(token in game_js,f'missing game-flow navigation behavior: {token}')
require('Score updates are off. The game will still be recorded in WPI.' in game_js,'GroupMe warning must remain non-blocking')
require('.live-dashboard-return' in game_css,'dashboard return styling missing')

# Server returns recap-safe structured data and keeps GroupMe audit manager-only.
for token in ('create or replace function public.live_game_recap_detail_v1','public.live_can_view_game(game_row.id)','from public.live_events e','from public.live_lineups l','from public.live_game_recaps','if is_manager then','deliveryAudit'):
    require(token in sql,f'missing recap RPC foundation: {token}')
require("'state_snapshot'" not in sql and 'game_row.state_snapshot' not in sql,'raw scorer state must not be returned by recap RPC')

# Existing ambiguous archive records are reconciled only by explicit manager action.
for token in ('create table if not exists public.live_game_series_merge_audit','create or replace function public.live_merge_game_series_v1','Owner or Admin role required','Different official tournaments cannot be merged','moved_game_ids','source_series_name','target_series_name'):
    require(token in sql,f'missing explicit archive reconciliation protection: {token}')
require('delete from public.live_games' not in sql.lower(),'7.58.4 must never delete games')
require('update public.live_games' in sql and 'where series_id=source_row.id' in sql,'merge must move existing canonical games, not copy them')
for token in ('id="eventMergeDialog"','data-merge-series','backend.client.rpc("live_merge_game_series_v1"'):
    require(token in html+js,f'missing explicit merge UX: {token}')

# Archive v3 preserves event W-L-T and recap availability.
for token in ('live_game_series_archive_v3','gameCount','finalCount','wins','losses','ties','recapAvailable'):
    require(token in sql,f'missing archive v3 field: {token}')
require('live_game_series_archive_v3' in js,'dashboard must use archive v3')

# Dashboard controller references remain valid.
ids=set(re.findall(r'id="([^"]+)"',html))
refs=set(re.findall(r'\$\("([A-Za-z0-9_-]+)"\)',js))
missing=sorted(refs-ids)
require(not missing,f'dashboard controller references missing DOM ids: {missing}')
recap_ids=set(re.findall(r'id="([^"]+)"',recap_html))
recap_refs=set(re.findall(r'\$\("([A-Za-z0-9_-]+)"\)',recap_js))
require(not sorted(recap_refs-recap_ids),f'recap controller references missing DOM ids: {sorted(recap_refs-recap_ids)}')

protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-game-v7-57-22.js':'a03145737d61767d6fbca3676b585d8476c3724dd0e45f4f2fd83c2deb87fca4',
 'js/live-team-context-v7-58-0.js':'a5dc2e403816a81ec0b4233d4eda87de3acde35628815844d18e1f2e34887024',
 'js/live-team-profiles-rosters-v7-58-2.js':'1620b9d08e4d53ef5eee72cb887293cea2f660ccefc3459d69a6a944368902b5',
 'js/live-team-following-v7-58-3.js':'eaa4d55d28b44cc5fa9b7973f241519cfdf044f6b039ab7ff489e1737fff3db3',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608120001_multi_team_access_following.sql':'7bb9460a5f148ebe6699eec56639fed05f08f1c3aa7b71bb4f8abfad78150a0d',
}
for rel,digest in protected.items():
    require(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'protected foundation changed: {rel}')
print('WPI Live 7.58.4 Event Archive & Game Recaps static checks passed.')
