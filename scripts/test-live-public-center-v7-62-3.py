#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def req(cond,msg):
    if not cond: raise SystemExit('PUBLIC LIVE CENTER 7.62.3 TEST FAILED\n - '+msg)
site=json.loads((ROOT/'config/site-release.json').read_text())
req(site.get('version') in {'7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6'},'site version must preserve 7.62.3 or later')
req(site.get('liveScoringPublicLiveCenterRelease')=='7.62.3','public Live Center release metadata missing')
req(any(v in (ROOT/'VERSION.md').read_text() for v in ('7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6')),'VERSION must preserve 7.62.3 or later')
for rel in ['live.html','live-score.html','js/live-public-center-v7-62-3.js','js/live-public-score-v7-62-3.js','css/live-public-v7-62-3.css','supabase/migrations/202608160005_public_live_center.sql']:
    req((ROOT/rel).exists(),f'missing {rel}')
center=(ROOT/'live.html').read_text(); score=(ROOT/'live-score.html').read_text(); shell=(ROOT/'js/site-shell.js').read_text(); index=(ROOT/'index.html').read_text()
req('publicLiveResults' in center and 'publicLiveSearch' in center and 'publicLiveStatus' in center,'public Live Center controls missing')
req('My Teams' in center and 'Team dashboard' in center,'public Live Center must keep supporter and operator paths separate')
req('publicScoreHomeValue' in score and 'publicScoreOpponentValue' in score and 'Public score only' in score,'public score-only view incomplete')
req('{ label: "WPI Live", href: "live.html"' in shell,'global WPI Live navigation must route to the public Live Center')
req('href="live.html"><strong>WPI Live</strong>' in index,'homepage must expose the public Live Center')
req('js/site-shell.js?v=7.62.3' in center and 'js/site-shell.js?v=7.62.3' in score,'new public Live pages must use current shell')
sql=(ROOT/'supabase/migrations/202608160005_public_live_center.sql').read_text().lower()
req('live_public_scoreboard_v1' in sql and 'live_public_game_score_v1' in sql,'public score RPCs missing')
req("g.visibility='public_team'" in sql,'public score RPCs must require explicit public_team visibility')
req('grant execute on function public.live_public_scoreboard_v1() to anon,authenticated' in sql,'scoreboard must be callable by public browser clients')
req('grant execute on function public.live_public_game_score_v1(uuid) to anon,authenticated' in sql,'public score view must be callable by public browser clients')
for forbidden in ['public.live_players','public.live_events','public.live_lineups','public.live_deliveries','public.live_team_members','public.live_game_scorer_sessions']:
    req(forbidden not in sql,f'public score migration must not read protected detail surface {forbidden}')
for dangerous in ['insert into public.live_','update public.live_','delete from public.live_']:
    req(dangerous not in sql,f'public score migration must be read-only: {dangerous}')
org=(ROOT/'js/organization-profile-v7-62-1.js').read_text(); hub=(ROOT/'js/team-hub-v7-62-1.js').read_text()
req('!session' in org and 'live-score.html?game=' in org,'anonymous organization public-game links must use score-only viewer')
req('!session' in hub and 'live-score.html?game=' in hub,'anonymous team-hub public-game links must use score-only viewer')
# Protected scoring/GroupMe foundation remains unchanged from the prior stable team-hub baseline.
hashes=json.loads((ROOT/'data/live/protected-foundation-hashes-v7-62-1.json').read_text())['files']
for rel,expected in hashes.items():
    got=hashlib.sha256((ROOT/rel).read_bytes()).hexdigest(); req(got==expected,f'protected file changed: {rel}')
print('PUBLIC LIVE CENTER 7.62.3 TEST PASSED')
print(' - WPI Live now has a public scoreboard for explicitly public_team games')
print(' - public single-game viewing is score/state only; no player, roster, scorer, delivery or membership data')
print(' - team-private games remain outside the public RPC surface')
print(' - scoring authority and protected GroupMe/game engine files are unchanged')
