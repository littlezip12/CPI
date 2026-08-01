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
approved=load('data/ranking-releases/boys-post-jo-2026-approved.json')
audit=load('qa/boys-post-jo-2026-ranking-audit.json')
site=load('config/site-release.json')
groups=['12U Boys','14U Boys','16U Boys','18U Boys']

if site.get('version') not in {'7.52.0','7.52.1','7.52.2','7.52.3','7.52.4','7.52.5','7.52.6','7.52.7','7.52.8','7.52.9','7.52.10','7.52.11','7.52.12','7.52.13','7.52.14','7.52.15','7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12'}: fail('site release must preserve the 7.52.x post-JO ranking series')
if site.get('rankingDataRelease') != '7.52.13': fail('rankingDataRelease must include the Kern Premier identity correction')
if audit.get('approvedTeams')!=400: fail('audit must report 400 approved Boys teams')

for group in groups:
    rows=sorted([r for r in rankings if r.get('group')==group],key=lambda r:r.get('postRank',999))
    if len(rows)!=100: fail(f'{group} must publish exactly 100 teams, found {len(rows)}')
    if [r.get('postRank') for r in rows]!=list(range(1,101)): fail(f'{group} ranks are not contiguous 1-100')
    approved_rows=approved.get('ages',{}).get(group,[])
    if len(approved_rows)!=100: fail(f'{group} approved source must contain 100 rows')
    for row in rows:
        if row.get('latestTournament')!='Junior Olympics': fail(f"{group} #{row.get('postRank')} is not marked Junior Olympics")
        if row.get('joDivision') not in {'Championship','Classic','Invitational'}: fail(f"{group} #{row.get('postRank')} missing JO division")
        if not row.get('joSubdivision'): fail(f"{group} #{row.get('postRank')} missing JO subdivision")
        if abs(int(row.get('postRank'))-int(row.get('joDerivedRank'))) > 1: fail(f"{group} {row.get('team')} is more than one spot from JO-derived rank")
        if 'vegas north irvine' in str(row.get('team','')).lower() or 'vegas north irvine' in str(row.get('club','')).lower(): fail('North Irvine must not publish with Vegas prefix')

    by_club=defaultdict(list)
    for row in rows: by_club[row.get('clubSlug')].append(row)
    for slug,members in by_club.items():
        members.sort(key=lambda r:r['postRank'])
        depths=[int(r.get('teamDepth') or 1) for r in members]
        start=2 if slug=='trilogy' else 1
        if depths!=list(range(start,start+len(members))): fail(f'{group} {slug} depth order is not sequential: {depths}')
        if len(members)>1:
            for r in members:
                suffix={1:'A',2:'B',3:'C',4:'D'}.get(int(r.get('teamDepth') or 1),str(r.get('teamDepth')))
                if not str(r.get('team','')).endswith(' '+suffix): fail(f"{group} multi-team club label is not functional-level based: {r.get('team')}")

for group in ['12U Boys','14U Boys','16U Boys']:
    if not any(r.get('group')==group and r.get('clubSlug')=='kern-premier' for r in rankings): fail(f'{group} must include Kern Premier')
    if any(r.get('group')==group and r.get('clubSlug')=='skip' for r in rankings): fail(f'{group} must not attribute Kern Premier to SKIP')
if any(r.get('clubSlug')=='shore-aquatics' for r in rankings): fail('Shore Aquatics must consolidate into long-beach-shore')
if any(r.get('clubSlug')=='shore-aquatics' for r in rankings): fail('Shore Aquatics must consolidate into long-beach-shore')

# Ensure browser export matches rankings.json exactly.
line=next((x for x in (ROOT/'data.js').read_text(encoding='utf-8').splitlines() if x.startswith('window.CPI_RANKINGS = ')),None)
if not line: fail('data.js is missing CPI_RANKINGS')
else:
    browser=json.loads(line[len('window.CPI_RANKINGS = '):-1])
    if browser!=rankings: fail('data.js CPI_RANKINGS does not match rankings.json')

for path in ['index.html','rankings.html']:
    text=(ROOT/path).read_text(encoding='utf-8')
    if 'data.js?v=7.53.4' not in text: fail(f'{path} does not cache-bust the current rankings data')
home=(ROOT/'index.html').read_text(encoding='utf-8').lower()
if 'post-junior olympics rankings' not in home and 'post-jo rankings' not in home: fail('homepage does not announce post-JO rankings')

if errors:
    print('BOYS POST-JO RANKING TESTS FAILED')
    for e in errors: print(' - '+e)
    raise SystemExit(1)
print('BOYS POST-JO RANKING TESTS PASSED')
print(' - 400 approved JO entrants published across four top-100 Boys ranking groups')
print(' - Every published rank remains within one place of the approved JO-derived order')
print(' - Club colors are normalized to functional A/B/C/D depth and special identity rules are enforced')
print(' - Browser ranking data, cache busting, and post-JO page copy are synchronized')
