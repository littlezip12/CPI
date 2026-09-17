from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def req(cond,msg):
    if not cond: raise SystemExit(f'FAIL: {msg}')
site=json.loads((ROOT/'config/site-release.json').read_text())
req(site.get('version') in {'7.64.9','7.64.10'},'site version must preserve 7.64.9 or later')
for key in ('liveScoringMobileWorkspaceActionsRelease','liveScoringSimplifiedEventEntryRelease','liveGroupMeGameStoryRelease'):
    req(site.get(key)=='7.64.9',f'{key} missing')
html=(ROOT/'live-game.html').read_text()
req('live-game-v7-64-9.js?v=7.64.9' in html,'7.64.9 scorer must load')
req('live-quick-time-pad-v7-64-9.js?v=7.64.9' in html,'7.64.9 Quick Time must load')
req('live-game-day-speed-v7-64-9.css?v=7.64.9' in html,'7.64.9 scorer CSS must load')
css=(ROOT/'css/live-game-day-speed-v7-64-9.css').read_text()
for token in ('#eventForm .live-time-field','#eventForm #recordEventButton','.live-status-actions','grid-template-columns:minmax(0,1fr) minmax(0,1fr)'):
    req(token in css,f'mobile/simplified UI token missing: {token}')
qtp=(ROOT/'js/live-quick-time-pad-v7-64-9.js').read_text()
for token in ('wpi-quick-time-active','wpiQuickNote','Add note','quickNote.value.trim()','wpiQuickAssist'):
    req(token in qtp,f'Quick Time simplification token missing: {token}')
engine=(ROOT/'js/live-game-v7-64-9.js').read_text()
for token in ('"GAME STORY"','"GAME STATS"','const gameStory = buildRecap(stats)','ensureAutomaticGameSummary()'):
    req(token in engine,f'GroupMe Game Story token missing: {token}')
# Protect the 7.64.8 database contract: no new migration should be required for 7.64.9.
req(not any(p.name.startswith('20260916') and '7649' in p.name for p in (ROOT/'supabase/migrations').glob('*.sql')),'7.64.9 should not add a database migration')
print('WPI Live 7.64.9 mobile scoring + GroupMe Game Story check passed.')
