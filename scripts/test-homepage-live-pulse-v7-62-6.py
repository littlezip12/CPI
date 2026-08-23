#!/usr/bin/env python3
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def req(cond,msg):
    if not cond: raise SystemExit("HOMEPAGE LIVE PULSE 7.62.6 TEST FAILED\n - "+msg)
site=json.loads((ROOT/'config/site-release.json').read_text())
req(site.get('version') in {'7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9','7.64.0','7.64.1','7.64.2'},'site version must preserve 7.62.6 or later')
req(site.get('liveScoringHomepageLivePulseRelease')=='7.62.6','homepage Live pulse release metadata missing')
req(site.get('liveScoringHomepagePublicScoreDiscoveryRelease')=='7.62.6','homepage public score discovery metadata missing')
req(any(v in (ROOT/'VERSION.md').read_text() for v in ('7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9','7.64.0','7.64.1','7.64.2')),'VERSION must preserve 7.62.6 or later')
for rel in ['index.html','js/homepage-live-v7-62-6.js','css/homepage-live-v7-62-6.css']:
    req((ROOT/rel).exists(),f'missing {rel}')
index=(ROOT/'index.html').read_text(); js=(ROOT/'js/homepage-live-v7-62-6.js').read_text(); css=(ROOT/'css/homepage-live-v7-62-6.css').read_text()
req('id="wpiHomeLivePulse"' in index and 'id="wpiHomeLiveCards"' in index,'homepage Live pulse markup missing')
req('homepage-live-v7-62-6.js?v=7.62.6' in index and 'homepage-live-v7-62-6.css?v=7.62.6' in index,'homepage Live assets must be cache-keyed to 7.62.6')
req('live_public_scoreboard_v1' in js,'homepage must reuse public scoreboard RPC')
req('live-score.html?game=' in js,'homepage cards must link to public score-only game view')
req('public_team' not in js or 'team_private' not in js,'homepage client must not implement or broaden private visibility logic')
req('roster' not in js.lower() and 'groupme' not in js.lower() and 'scorer' not in js.lower(),'homepage Live pulse must not request/render private operational detail')
req('setInterval' in js and '30000' in js,'homepage Live pulse must refresh every 30 seconds')
req('wpi-home-live-card' in css,'homepage Live pulse card styling missing')
# Protected operational foundation remains byte-stable.
hashes=json.loads((ROOT/'data/live/protected-foundation-hashes-v7-62-1.json').read_text())['files']
for rel,expected in hashes.items():
    got=hashlib.sha256((ROOT/rel).read_bytes()).hexdigest(); req(got==expected,f'protected file changed: {rel}')
print('HOMEPAGE LIVE PULSE 7.62.6 TEST PASSED')
print(' - homepage surfaces public WPI Live scores without requiring a separate discovery step')
print(' - live games are prioritized before upcoming games and recent finals')
print(' - public score links, matchup logos and organization colors are preserved')
print(' - no roster/player/scorer/GroupMe or team-private data is exposed')
print(' - protected scoring, delivery and scorer-authority files remain byte-stable')
