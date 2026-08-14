#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
errors=[]
def fail(msg): errors.append(msg)
def load(path): return json.loads((ROOT/path).read_text(encoding='utf-8'))

site=load('config/site-release.json')
release=load('data/club-logo-release-7.52.10.json')
clubs=load('club-registry.json')
public=load('clubs.json')
rankings=load('rankings.json')
registry=load('data/logo-registry.json').get('logos',{})

if site.get('version') not in {'7.52.6','7.52.7','7.52.8','7.52.9','7.52.10','7.52.11','7.52.12','7.52.13','7.52.14','7.52.15','7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8'}: fail('site release must preserve the club logo expansion')
if site.get('clubLogoCompletionRelease') not in {'7.52.6','7.52.7','7.52.8','7.52.9','7.52.10','7.52.11','7.52.12','7.52.13','7.52.14','7.52.15'}: fail('clubLogoCompletionRelease must preserve the verified logo expansion')
if site.get('logoLibraryRelease') not in {'7.52.6','7.52.7','7.52.8','7.52.9','7.52.10','7.52.11','7.52.12','7.52.13','7.52.14','7.52.15'}: fail('logoLibraryRelease must preserve the verified logo expansion')
if site.get('rankingDataRelease')!='7.52.13': fail('rankingDataRelease must be 7.52.13')
if len(clubs)!=182: fail(f'expected 182 clubs, found {len(clubs)}')
if len(rankings)!=724: fail(f'expected 724 rankings, found {len(rankings)}')

counts=Counter(c.get('logoStatus') for c in clubs)
if counts.get('verified_by_user')!=135: fail(f"expected 135 verified logos, found {counts.get('verified_by_user')}")
if counts.get('placeholder')!=42: fail(f"expected 42 provisional artworks, found {counts.get('placeholder')}")
if counts.get('fallback')!=5: fail(f"expected 5 generic fallbacks, found {counts.get('fallback')}")

expected_generic={'99-alliance','atherton','atwater','hawaiian-islands','ypro'}
actual_generic={c['slug'] for c in clubs if c.get('logoStatus')=='fallback'}
if actual_generic!=expected_generic: fail(f'generic fallback set differs: {sorted(actual_generic)}')

verified=set(release.get('directUserSuppliedLogos',[])) | set(release.get('sharedIdentityArtwork',{}))
if len(release.get('directUserSuppliedLogos',[]))!=62: fail('release must contain 62 direct logos')
if len(release.get('sharedIdentityArtwork',{}))!=4: fail('release must contain four shared mappings')
if len(verified)!=66: fail(f'expected 66 updated club entries, found {len(verified)}')

by_slug={c['slug']:c for c in clubs}
public_by_slug={c['slug']:c for c in public}
compatibility_aliases={'vnited':'visalia-united'}
for slug in sorted(verified):
    canonical_slug=compatibility_aliases.get(slug,slug)
    expected=f'assets/logos/canonical/{canonical_slug}.webp'
    asset=ROOT/expected
    if not asset.exists() or asset.stat().st_size<100: fail(f'missing/empty logo {slug}')
    else:
        try:
            im=Image.open(asset)
            if im.format!='WEBP': fail(f'{slug} is not WebP')
            if im.size!=(512,512): fail(f'{slug} must be 512x512, found {im.size}')
        except Exception as exc: fail(f'invalid image {slug}: {exc}')
    if registry.get(slug)!=expected: fail(f'logo registry mismatch {slug}')
    club=by_slug.get(canonical_slug)
    if not club: fail(f'missing club record {canonical_slug}'); continue
    if club.get('logo')!=expected or club.get('logoStatus')!='verified_by_user': fail(f'club registry mismatch {slug}')
    if public_by_slug.get(canonical_slug,{}).get('logo')!=expected: fail(f'clubs.json mismatch {slug}')
    page=ROOT/'club'/f'{canonical_slug}.html'
    if not page.exists(): fail(f'missing club page {slug}')
    elif f'../{expected}' not in page.read_text(encoding='utf-8'): fail(f'club page logo mismatch {slug}')

for alias, source in release.get('sharedIdentityArtwork',{}).items():
    a=ROOT/'assets/logos/canonical'/f'{alias}.webp'
    b=ROOT/'assets/logos/canonical'/f'{source}.webp'
    if a.exists() and b.exists() and a.read_bytes()!=b.read_bytes(): fail(f'shared artwork differs {alias}/{source}')

for row in rankings:
    slug=row.get('clubSlug')
    if slug in verified and row.get('logo')!=f'assets/logos/canonical/{compatibility_aliases.get(slug,slug)}.webp': fail(f"ranking logo mismatch {row.get('team')}")
    if slug in expected_generic and row.get('logo')!='assets/logos/cpi-logo-fallback.svg': fail(f"generic club no longer uses fallback: {row.get('team')}")

# Browser exports must match source JSON.
vars={}
for line in (ROOT/'data.js').read_text(encoding='utf-8').splitlines():
    m=re.match(r'window\.(CPI_[A-Z_]+) = (.*);$',line)
    if m: vars[m.group(1)]=json.loads(m.group(2))
if vars.get('CPI_RANKINGS')!=rankings: fail('data.js rankings differ from rankings.json')
if vars.get('CPI_CLUBS')!=public: fail('data.js clubs differ from clubs.json')
platform=vars.get('CPI_PLATFORM',{})
if platform.get('brandingStatus',{}).get('verifiedLogoCount')!=135: fail('platform verified logo count is not 135')

canonical=[{'group':r.get('group'),'rank':r.get('postRank'),'cpi':r.get('postCPI')} for r in rankings]
rank_hash=hashlib.sha256(json.dumps(canonical,sort_keys=True,separators=(',',':')).encode()).hexdigest()
if rank_hash!='e18d2cd2855c174311fcc7cd7d507afa1e22f37f68bfb21765a58cd8f035cbdb': fail('ranking/WPI integrity hash changed')

if errors:
    print('CLUB LOGO 7.52.6 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('CLUB LOGO 7.52.6 TESTS PASSED')
print(' - 62 user-supplied logos and four shared-artwork mappings are synchronized')
print(' - 135 unique clubs now use user-verified artwork; five intentionally remain generic')
print(' - 724 ranking positions and WPI values remain unchanged')
