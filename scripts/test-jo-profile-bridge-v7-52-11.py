#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def fail(msg): errors.append(msg)
def load(rel):
    p=ROOT/rel
    if not p.exists(): fail(f'Missing {rel}'); return {}
    try: return json.loads(p.read_text(encoding='utf-8'))
    except Exception as exc: fail(f'Invalid JSON in {rel}: {exc}'); return {}

site=load('config/site-release.json')
bridge=load('data/tournaments/jo-profile-bridge.json')
rankings=load('rankings.json')
clubs=load('data/identity/index.json').get('clubs',{})

if site.get('version')!='7.52.13': fail('site version must be 7.52.13')
for key in ('joProfileRelease','teamProfileRelease','clubProfileRelease','joResultsRelease','tournamentUIRelease'):
    if site.get(key)!='7.52.13': fail(f'{key} must be 7.52.13')
if site.get('rankingDataRelease')!='7.52.13': fail('rankingDataRelease must be 7.52.13')
if len(rankings)!=724: fail(f'expected 724 rankings, found {len(rankings)}')
if bridge.get('release')!='7.52.13': fail('JO profile bridge release must be 7.52.13')
if bridge.get('counts',{}).get('profiles',0)<880: fail('JO profile coverage regressed')
if bridge.get('counts',{}).get('tournamentOnlyProfiles',0)<590: fail('tournament-only JO profile coverage regressed')

kern=bridge.get('clubs',{}).get('club-kern-premier',{})
if kern.get('teamCount')!=5: fail('Kern Premier must show five JO teams')
expected={
 'kern-premier-12u-boys':('12U Boys','Championship','Gold','3-4',41,17,'ranked'),
 'kern-premier-14u-boys':('14U Boys','Classic','Silver','5-4',16,16,'ranked'),
 'kern-premier-16u-boys':('16U Boys','Championship','Gold','3-5',36,12,'ranked'),
 'kern-premier-18u-boys':('18U Boys','Invitational','Copper','See completed 18U Invite results',9,9,'tournament_only'),
 'kern-premier-18u-girls':('18U Girls','Classic','Gold','2-5',28,4,'ranked'),
}
for slug,values in expected.items():
    p=bridge.get('teams',{}).get(slug)
    if not p: fail(f'missing {slug}'); continue
    actual=(p.get('group'),p.get('division'),p.get('subdivision'),p.get('record'),p.get('divisionPlace'),p.get('subdivisionPlace'),p.get('profileType'))
    if actual!=values: fail(f'{slug} mismatch: {actual}')
    if p.get('canonicalClubId')!='club-kern-premier': fail(f'{slug} club identity is wrong')
    if values[-1]=='ranked' and not p.get('canonicalTeamId'): fail(f'{slug} must resolve to a ranked team')
    if values[-1]=='tournament_only' and p.get('canonicalTeamId') is not None: fail(f'{slug} must remain JO-only')
    if p.get('logo')!='assets/logos/canonical/kern-premier.webp': fail(f'{slug} logo is wrong')
    for token in ('team=Kern+Premier','focus=journey','#team-explorer'):
        if token not in str(p.get('journeyUrl') or ''): fail(f'{slug} journey missing {token}')

skip=bridge.get('clubs',{}).get('club-skip',{})
if skip.get('teamCount')!=1 or skip.get('teams',[{}])[0].get('profileType')!='ranked': fail('SKIP must have one ranked 18U Girls JO profile')

kern_identity=clubs.get('club-kern-premier',{}); kearns=clubs.get('club-kearns',{}); skip_identity=clubs.get('club-skip',{})
if kern_identity.get('state')!='CA' or kern_identity.get('region')!='Central Valley': fail('Kern Premier location is incorrect')
if kearns.get('state')!='UT' or kearns.get('slug')!='kearns': fail('Kearns must remain Utah')
if len({kern_identity.get('id'),kearns.get('id'),skip_identity.get('id')})!=3: fail('Kern Premier, Kearns, and SKIP are not distinct')

html_requirements={
 'team.html':['css/jo-profile-bridge-v7-52-11.css?v=7.52.13','data/tournaments/jo-profile-runtime.js?v=7.52.13','js/team-profile-v7-42.js?v=7.52.13'],
 'club.html':['css/jo-profile-bridge-v7-52-11.css?v=7.52.13','data/tournaments/jo-profile-runtime.js?v=7.52.13','js/club-intelligence-v7-26.js?v=7.52.13'],
 'tournaments.html':['data/tournaments/jo-profile-runtime.js?v=7.52.13','js/jo-results-browser-v7-52-1.js?v=7.52.13'],
}
for rel,tokens in html_requirements.items():
    text=(ROOT/rel).read_text(encoding='utf-8')
    positions=[]
    for token in tokens:
        pos=text.find(token); positions.append(pos)
        if pos<0: fail(f'{rel} missing {token}')
    if rel!='team.html' and len(positions)>=2 and positions[-2]>=positions[-1]: fail(f'{rel} loads profile runtime after consumer')

for rel,tokens in {
 'js/team-profile-v7-42.js':['findJoProfile','renderJoOnlyTeamProfile','View complete JO game journey'],
 'js/club-intelligence-v7-26.js':['connectedTeams','renderJoClubProfile','Teams and final results'],
 'js/jo-results-browser-v7-52-1.js':['window.WPI_JO_PROFILES','joProfiles.lookup','joProfile.teamPage'],
}.items():
    text=(ROOT/rel).read_text(encoding='utf-8')
    for token in tokens:
        if token not in text: fail(f'{rel} missing {token}')
    result=subprocess.run(['node','--check',str(ROOT/rel)],capture_output=True,text=True)
    if result.returncode: fail(f'JavaScript syntax error in {rel}: {result.stderr.strip()}')

runtime=ROOT/'data/tournaments/jo-profile-runtime.js'
if not runtime.exists() or runtime.stat().st_size<1000 or not runtime.read_text(encoding='utf-8').startswith('window.WPI_JO_PROFILES='):
    fail('JO profile runtime is missing or invalid')

if errors:
    print('JO PROFILE BRIDGE 7.52.13 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('JO PROFILE BRIDGE 7.52.13 TESTS PASSED')
print(' - Four Kern Premier JO profiles are ranked and 18U Boys remains tournament-only')
print(' - SKIP resolves to its distinct ranked 18U Girls team')
print(' - Team, club, and tournament pages load the corrected profile runtime')
