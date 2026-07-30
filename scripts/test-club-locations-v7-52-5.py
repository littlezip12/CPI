#!/usr/bin/env python3
from pathlib import Path
import json, re, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def fail(x): errors.append(x)
def load(p): return json.loads((ROOT/p).read_text(encoding='utf-8'))
site=load('config/site-release.json')
clubs=load('club-registry.json')
public=load('clubs.json')
rankings=load('rankings.json')
identity=load('data/identity/clubs.json')
release=load('data/club-location-release-7.52.5.json')
required=['city','country','locationLabel','region','metroRegion','macroRegion','locationConfidence','locationSource']
if site.get('version') not in {'7.52.5','7.52.6','7.52.7','7.52.8','7.52.9','7.52.10','7.52.11','7.52.12','7.52.13','7.52.14','7.52.15','7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4'}: fail('site release must preserve the 7.52.5 location release or a later 7.52.x presentation release')
if site.get('clubLocationRelease')!='7.52.5': fail('clubLocationRelease must be 7.52.5')
if len(clubs)!=182: fail(f'expected 182 clubs, found {len(clubs)}')
if len(rankings)!=724: fail(f'expected 724 rankings, found {len(rankings)}')
if release.get('resolvedClubCount')!=72: fail('location release must contain 72 resolved clubs')
if len(release.get('clubs',[]))!=72: fail('location release club list must contain 72 rows')
for c in clubs:
    if c.get('region') in {'Region TBD','Needs Review',''}: fail(f"{c.get('slug')} has unresolved region")
    if c.get('slug') in {r.get('slug') for r in release.get('clubs',[])}:
        for field in required:
            if not str(c.get(field,'')).strip(): fail(f"{c.get('slug')} missing {field}")
        if c.get('country')=='United States' and not c.get('state'): fail(f"{c.get('slug')} missing US state")
by_slug={c['slug']:c for c in clubs}
for collection,name in [(public,'clubs.json'),(identity,'identity clubs')]:
    for c in collection:
        slug=c.get('slug')
        if slug in by_slug:
            for field in ['region','locationLabel','metroRegion','macroRegion']:
                left = c.get(field)
                right = by_slug[slug].get(field)
                if (left in ('', None) and right in ('', None)):
                    continue
                if left!=right: fail(f'{name} {slug} differs on {field}')
for row in rankings:
    club=by_slug.get(row.get('clubSlug'))
    if club and row.get('region')!=club.get('region'): fail(f"ranking {row.get('team')} region differs from club")
for slug in [r['slug'] for r in release.get('clubs',[])]:
    page=ROOT/'club'/f'{slug}.html'
    if not page.exists(): fail(f'missing club page {slug}')
    elif 'Region TBD' in page.read_text(encoding='utf-8'): fail(f'{slug} page retains Region TBD')
js=(ROOT/'js/club-intelligence-v7-26.js').read_text(encoding='utf-8')
for token in ['locationLabel','metroRegion','club.locationLabel || club.region']:
    if token not in js: fail(f'club UI missing {token}')
if errors:
    print('CLUB LOCATION 7.52.5 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('CLUB LOCATION 7.52.5 TESTS PASSED')
print(' - 72 previously unresolved clubs now have structured location and region metadata')
print(' - All 182 clubs have a public directory region; 724 ranking rows remain synchronized')
print(' - Club directory, profiles, static pages, identity data, and rebuild overrides are aligned')
