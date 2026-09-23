#!/usr/bin/env python3
from pathlib import Path
import json, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
site=json.loads((ROOT/'config/site-release.json').read_text())
page=(ROOT/'live-following.html').read_text()
css=(ROOT/'css/live-following-v7-64-24.css').read_text()
version=(ROOT/'VERSION.md').read_text()
def semver_at_least(value, floor):
    def parts(v): return tuple(int(x) for x in str(v).split('.')[:3])
    return parts(value) >= parts(floor)
if not semver_at_least(site.get('version'),'7.64.24'): errors.append('site release must preserve 7.64.24 or later')
if site.get('liveFollowingSignedOutVisibilityRelease')!='7.64.24': errors.append('signed-out visibility release marker missing')
if '# WPI 7.64.24 — My Teams Signed-Out Visibility Fix' not in version: errors.append('VERSION.md missing 7.64.24 header')
if 'css/live-following-v7-64-24.css?v=7.64.24' not in page: errors.append('live-following.html missing 7.64.24 stylesheet')
for token in ['data-follow-auth-only hidden','id="followSignedOut"','id="followConnected"']:
    if token not in page: errors.append(f'live-following.html missing {token}')
for token in ['[data-follow-auth-only][hidden]{display:none!important}','#followConnected[hidden],#followSignedOut[hidden]{display:none!important}']:
    if token not in css: errors.append(f'visibility stylesheet missing {token}')
for public in ['href="live.html">Live Scores</a>','Sign in or create supporter account']:
    if public not in page: errors.append(f'public signed-out entry missing {public}')
if errors:
    print('WPI 7.64.24 SIGNED-OUT VISIBILITY TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI 7.64.24 SIGNED-OUT VISIBILITY TEST PASSED')
print(' - Auth-only My Teams controls remain hidden while signed out')
print(' - Public links and supporter sign-in entry remain available')
