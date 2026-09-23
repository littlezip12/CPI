#!/usr/bin/env python3
from pathlib import Path
import json, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def semver_at_least(value, floor):
    try:
        return tuple(int(x) for x in str(value).split(".")[:3]) >= tuple(int(x) for x in str(floor).split(".")[:3])
    except Exception:
        return False
site=json.loads((ROOT/'config/site-release.json').read_text())
page=(ROOT/'live-following.html').read_text()
version=(ROOT/'VERSION.md').read_text()
if not semver_at_least(site.get('version'),'7.64.25'): errors.append('site release must preserve 7.64.25 or later')
if site.get('liveFollowingSeasonalEntryCleanupRelease')!='7.64.25': errors.append('seasonal entry release marker missing')
if '# WPI 7.64.25 — My Teams Seasonal Entry Cleanup' not in version: errors.append('VERSION.md missing 7.64.25 header')
for token in ['href="live.html">Live Scores</a>','href="organizations.html">Find a Team</a>','Sign in or create supporter account']:
    if token not in page: errors.append(f'My Teams signed-out entry missing {token}')
for forbidden in ['href="live-high-schools.html">High Schools</a>']:
    if forbidden in page: errors.append(f'My Teams still exposes deferred high-school entry: {forbidden}')
# Preserve the future-season route rather than deleting the foundation.
if not (ROOT/'live-high-schools.html').exists(): errors.append('high-school foundation route was removed instead of merely hidden from current entry')
if errors:
    print('WPI 7.64.25 MY TEAMS SEASONAL ENTRY TEST FAILED')
    for e in errors: print(' -', e)
    sys.exit(1)
print('WPI 7.64.25 MY TEAMS SEASONAL ENTRY TEST PASSED')
print(' - Signed-out My Teams exposes Live Scores and Find a Team')
print(' - High Schools is removed from the current entry surface but preserved for future use')
