#!/usr/bin/env python3
from pathlib import Path
import json,re
r=Path(__file__).resolve().parents[1]
h=(r/'live-game-experience.html').read_text()
j=(r/'js/wphq-game-experience-v7-64-48.js').read_text()
c=(r/'css/wphq-game-experience-v7-64-48.css').read_text()
recap=(r/'live-game-recap.html').read_text()
assert 'live-game_recap_detail_v1' not in j # sanity: uses actual registered RPC below
assert 'live_game_recap_detail_v1' in j
assert 'live_game_player_cap_context_v1' in j
assert 'waitForHealthySession' in j
assert 'hasDetailedAnalytics' in j
for tab in ['Gamecast','Box','Pbp','Teams','Lineups']:
  assert f'id="gxTab{tab}"' in h and f'id="gx{tab}"' in h
assert 'New game view' in recap and 'wphq-game-experience-link-v7-64-48.js' in recap
assert 'game-experience-v7-64-48.css?v=7.64.48' in h
assert 'No opponent stats are estimated' in h
assert 'Goal context: not classified' in j
assert 'opponentCap' in j
for banned in ['.insert(','.update(','.delete(','.upsert(','.subscribe(','signInAnonymously','live_finalize_game','live_record_event']:
  assert banned not in j, banned
assert 'wphq-game-view' in c
assert json.loads((r/'config/site-release.json').read_text())['version']=='7.64.48'
print('WPHQ 7.64.48 GAME EXPERIENCE FOUNDATION CHECK PASSED')
