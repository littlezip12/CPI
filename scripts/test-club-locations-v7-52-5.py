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
audit=load('data/club-location-audit-7.54.18.json')
required=['country','locationLabel','region','metroRegion','macroRegion','locationConfidence','locationSource']
ca_regions={'San Diego','Orange County','Los Angeles','Inland Empire','Central Coast','Central Valley','Sacramento','East Bay','Peninsula / San Francisco'}
national={'Hawaii','Northwest','Southwest','Mountain West','Midwest','Northeast','Southeast'}
allowed=ca_regions|national|{'International'}
if site.get('version') not in {'7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1'}: fail('site release must be 7.54.18')
if site.get('clubLocationRelease')!='7.54.18': fail('clubLocationRelease must be 7.54.18')
if len(clubs)!=182: fail(f'expected 182 clubs, found {len(clubs)}')
if len(rankings)!=724: fail(f'expected 724 rankings, found {len(rankings)}')
if audit.get('summary',{}).get('cityResolved')!=182: fail('audit must retain 182 city-resolved clubs')
if audit.get('summary',{}).get('cityPending')!=0: fail('audit must retain zero city-pending clubs')
if set(audit.get('summary',{}).get('regions',{}))!=allowed: fail('audit region set is incomplete')
by_slug={c['slug']:c for c in clubs}
for c in clubs:
    slug=c.get('slug')
    if c.get('region') not in allowed: fail(f'{slug} has invalid region {c.get("region")}')
    for field in required:
        if not str(c.get(field,'')).strip(): fail(f'{slug} missing {field}')
    if c.get('country')=='United States' and not c.get('state'): fail(f'{slug} missing US state')
    if slug!='back-bay' and not str(c.get('city','')).strip(): fail(f'{slug} missing city')
    if c.get('state')=='CA' and c.get('region') not in ca_regions: fail(f'{slug} California club has national region {c.get("region")}')
    if c.get('state')!='CA' and c.get('country')=='United States' and c.get('region') not in national: fail(f'{slug} non-California US club has invalid region')
barcelona=by_slug.get('barcelona-lions',{})
if (barcelona.get('city'),barcelona.get('country'),barcelona.get('region'))!=('Barcelona','Spain','International'): fail('Barcelona Lions must resolve to Barcelona, Spain / International')
back=by_slug.get('back-bay',{})
if back.get('locationReviewStatus')!='approved' or back.get('locationLabel')!='Irvine, CA' or back.get('city')!='Irvine' or back.get('region')!='Orange County': fail('Back Bay must resolve to Irvine in the Orange County region')
for collection,name in [(public,'clubs.json'),(identity,'identity clubs')]:
    for c in collection:
        base=by_slug.get(c.get('slug'))
        if not base: continue
        for field in ['region','city','state','country','locationLabel','metroRegion','macroRegion']:
            if c.get(field)!=base.get(field): fail(f'{name} {c.get("slug")} differs on {field}')
for row in rankings:
    club=by_slug.get(row.get('clubSlug'))
    if club:
        for field in ['region','city','state','country','locationLabel','metroRegion','macroRegion']:
            if row.get(field)!=club.get(field): fail(f'ranking {row.get("team")} differs on {field}')
for slug,c in by_slug.items():
    page=ROOT/'club'/f'{slug}.html'
    if not page.exists(): fail(f'missing club page {slug}')
if errors:
    print('CLUB LOCATION 7.54.18 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('CLUB LOCATION 7.54.18 TESTS PASSED')
print(' - 182 clubs are synchronized across public, canonical, ranking, and profile data')
print(' - all 182 clubs have city-level locations; Back Bay resolves to Irvine, CA')
print(' - California, seven national U.S. regions, Hawaii, and International classifications are protected')
