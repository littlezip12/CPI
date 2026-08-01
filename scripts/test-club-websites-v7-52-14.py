#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
errors=[]
def fail(msg): errors.append(msg)
def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))

site=load('config/site-release.json')
clubs=load('clubs.json')
registry=load('club-registry.json')
rankings=load('rankings.json')
identity=load('data/identity/clubs.json')
index=load('data/identity/index.json')
audit=load('data/club-website-audit-7.52.14.json')
intel=load('data/club-intelligence.json').get('clubs',{})

if site.get('version') not in {'7.52.14','7.52.15','7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13'}: fail('site version must preserve the 7.52.14 website release')
if site.get('clubWebsiteRelease')!='7.52.14': fail('clubWebsiteRelease must be 7.52.14')
if len(clubs)!=182 or len(registry)!=182 or len(identity)!=182: fail('canonical club count must remain 182')
summary=audit.get('summary',{})
expected={'totalClubs':182,'websitePresent':42,'verifiedOfficial':15,'presentUnverified':27,'missing':140,'needsIdentityReview':5}
if summary!=expected: fail(f'website audit summary differs: {summary}')

verified=set(audit.get('verifiedThisRelease',[]))
if len(verified)!=15: fail('exactly 15 official websites must be verified in wave 1')
by_slug={c.get('slug'):c for c in clubs}
reg_by={c.get('slug'):c for c in registry}
id_by={c.get('slug'):c for c in identity}

for slug in sorted(verified):
    club=by_slug.get(slug)
    if not club: fail(f'missing verified club {slug}'); continue
    url=club.get('website','')
    parsed=urlparse(url)
    if parsed.scheme!='https' or not parsed.netloc: fail(f'invalid verified URL for {slug}: {url}')
    if club.get('websiteStatus')!='verified_official': fail(f'{slug} is not marked verified_official')
    if club.get('websiteVerifiedAt')!='2026-07-27': fail(f'{slug} verification date is incorrect')
    for label,row in [('club-registry',reg_by.get(slug,{})),('identity',id_by.get(slug,{})),('identity-index',index.get('clubs',{}).get(f'club-{slug}',{})),('club-intelligence',intel.get(slug,{}) )]:
        if row.get('website')!=url: fail(f'{slug} website mismatch in {label}')
        if row.get('websiteStatus')!='verified_official': fail(f'{slug} status mismatch in {label}')
    page=ROOT/'club'/f'{slug}.html'
    if not page.exists(): fail(f'missing static club page {slug}')
    else:
        text=page.read_text(encoding='utf-8')
        if url not in text or 'Official Club Website' not in text: fail(f'{slug} static page lacks official website link')
        if 'target="_blank"' not in text or 'rel="noopener"' not in text: fail(f'{slug} static website link lacks safe external-link attributes')

for row in rankings:
    club=by_slug.get(row.get('clubSlug'))
    if not club: continue
    if row.get('website')!=club.get('website'): fail(f"ranking website mismatch: {row.get('group')} / {row.get('team')}")
    if row.get('websiteStatus')!=club.get('websiteStatus'): fail(f"ranking website status mismatch: {row.get('group')} / {row.get('team')}")

# Browser exports must match source JSON.
vars={}
for line in (ROOT/'data.js').read_text(encoding='utf-8').splitlines():
    m=re.match(r'window\.(CPI_[A-Z_]+) = (.*);$',line)
    if m: vars[m.group(1)]=json.loads(m.group(2))
if vars.get('CPI_CLUBS')!=clubs: fail('data.js clubs differ from clubs.json')
if vars.get('CPI_RANKINGS')!=rankings: fail('data.js rankings differ from rankings.json')
coverage=vars.get('CPI_PLATFORM',{}).get('clubWebsiteCoverage',{})
if coverage.get('websitePresent')!=42 or coverage.get('missing')!=140: fail('browser platform website coverage is incorrect')

for rel in ['index.html','clubs.html','club.html','team.html','rankings.html','tournaments.html','12u-boys.html','12u-girls.html','14u-boys.html','14u-girls.html','16u-boys.html','16u-girls.html','18u-boys.html','18u-girls.html']:
    if 'data.js?v=7.53.4' not in (ROOT/rel).read_text(encoding='utf-8'):
        fail(f'{rel} does not cache-bust the club website data release')

for slug in ['foothill','ciu','cdm','thunder','brooklyn-hustle']:
    club=by_slug.get(slug,{})
    if club.get('websiteStatus')!='needs_verification': fail(f'{slug} must remain flagged for verification')
    if club.get('website'): fail(f'{slug} received an unverified website')

if errors:
    print('CLUB WEBSITE 7.52.14 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('CLUB WEBSITE 7.52.14 TESTS PASSED')
print(' - 15 official club websites are verified and synchronized across every profile/data surface')
print(' - 42 of 182 clubs now have website links; 140 remain in the explicit audit queue')
print(' - Ambiguous club families remain unlinked until identity verification is complete')
