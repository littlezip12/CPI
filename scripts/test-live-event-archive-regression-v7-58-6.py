#!/usr/bin/env python3
"""Protect the validated 7.58.4 Event Archive & Game Recaps foundation during 7.58.6."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def req(ok,msg):
    if not ok: raise AssertionError(msg)
release=json.loads(read('config/site-release.json'))
req(release.get('version') in {'7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1'},'current release must preserve 7.58.6 or later')
for key in ('liveScoringEventArchiveRelease','liveScoringGameRecapRelease','liveScoringEventGroupingRelease','liveScoringArchiveReconciliationRelease','liveScoringGameFlowUxRelease','liveScoringGameNavigationRelease'):
    req(release.get(key)=='7.58.4',f'7.58.4 marker changed: {key}')
expected={
 'supabase/migrations/202608130001_event_archive_game_recaps.sql':'8fc0881a48b842cb15d5453c13d3283f2c9efee7e5e2f78f729300efbb4f2cfe',
 'js/live-game-recap-v7-58-4.js':'8f18eb85dcc1f1b9b9776601261f0e1fc9377f8bf7f39985be6b423015a6d1c0',
 'js/live-game-v7-58-4.js':'cb0ab511118e09cd02299f669ed10f411fe771fd330720f5e6a3874eae2890e1',
}
for rel,digest in expected.items():
    req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'7.58.4 protected file changed: {rel}')
dashboard=read('js/live-dashboard-v7-58-5.js')
for token in ('live_game_series_archive_v3','live_merge_game_series_v1','live-game-recap.html','populateScrimmageWeekendSelect','function liveGameLaunchUrl(gameId)','launch:1'):
    req(token in dashboard,f'7.58.4 behavior missing from 7.58.5 dashboard: {token}')
html=read('live-dashboard.html')
for token in ('id="gameScrimmageWeekendSelect"','id="eventMergeDialog"'):
    req(token in html,f'7.58.4 UX missing: {token}')
recap=read('live-game-recap.html')
req(('js/live-game-recap-v7-60-3.js?v=7.60.3' in recap or 'js/live-game-recap-v7-58-4.js?v=7.58.7' in recap or 'js/live-game-recap-v7-58-4.js?v=7.58.6-recapfix1' in recap),'permanent recap route changed unexpectedly')
print('WPI Live 7.58.4 Event Archive & Game Recaps regression passed.')
