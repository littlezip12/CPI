from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def req(cond,msg):
    if not cond: raise AssertionError(msg)
def read(name): return (ROOT/name).read_text()
site=json.loads(read('config/site-release.json'))
req(site.get('version') in {'7.64.10','7.64.11'},'site version must preserve the 7.64.10 BAWPL/TBD game foundation')
for key in ('liveLeagueEventRelease','livePlannedGameSlotsRelease','liveTbdGameReadinessRelease'):
    req(site.get(key)=='7.64.10',f'{key} missing')
html=read('live-dashboard.html')
js=read('js/live-dashboard-v7-64-10.js')
css=read('css/live-dashboard-v7-64-10.css')
recap=read('js/live-game-recap-v7-64-10.js')
sql=read('supabase/migrations/202609160002_bawpl_event_tbd_game_readiness.sql')
req('live-dashboard-v7-64-10.js?v=7.64.10' in html,'7.64.10 dashboard must load')
req('live-dashboard-v7-64-10.css?v=7.64.10' in html,'7.64.10 dashboard CSS must load')
req('planGameSlotsButton' in html and 'planGameSlotsDialog' in html,'planned-game UI missing')
req('value="league"' in html and 'gameLeagueEventSelect' in html,'league/event game option missing')
req('live_game_day_queue_v6' in js and 'live_save_game_day_v4' in js,'dashboard must use 7.64.10 RPCs')
req('live_plan_game_slots_v1' in js and 'live_cancel_game_slot_v1' in js,'planned slot actions missing')
req('Opponent TBD' in js and 'Time TBD' in js and 'not a scored/public game' in js,'TBD slot safeguards missing')
req('live_planned_game_slots' in sql,'planned slot table missing')
req("'league_event'" in sql and "'league'" in sql,'league schema missing')
req('target_planned_slot_id' in sql and 'planned_game_slot_id' in sql,'slot-to-game conversion missing')
req('requested_opponent_name' in sql and 'Enter the opponent before creating the real game' in sql,'conversion must require a real opponent')
req("series.seriesType === \"league_event\"" in recap,'recap must label league events')
req('.live-game-day-slot' in css,'planned slot mobile styling missing')
print('WPI Live 7.64.10 BAWPL/TBD game readiness check passed.')
