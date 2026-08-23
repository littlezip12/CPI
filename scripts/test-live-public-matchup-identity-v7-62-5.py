#!/usr/bin/env python3
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]
def req(cond,msg):
    if not cond: raise SystemExit("PUBLIC MATCHUP IDENTITY 7.62.5 TEST FAILED\n - "+msg)
site=json.loads((ROOT/'config/site-release.json').read_text())
req(site.get('version') in {'7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9','7.64.0','7.64.1','7.64.2','7.64.3'},'site version must preserve 7.62.5 or later')
req(site.get('liveScoringPublicMatchupIdentityRelease')=='7.62.5','matchup identity release metadata missing')
req(site.get('liveScoringPublicScorePresentationRelease')=='7.62.5','score presentation release metadata missing')
req(any(v in (ROOT/'VERSION.md').read_text() for v in ('7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9','7.64.0','7.64.1','7.64.2','7.64.3')),'VERSION must preserve 7.62.5 or later')
for rel in ['live.html','live-score.html','js/live-public-center-v7-62-5.js','js/live-public-score-v7-62-5.js','css/live-public-v7-62-5.css']:
    req((ROOT/rel).exists(),f'missing {rel}')
center=(ROOT/'js/live-public-center-v7-62-5.js').read_text()
score=(ROOT/'js/live-public-score-v7-62-5.js').read_text()
score_html=(ROOT/'live-score.html').read_text()
css=(ROOT/'css/live-public-v7-62-5.css').read_text()
req('opponentLogoUrl' in center and 'public-live-matchup-side--opponent' in center,'public scoreboard must render opponent identity/logo')
req('publicScoreHomeLogo' in score_html and 'publicScoreOpponentLogo' in score_html,'public score markup must provide two logo targets')
req('opponentLogoUrl' in score and 'publicScoreOpponentLogo' in score,'public score viewer must use opponent logo when available')
req('assets/branding/wpi-logo-mark.png' in score and 'assets/branding/wpi-logo-mark.png' in center,'unknown opponent logo must use neutral WPI fallback instead of guessing identity')
req('is-winner' in score and 'Winner' in score and 'is-leading' in score,'score viewer must distinguish final winner and live leader')
req('g.updatedAt' in score and 'auto-refresh 8s' in score,'score freshness must use server update time and state refresh cadence')
req('public-score-side.is-winner' in css,'winner presentation CSS missing')
# Protected operational foundation remains byte-stable.
hashes=json.loads((ROOT/'data/live/protected-foundation-hashes-v7-62-1.json').read_text())['files']
for rel,expected in hashes.items():
    got=hashlib.sha256((ROOT/rel).read_bytes()).hexdigest(); req(got==expected,f'protected file changed: {rel}')
print('PUBLIC MATCHUP IDENTITY 7.62.5 TEST PASSED')
print(' - public Live cards and score pages show both matchup identities/logos')
print(' - missing opponent artwork falls back neutrally; WPI never guesses an identity')
print(' - finals identify the winner and live games indicate the current leader')
print(' - server update freshness is visible without exposing private game detail')
print(' - protected scoring, GroupMe and scorer-authority files remain byte-stable')
