#!/usr/bin/env python3
from __future__ import annotations
import json, re, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def fail(msg): errors.append(msg)
def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))

def norm(v): return re.sub(r'\s+',' ',re.sub(r'[^a-z0-9]+',' ',str(v or '').lower())).strip()

site=load('config/site-release.json')
rankings=load('rankings.json')
clubs=load('clubs.json')
identity=load('data/identity/index.json')
bridge=load('data/tournaments/jo-profile-bridge.json')
audit=load('data/identity/kern-skip-separation-7.52.13.json')
participants=load('data/tournaments/identity/participants.json').get('participants',[])

if site.get('version') not in {'7.52.13','7.52.14','7.52.15','7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10'}: fail('site version must be 7.52.13')
for key in ['rankingDataRelease','identityRelease','joProfileRelease']:
    if site.get(key)!='7.52.13': fail(f'{key} must be 7.52.13')
if site.get('teamProfileRelease') not in {'7.52.13','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10'}: fail('teamProfileRelease must preserve Kern/SKIP separation')
if site.get('clubProfileRelease') not in {'7.52.13','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10'}: fail('clubProfileRelease must preserve Kern/SKIP profile separation')
if site.get('joResultsRelease')!='7.52.15': fail('joResultsRelease must be 7.52.15')
if len(rankings)!=724: fail(f'expected 724 ranking rows, found {len(rankings)}')
if len({c.get('slug') for c in clubs})!=len(clubs): fail('public club slugs are not unique')

expected={
 ('12U Boys',41):('kern-premier-12u-boys','3-4'),
 ('14U Boys',64):('kern-premier-14u-boys','5-4'),
 ('16U Boys',36):('kern-premier-16u-boys','3-5'),
 ('18U Girls',76):('kern-premier-18u-girls','2-5'),
}
for key,(slug,record) in expected.items():
    row=next((r for r in rankings if (r.get('group'),r.get('postRank'))==key),None)
    if not row: fail(f'missing ranking slot {key}'); continue
    if row.get('clubSlug')!='kern-premier' or row.get('team')!='Kern Premier' or row.get('slug')!=slug: fail(f'{key} is not Kern Premier: {row.get("team")}/{row.get("clubSlug")}/{row.get("slug")}')
    if row.get('latestTournamentRecord')!=record: fail(f'{key} record changed')
    if row.get('logo')!='assets/logos/canonical/kern-premier.webp': fail(f'{key} logo is incorrect')
    if row.get('canonicalClubId')!='club-kern-premier' or not str(row.get('canonicalTeamId') or '').startswith('team-2026-'): fail(f'{key} canonical identity is missing')

kern14=next(r for r in rankings if r.get('slug')=='kern-premier-14u-boys')
if kern14.get('gamesTracked')!=9 or kern14.get('bestWinClean') or kern14.get('previousRank') is not None or kern14.get('preRank') is not None:
    fail('Kern Premier 14U still carries SKIP Futures evidence')

skip_rows=[r for r in rankings if r.get('clubSlug')=='skip']
if len(skip_rows)!=1 or skip_rows[0].get('group')!='18U Girls' or skip_rows[0].get('postRank')!=35 or skip_rows[0].get('team')!='SKIP':
    fail(f'true SKIP ranking is incorrect: {[(r.get("group"),r.get("postRank"),r.get("team")) for r in skip_rows]}')

by_slug={c.get('slug'):c for c in clubs}
kern=by_slug.get('kern-premier',{}); skip=by_slug.get('skip',{}); kearns=by_slug.get('kearns',{})
if (kern.get('rankedTeams'),kern.get('bestRank'),kern.get('teamCount'))!=(4,36,4): fail('Kern Premier club metrics must show four ranked teams and best rank #36')
if round(float(kern.get('averageCPI') or 0),1)!=1800.6: fail('Kern Premier average WPI is incorrect')
if (skip.get('rankedTeams'),skip.get('bestRank'),skip.get('teamCount'))!=(1,35,1): fail('SKIP club metrics must show one ranked team and best rank #35')
if kearns.get('state')!='UT' or len(kearns.get('teams',[]))!=5: fail('Kearns Utah identity or five ranked teams changed')

