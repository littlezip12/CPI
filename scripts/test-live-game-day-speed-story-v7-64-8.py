from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def req(cond,msg):
    if not cond: raise SystemExit(f'FAIL: {msg}')
site=json.loads((ROOT/'config/site-release.json').read_text())
req(site.get('version') in {'7.64.8','7.64.9'},'site version must preserve 7.64.8+')
for key in ('liveScoringGameDayCapAssignmentRelease','liveScoringQuickTimePadRelease','liveScoringGameStoryRelease'):
    req(site.get(key) in {'7.64.8','7.64.9'},f'{key} missing')
html=(ROOT/'live-game.html').read_text()
req(('live-quick-time-pad-v7-64-8.js?v=7.64.8' in html) or ('live-quick-time-pad-v7-64-9.js?v=7.64.9' in html),'Quick Time Pad must load')
req(('live-game-day-speed-v7-64-8.css?v=7.64.8' in html) or ('live-game-day-speed-v7-64-9.css?v=7.64.9' in html),'game-day speed CSS must load')
req('saveCapsForEventButton' in html,'event cap control missing')
qtp=(ROOT/('js/live-quick-time-pad-v7-64-9.js' if site.get('version')=='7.64.9' else 'js/live-quick-time-pad-v7-64-8.js')).read_text()
for token in ('Same time','data-qtp-adjust','form.requestSubmit','live_game_player_cap_context_v1','live_save_series_cap_assignments_v1'):
    req(token in qtp,f'Quick Time/cap token missing: {token}')
engine=(ROOT/('js/live-game-v7-64-9.js' if site.get('version')=='7.64.9' else 'js/live-game-v7-64-8.js')).read_text()
for token in ('gameCap','effectivePlayerCap','The defense was tighter than Fort Knox','stood tall with','game that got away from them'):
    req(token in engine,f'engine/story token missing: {token}')
backend=(ROOT/'js/live-backend-v7-64-8.js').read_text()
req('.filter(player => String(player.cap || "").trim() || String(player.name || "").trim())' in backend,'backend must accept cap-only/name-only roster entries')
dash=(ROOT/'js/live-dashboard-v7-64-8.js').read_text()
req('Each roster row needs a cap number, player name, or both.' in dash,'dashboard either/or validation missing')
recap=(ROOT/'live-game-recap.html').read_text(); recapjs=(ROOT/'js/live-game-recap-v7-64-8.js').read_text()
req('Game Story' in recap,'Game Story heading missing')
req('live_game_player_cap_context_v1' in recapjs,'recap effective cap context missing')
sql=(ROOT/'supabase/migrations/202609160001_game_day_speed_storytelling.sql').read_text()
for token in ('player_cap_assignments jsonb','live_game_player_cap_context_v1','live_save_series_cap_assignments_v1','live_players_identity_present_check'):
    req(token in sql,f'migration token missing: {token}')
print('WPI Live 7.64.8 game-day speed & storytelling check passed.')
