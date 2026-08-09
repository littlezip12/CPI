#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def check(name,cond):
    if not cond: errors.append(name)
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
site=json.loads((ROOT/'config/site-release.json').read_text())
html=(ROOT/'live-dashboard.html').read_text()
js=(ROOT/('js/live-dashboard-v7-57-9.js' if (ROOT/'js/live-dashboard-v7-57-9.js').exists() else 'js/live-dashboard-v7-57-8.js')).read_text()
css=(ROOT/('css/live-sandbox-v7-57-9.css' if (ROOT/'css/live-sandbox-v7-57-9.css').exists() else 'css/live-sandbox-v7-57-8.css')).read_text()
mig=(ROOT/'supabase/migrations/202608080007_tournament_schedule_integration_reconciliation.sql').read_text()
builder=(ROOT/'scripts/build-live-tournament-schedule-index.py').read_text()
hub=json.loads((ROOT/'data/tournaments/public-hub.json').read_text())
index=json.loads((ROOT/'data/live/tournament-schedule-index.json').read_text())

check('version',site.get('version') in {'7.57.8','7.57.9','7.57.10','7.57.11'})
check('name',site.get('name') in {'Tournament Schedule Integration & Reconciliation','Scorer Assignments & Game-Day Operations'})
for key in ['liveScoringDashboardRelease','liveScoringTeamAdminRelease','liveScoringGameDayHubRelease']:
    check(key,site.get(key) in {'7.57.8','7.57.9','7.57.10','7.57.11'})
for key in ['liveScoringTournamentScheduleIntegrationRelease','liveScoringTournamentReconciliationRelease']:
    check(key,site.get(key)=='7.57.8')
check('dashboard js wired',('js/live-dashboard-v7-57-8.js?v=7.57.8' in html or 'js/live-dashboard-v7-57-9.js?v=7.57.9' in html))
check('dashboard css wired',('css/live-sandbox-v7-57-8.css?v=7.57.8' in html or 'css/live-sandbox-v7-57-9.css?v=7.57.9' in html))
check('schedule card markup',all(token in html for token in ['id="wpiScheduleStatusPill"','id="wpiScheduleSummary"','id="syncWpiScheduleButton"','id="wpiScheduleSyncMessage"']))
check('two game types remain',html.count('name="gameKind"')==2 and 'value="tournament"' in html and 'value="friendly"' in html and 'value="scrimmage"' not in html)
check('manual fallback copy','manual fallback always available' in html)

for token in [
    'data/live/tournament-schedule-index.json','officialGameForWorkspace','participantWorkspaceMatchScore',
    'manualOfficialMatchConfidence','syncTournamentSchedule','autoSyncTournamentSchedule',
    'live_sync_official_tournament_game_v1','live_confirm_tournament_reconciliation_v1',
    'live_dismiss_tournament_reconciliation_v1',('live_game_day_queue_v4' if site.get('version')=='7.57.9' else 'live_game_day_queue_v3'),
    'Possible WPI schedule match · review required','Manual tournament · matched to WPI schedule',
    'score conflict needs review','candidate_manual_game_id'
]: check('js '+token,token in js)
check('review UI css','live-game-reconcile-review' in css and 'live-wpi-schedule-card' in css)

check('index release',index.get('release')=='7.57.8')
check('index active season',index.get('activeCompetitiveSeason')==(hub.get('seasonModel') or {}).get('currentSeason'))
check('index current next tournament',(index.get('nextTournament') or {}).get('name')==(hub.get('nextTournament') or {}).get('name'))
# 2026-27 is announced but its schedule is intentionally not invented.
current_events=[e for e in hub.get('events',[]) if e.get('competitiveSeason')==index.get('activeCompetitiveSeason') and e.get('dataPath')]
expected_current_games=0
for e in current_events:
    p=ROOT/e['dataPath']
    if p.exists():
        doc=json.loads(p.read_text()); expected_current_games += len(doc.get('games',[])) if isinstance(doc.get('games'),list) else 0
check('index only active season',index.get('counts',{}).get('games')==expected_current_games)
check('builder active season filter','outside_active_competitive_season' in builder and 'active_season' in builder)
check('builder deterministic timestamp','2026-08-08T00:00:00Z' in builder)

for token in [
    'official_snapshot jsonb','reconciliation_candidate_snapshot jsonb',
    'live_games_unique_official_schedule_game_idx','live_sync_official_tournament_game_v1',
    "coalesce(confidence,0) < 0.85", "reconciliation_status='possible_match'",
    "resulting_status := 'conflict'", 'live_confirm_tournament_reconciliation_v1',
    'live_dismiss_tournament_reconciliation_v1','live_game_day_queue_v3',
    "creation_source='tournament_schedule'", "source_mode='tournament_override'",
    'scheduled_at=case when candidate_row.started_at is null',
    'A scored manual game always remains the canonical live_games row'
]: check('migration '+token,token in mig)

# The scoring/delivery plane and 7.57.7 start-control foundation stay byte-identical.
expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/migrations/202608080006_game_day_identity_launch_reliability.sql':'cae36bd910eb7cffb0f937bf00c4c098013b171691eb3e2db68ff6b58c58c683',
 'js/live-team-context-v7-57-3.js':'def547d5f29e409b972f3efe344f8d24ff9365792f85d43a30a9b19d0621f521'
}
for path,expected_hash in expected.items(): check('protected '+path,sha(path)==expected_hash)

if errors:
    print('WPI LIVE TOURNAMENT SCHEDULE & RECONCILIATION 7.57.8 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI LIVE TOURNAMENT SCHEDULE & RECONCILIATION 7.57.8 TEST PASSED')
print(' - Active-season WPI tournament schedule index is derived from the public Tournament platform')
print(' - Official games can sync into Game Day; Tournament/Friendly manual paths remain available')
print(' - High-confidence manual tournament fallbacks reconcile to the same live_games row')
print(' - Ambiguous matches persist for Owner/Admin review instead of silently merging')
print(' - Official score conflicts are stored separately and never overwrite the WPI Live event log')
print(' - Current 2026-27 Evan schedule is not invented while WPI still marks it as coming soon')
print(' - Scoring, GroupMe, roster vision, and 7.57.7 scorer-control files remain protected')