kern_bridge=bridge.get('clubs',{}).get('club-kern-premier',{})
if kern_bridge.get('teamCount')!=5: fail('Kern Premier must retain five JO team profiles')
ranked_profiles=[x for x in kern_bridge.get('teams',[]) if x.get('profileType')=='ranked']
only_profiles=[x for x in kern_bridge.get('teams',[]) if x.get('profileType')=='tournament_only']
if len(ranked_profiles)!=4 or [x.get('group') for x in only_profiles]!=['18U Boys']: fail('Kern Premier JO bridge must contain four ranked profiles and one JO-only 18U Boys profile')
skip_bridge=bridge.get('clubs',{}).get('club-skip',{})
if skip_bridge.get('teamCount')!=1 or skip_bridge.get('teams',[{}])[0].get('profileType')!='ranked': fail('SKIP JO profile must resolve to its one ranked 18U Girls team')

# Normalized tournament identities: Kern JOs are canonical teams; true Futures SKIP remains club-only.
for item in participants:
    name=norm(item.get('name'))
    if name=='kern premier' and item.get('group') in {'12U Boys','14U Boys','16U Boys','18U Girls'}:
        if item.get('canonicalClubId')!='club-kern-premier' or not item.get('canonicalTeamId'): fail(f'Kern participant unresolved: {item.get("group")}')
    if name=='skip' and item.get('group')=='18U Girls':
        if item.get('canonicalClubId')!='club-skip' or not item.get('canonicalTeamId'): fail('true SKIP JO participant is not ranked/canonical')

futures=load('data/tournaments/normalized/2026-boys-futures-super-finals/14u-boys-d3.json')
for game in futures.get('games',[]):
    for p in game.get('participants',{}).values():
        if p.get('kind')=='team' and norm(p.get('displayName'))=='skip':
            if p.get('clubId')!='club-skip' or p.get('teamId') is not None: fail('SKIP Futures history is still attached to a ranked Kern/old team identity')

# Old public query slugs remain aliases to corrected Kern identities.
scoped=identity.get('teamScopedAliasIndex',{})
for group,old in [('12U Boys','skip-12u-boys'),('14U Boys','skip-a'),('16U Boys','skip-16u-boys'),('18U Girls','skip-b-18u-girls')]:
    age,gender=group.split()
    key=f'2026|{age.lower()}|{gender.lower()}|{norm(old)}'
    team_id=scoped.get(key)
    if not team_id or identity.get('teams',{}).get(team_id,{}).get('clubId')!='club-kern-premier': fail(f'old route alias does not resolve to Kern Premier: {old}')

# Browser export must equal source JSON and use a fresh cache key.
line=next((x for x in (ROOT/'data.js').read_text().splitlines() if x.startswith('window.CPI_RANKINGS = ')),None)
if not line or json.loads(line[len('window.CPI_RANKINGS = '):-1])!=rankings: fail('data.js rankings do not match rankings.json')
for rel in ['index.html','rankings.html','clubs.html','club.html','team.html','tournaments.html']:
    if 'data.js?v=7.53.4' not in (ROOT/rel).read_text(): fail(f'{rel} does not load the corrected ranking data cache key')

if audit.get('rankedClubCounts',{}).get('club-kern-premier')!=4 or audit.get('rankedClubCounts',{}).get('club-skip')!=1: fail('migration audit counts are incorrect')

if errors:
    print('KERN / SKIP SEPARATION 7.52.13 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('KERN / SKIP SEPARATION 7.52.13 TESTS PASSED')
print(' - Four post-JO ranking entries resolve to Kern Premier; the true SKIP 18U Girls team remains separate')
print(' - Kern Premier club metrics show four ranked teams plus one JO-only 18U Boys team')
print(' - SKIP 14U Boys Futures history remains with SKIP and is excluded from Kern Premier evidence')
print(' - Kearns remains the separate Utah club, and old public routes resolve safely')
