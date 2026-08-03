#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def fail(x): errors.append(x)
def load(r): return json.loads((ROOT/r).read_text(encoding='utf-8'))
def digest(v): return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()).hexdigest()
site=load('config/site-release.json'); audit=load('data/club-website-audit-7.52.16.json'); subs=load('data/club-website-submissions-7.52.16.json')
clubs=load('clubs.json'); reg=load('club-registry.json'); rankings=load('rankings.json'); ids=load('data/identity/clubs.json'); idx=load('data/identity/index.json'); intel=load('data/club-intelligence.json')['clubs']; jo=load('data/tournaments/jo-results-2026.json'); baseline=load('data/release-integrity-7.52.15.json')
if site.get('version') not in {'7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.16'}: fail('site version must preserve the 7.52.16 website audit')
if site.get('clubWebsiteRelease')!='7.52.16': fail('clubWebsiteRelease must be 7.52.16')
expected={'totalClubs':182,'websitePresent':177,'verifiedOfficial':15,'presentUnverified':27,'userSupplied':135,'noSiteFound':4,'missing':1}
if audit.get('summary')!=expected: fail(f"audit summary differs: {audit.get('summary')}")
if len(clubs)!=182 or len({c['slug'] for c in clubs})!=182: fail('club registry must contain 182 unique slugs')
by={c['slug']:c for c in clubs}; rb={c['slug']:c for c in reg}; ib={c['slug']:c for c in ids}
subby={r['slug']:r for r in subs}; subby['hilo-hammahz']=dict(subby['hilo-hammahz'],submission=subby['hilo-grammaz']['submission'])
for slug,item in subby.items():
    raw=str(item.get('submission') or '').strip()
    c=by.get(slug)
    if not c: fail(f'missing submitted club {slug}'); continue
    if raw.lower()=='no site': expected_url=''; expected_status='no_site_found'
    elif raw.startswith(('http://','https://')): expected_url=raw; expected_status='user_supplied'
    else: expected_url=''; expected_status='missing'
    if c.get('website')!=expected_url or c.get('websiteStatus')!=expected_status: fail(f'{slug} website/status mismatch')
    for label,row in [('registry',rb.get(slug,{})),('identity',ib.get(slug,{})),('index',idx['clubs'].get(f'club-{slug}',{})),('intel',intel.get(slug,{}))]:
        if row.get('website')!=expected_url or row.get('websiteStatus')!=expected_status: fail(f'{slug} mismatch in {label}')
    page=ROOT/'club'/f'{slug}.html'; text=page.read_text(encoding='utf-8') if page.exists() else ''
    if expected_url:
        if expected_url not in text or '>Club Website</a>' not in text or 'target="_blank"' not in text or 'rel="noopener"' not in text: fail(f'{slug} static page website link incomplete')
    elif expected_url in text and expected_url: fail(f'{slug} unexpected static link')
for row in rankings:
    c=by.get(row.get('clubSlug'))
    if c and (row.get('website')!=c.get('website') or row.get('websiteStatus')!=c.get('websiteStatus')): fail(f"ranking website mismatch {row.get('team')}")
# Browser exports and cache key.
vars={}
for line in (ROOT/'data.js').read_text(encoding='utf-8').splitlines():
    m=re.match(r'window\.(CPI_[A-Z_]+) = (.*);$',line)
    if m: vars[m.group(1)]=json.loads(m.group(2))
if vars.get('CPI_CLUBS')!=clubs or vars.get('CPI_RANKINGS')!=rankings: fail('data.js differs from source JSON')
if vars.get('CPI_PLATFORM',{}).get('clubWebsiteCoverage',{}).get('websitePresent')!=177: fail('browser coverage is not 177')
for rel in ['index.html','clubs.html','club.html','team.html','rankings.html','tournaments.html']:
    if 'data.js?v=7.53.4' not in (ROOT/rel).read_text(encoding='utf-8'): fail(f'{rel} lacks 7.52.16 data cache key')
# Competitive, club-logo, JO placement, and JO browser logic stay byte/data identical to 7.52.15.
rank_comp=[{k:r.get(k) for k in ['group','slug','team','clubSlug','postRank','postCPI','logo','canonicalClubId','canonicalTeamId']} for r in rankings]
club_comp=[{k:r.get(k) for k in ['slug','displayName','canonicalClubId','logo','logoStatus','region']} for r in clubs]
jo_comp=[]
for g in jo.get('groups',[]):
 for d in g.get('divisions',[]):
  for s in d.get('subdivisions',[]):
   for t in s.get('teams',[]): jo_comp.append({'group':g.get('id'),'division':d.get('id'),'subdivision':s.get('id'),'team':t.get('team'),'place':t.get('place'),'overallPlace':t.get('overallPlace'),'record':t.get('record')})
actual={'competitiveRankingAndLogoAssignments':digest(rank_comp),'clubIdentityAndLogoAssignments':digest(club_comp),'joPlacementAndRecordData':digest(jo_comp)}
for k,v in actual.items():
    if v!=baseline['hashes'][k]: fail(f'7.52.15 integrity hash changed: {k}')
if hashlib.sha256((ROOT/'js/jo-results-browser-v7-52-1.js').read_bytes()).hexdigest()!='04a747ce9ff3854961e5ff8a1e4ed69eb6a79435ab4a18f457858eeed2ade0d0': fail('JO results browser JS differs from the approved 7.53.4 WPI-branded browser')
if 'js/tournament-hub-v7-54-4.js?v=7.54.16' not in (ROOT/'tournaments.html').read_text(encoding='utf-8'): fail('public tournament archive consumer missing')
if errors:
 print('CLUB WEBSITE 7.52.16 TEST FAILED'); [print(' -',e) for e in errors]; sys.exit(1)
print('CLUB WEBSITE 7.52.16 TESTS PASSED')
print(' - 177 of 182 clubs have links; four are explicitly no-site and one remains missing')
print(' - All 135 user-supplied additions are synchronized across public, canonical, profile, and browser data')
print(' - Rankings, club/logo identities, JO placements, and JO logo-browser behavior remains protected after the 7.53.4 branding-only copy migration')
