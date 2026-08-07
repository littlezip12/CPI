#!/usr/bin/env python3
from __future__ import annotations
import json
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def fail(msg): errors.append(msg)
def load(path): return json.loads((ROOT/path).read_text(encoding='utf-8'))

rankings=load('rankings.json')
approved=load('data/ranking-releases/girls-post-jo-2026-approved.json')
audit=load('qa/girls-post-jo-2026-ranking-audit.json')
site=load('config/site-release.json')
groups=['12U Girls','14U Girls','16U Girls','18U Girls']
expected={'12U Girls':52,'14U Girls':87,'16U Girls':93,'18U Girls':92}

if site.get('version') not in {'7.52.2','7.52.3','7.52.4','7.52.5','7.52.6','7.52.7','7.52.8','7.52.9','7.52.10','7.52.11','7.52.12','7.52.13','7.52.14','7.52.15','7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9'}: fail('site release must preserve the 7.52.2 Girls ranking release or a later 7.52.x presentation release')
if site.get('rankingDataRelease')!='7.52.13': fail('rankingDataRelease must include the Kern Premier identity correction')
if site.get('girlsPostJORankingRelease')!='7.52.13': fail('girlsPostJORankingRelease must include the Kern Premier identity correction')
if audit.get('approvedTeams')!=324: fail('audit must report 324 approved Girls teams')

for group in groups:
    rows=sorted([r for r in rankings if r.get('group')==group],key=lambda r:r.get('postRank',999))
    count=expected[group]
    if len(rows)!=count: fail(f'{group} must publish {count} teams, found {len(rows)}')
    if [r.get('postRank') for r in rows]!=list(range(1,count+1)): fail(f'{group} ranks are not contiguous')
    approved_rows=approved.get('ages',{}).get(group,[])
    if len(approved_rows)!=count: fail(f'{group} approved source must contain {count} rows')
    for row in rows:
        if row.get('latestTournament')!='Junior Olympics': fail(f"{group} #{row.get('postRank')} is not marked Junior Olympics")
        if row.get('joDivision') not in {'Championship','Classic'}: fail(f"{group} #{row.get('postRank')} has invalid JO division")
        if not row.get('joSubdivision'): fail(f"{group} #{row.get('postRank')} missing JO subdivision")
        if abs(int(row.get('postRank'))-int(row.get('joDerivedRank'))) > 1: fail(f"{group} {row.get('team')} is more than one spot from JO-derived rank")
        if 'coed' in str(row.get('group','')).lower() or '10u' in str(row.get('group','')).lower(): fail('10U/coed must not be included in Girls ranking groups')

    by_club=defaultdict(list)
    for row in rows: by_club[row.get('clubSlug')].append(row)
    for slug,members in by_club.items():
        members.sort(key=lambda r:r['postRank'])
        depths=[int(r.get('teamDepth') or 1) for r in members]
        if depths!=list(range(1,len(members)+1)): fail(f'{group} {slug} depth order is not sequential: {depths}')
        if len(members)>1:
            for r in members:
                suffix={1:'A',2:'B',3:'C',4:'D'}.get(int(r.get('teamDepth') or 1),str(r.get('teamDepth')))
                if not str(r.get('team','')).endswith(' '+suffix): fail(f"{group} multi-team club label is not functional-level based: {r.get('team')}")


# Kern Premier and SKIP are distinct 18U Girls clubs.
if not any(r.get('group')=='18U Girls' and r.get('clubSlug')=='kern-premier' and r.get('postRank')==76 for r in rankings): fail('18U Girls #76 must be Kern Premier')
if not any(r.get('group')=='18U Girls' and r.get('clubSlug')=='skip' and r.get('postRank')==35 for r in rankings): fail('18U Girls #35 must remain SKIP')

# Boys remain untouched at 100 per age.
for group in ['12U Boys','14U Boys','16U Boys','18U Boys']:
    rows=[r for r in rankings if r.get('group')==group]
    if len(rows)!=100: fail(f'{group} must remain at 100 teams')

if any(r.get('group') in {'10U Girls','12U Coed'} for r in rankings): fail('10U Girls and coed rankings must remain excluded')
if any(r.get('clubSlug')=='shore-aquatics' for r in rankings): fail('Shore Aquatics must consolidate into long-beach-shore')

line=next((x for x in (ROOT/'data.js').read_text(encoding='utf-8').splitlines() if x.startswith('window.CPI_RANKINGS = ')),None)
if not line: fail('data.js is missing CPI_RANKINGS')
else:
    browser=json.loads(line[len('window.CPI_RANKINGS = '):-1])
    if browser!=rankings: fail('data.js CPI_RANKINGS does not match rankings.json')

for path in ['index.html','rankings.html','12u-girls.html','14u-girls.html','16u-girls.html','18u-girls.html']:
    text=(ROOT/path).read_text(encoding='utf-8')
    if 'data.js?v=7.55.1' not in text: fail(f'{path} does not cache-bust the Girls ranking release')
home=(ROOT/'index.html').read_text(encoding='utf-8').lower()
if 'boys/girls' not in home and 'boys and girls' not in home and 'post-junior olympics rankings' not in home: fail('homepage does not announce Boys and Girls post-JO rankings')

if errors:
    print('GIRLS POST-JO RANKING TESTS FAILED')
    for e in errors: print(' - '+e)
    raise SystemExit(1)
print('GIRLS POST-JO RANKING TESTS PASSED')
print(' - 324 approved all-girls JO entrants published across 12U, 14U, 16U and 18U')
print(' - 10U and coed remain excluded, while Boys top-100 rankings remain unchanged')
print(' - Division/subdivision guardrails, functional club depth, browser data and cache busting are synchronized')
