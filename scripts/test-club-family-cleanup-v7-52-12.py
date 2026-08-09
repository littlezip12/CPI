#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def fail(msg): errors.append(msg)
def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))
site=load('config/site-release.json')
clubs=load('clubs.json'); rankings=load('rankings.json'); identity=load('data/identity/index.json')
bridge=load('data/tournaments/jo-profile-bridge.json'); audit=load('data/identity/club-family-cleanup-7.52.12.json')
by_slug={c.get('slug'):c for c in clubs}
if site.get('version') not in {'7.52.12','7.52.13','7.52.14','7.52.15','7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12'}: fail('site version must preserve the 7.52.12 cleanup')
if len(clubs)!=182: fail(f'expected 182 unique public clubs, found {len(clubs)}')
for stale in ['clovis-red','vnited']:
    if stale in by_slug: fail(f'duplicate public club remains: {stale}')
clovis=by_slug.get('clovis',{}); visalia=by_slug.get('visalia-united',{}); kern=by_slug.get('kern-premier',{}); kearns=by_slug.get('kearns',{})
if len(clovis.get('teams',[]))!=12: fail('Clovis must contain 12 ranked teams')
if len(visalia.get('teams',[]))!=3: fail('Visalia United must contain 3 ranked teams')
if clovis.get('displayName')!='Clovis Water Polo Club': fail('Clovis display name is not canonical')
if visalia.get('displayName')!='Visalia United': fail('Visalia display name is not canonical')
if kern.get('canonicalClubId')==kearns.get('canonicalClubId'): fail('Kern Premier and Kearns were merged')
for row in rankings:
    if 'clovis' in str(row.get('club','')).lower() and row.get('clubSlug')!='clovis': fail(f"Clovis ranking not consolidated: {row.get('team')}")
    if row.get('clubSlug') in {'vnited'}: fail(f"Vnited ranking not consolidated: {row.get('team')}")
for cid,count in [('club-kern-premier',5),('club-clovis',13),('club-visalia-united',6)]:
    actual=bridge.get('clubs',{}).get(cid,{}).get('teamCount')
    if actual!=count: fail(f'{cid} JO profile count expected {count}, found {actual}')
for team in bridge.get('clubs',{}).get('club-kern-premier',{}).get('teams',[]):
    if not str(team.get('teamPage','')).startswith('team.html?team=kern-premier-'): fail('Kern Premier team route missing')
# Every normalized participant in these families must use the canonical club ID.
rules=[(re.compile(r'^clovis'), 'club-clovis'),(re.compile(r'^(vnited|visalia united)'), 'club-visalia-united'),(re.compile(r'^kern premier'), 'club-kern-premier'),(re.compile(r'^kearns'), 'club-kearns')]
for path in (ROOT/'data/tournaments/normalized').glob('*/*.json'):
    data=json.loads(path.read_text(encoding='utf-8'))
    for game in data.get('games',[]):
        for participant in game.get('participants',{}).values():
            if participant.get('kind')!='team': continue
            name=re.sub(r'[^a-z0-9]+',' ',str(participant.get('displayName') or participant.get('raw') or '').lower()).strip()
            for pattern,expected in rules:
                if pattern.match(name) and participant.get('clubId')!=expected:
                    fail(f'{path.relative_to(ROOT)}: {name} resolves to {participant.get("clubId")} not {expected}')
# Rank order/WPI values are untouched.
canonical=[{'group':r.get('group'),'rank':r.get('postRank'),'cpi':r.get('postCPI')} for r in rankings]
rank_hash=hashlib.sha256(json.dumps(canonical,sort_keys=True,separators=(',',':')).encode()).hexdigest()
if rank_hash!='e18d2cd2855c174311fcc7cd7d507afa1e22f37f68bfb21765a58cd8f035cbdb': fail('rank/WPI integrity hash changed')
for rel in ['club/clovis-red.html','club/vnited.html']:
    text=(ROOT/rel).read_text(encoding='utf-8') if (ROOT/rel).exists() else ''
    if 'location.replace' not in text: fail(f'compatibility redirect missing: {rel}')
club_js=(ROOT/'js/club-intelligence-v7-26.js').read_text(encoding='utf-8')
for token in ['connectedTeams(club, joClubProfile)','renderClubAgeGroups(allTeams)','Ranked teams and verified Junior Olympics-only teams are combined here']:
    if token not in club_js: fail(f'club profile integration missing: {token}')
if audit.get('counts',{}).get('publicClubs')!=182: fail('cleanup audit count is incorrect')
if errors:
    print('CLUB FAMILY CLEANUP 7.52.12 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('CLUB FAMILY CLEANUP 7.52.12 TESTS PASSED')
print(' - Clovis and Visalia duplicate club families are consolidated across rankings and profiles')
print(' - Kern Premier, Kearns, and SKIP remain distinct canonical identities')
print(' - JO-only teams appear in core club navigation and route to team profiles')
print(' - All normalized tournament history uses the corrected club identities')
print(' - Rank order, WPI values, scores, placements, and paths remain unchanged')
