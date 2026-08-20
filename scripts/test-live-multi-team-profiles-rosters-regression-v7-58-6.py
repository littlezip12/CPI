#!/usr/bin/env python3
"""Protect the validated 7.58.2 profile/roster foundation during 7.58.6."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def req(ok,msg):
    if not ok: raise AssertionError(msg)
release=json.loads(read('config/site-release.json'))
req(release.get('version') in {'7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7'},'current release must preserve 7.58.6 or later')
for key in ('liveScoringTeamProfileRelease','liveScoringRosterVersioningRelease','liveScoringSeasonAwareRosterRelease','liveScoringDefaultLineupRelease','liveScoringMultiTeamProfilesRostersRelease'):
    req(release.get(key)=='7.58.2',f'7.58.2 marker changed: {key}')
expected={
 'supabase/migrations/202608110004_multi_team_profiles_rosters.sql':'70bdd10a765b671f1677db16ce58676919c391656d4d60e262e6ead1ad03cd58',
 'js/live-team-profiles-rosters-v7-58-2.js':'1620b9d08e4d53ef5eee72cb887293cea2f660ccefc3459d69a6a944368902b5'
}
for rel,digest in expected.items():
    req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'7.58.2 protected file changed: {rel}')
dashboard=read('js/live-dashboard-v7-58-5.js')
for token in ('backend.updateTeamProfile','backend.saveRosterVersion','backend.setDefaultLineup','renderRosterVersions','renderDefaultLineup'):
    req(token in dashboard,f'7.58.2 behavior missing from 7.58.5 dashboard: {token}')
html=read('live-dashboard.html')
for token in ('id="teamProfileName"','id="rosterVersionBadge"','id="rosterHistoryDetails"','id="defaultLineupCard"','id="defaultLineupDialog"'):
    req(token in html,f'7.58.2 UX missing: {token}')
print('WPI Live 7.58.2 Multi-Team Profiles & Rosters regression passed.')
