#!/usr/bin/env python3
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def req(cond,msg):
    if not cond: raise SystemExit('FAIL: '+msg)
site=json.loads((ROOT/'config/site-release.json').read_text())
req(site.get('version') in ('7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9','7.64.0','7.64.1','7.64.2','7.64.3'),'site version must preserve 7.62.1 team hubs or later')
req(any(v in (ROOT/'VERSION.md').read_text() for v in ('7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9','7.64.0','7.64.1','7.64.2','7.64.3')),'VERSION must preserve 7.62.1 team hubs or later')
data=json.loads((ROOT/'data/live/organization-directory-v7-62-1.json').read_text())
req(data.get('schemaVersion')==2,'team-hub directory schema must be v2')
req(data['counts']['organizations']==185,'expected 185 organizations')
req(data['counts']['teams']==736,'expected 736 teams')
req(data['counts']['clubTeams']==724,'expected 724 club teams')
req(data['counts']['highSchoolTeams']==12,'expected 12 high-school teams')
teams=data['teams']; families=[t['familyKey'] for t in teams]
req(len(families)==len(set(families)),'family keys must stay unique')
req(all(t.get('teamHubHref','').startswith('team-hub.html?family=') for t in teams),'every team must have a stable team hub href')
req(all(t.get('profileHref')==t.get('teamHubHref') for t in teams),'unified team profile href must point to stable hub')
club=[t for t in teams if t['organizationType']=='club']; schools=[t for t in teams if t['organizationType']=='high_school']
req(all(t.get('legacyProfileHref') for t in club),'club team hubs must preserve legacy rankings/history links')
req(all(not t.get('legacyProfileHref') for t in schools),'high-school team hubs must not fabricate legacy ranking pages')
html=(ROOT/'team-hub.html').read_text(); js=(ROOT/'js/team-hub-v7-62-1.js').read_text(); css=(ROOT/'css/team-hub-v7-62-1.css').read_text()
for marker in ['teamHubName','teamHubOrganization','teamHubFollow','teamHubGames','teamHubLegacyLink']:
    req(marker in html,f'team hub missing {marker}')
req('organization-directory-v7-62-1.json' in js,'team hub must use unified 7.62.1 directory')
req('live_public_organization_overview_v1' in js,'team hub must use safe organization overview')
req('setPublicTeamFamilyFollow' in js,'team hub must use stable family Following')
req('canonicalWpiTeamFamilyKey' in js,'team hub must match Live teams by stable family key')
req('Following is read-only' in html,'team hub must explain Following permissions')
req('team-primary' in css and 'team-secondary' in css,'team hub must inherit organization branding colors')
# Discovery and My Teams should route to the stable team hub data.
for rel in ['js/homepage-organization-search-v7-62-1.js','js/organization-profile-v7-62-1.js','js/organization-directory-v7-62-1.js','js/live-following-v7-62-1.js']:
    text=(ROOT/rel).read_text(); req('organization-directory-v7-62-1.json' in text,f'{rel} must use unified 7.62.1 directory')
req('homepage-organization-search-v7-62-1.js?v=7.62.1' in (ROOT/'index.html').read_text(),'homepage must load 7.62.1 team-hub search')
req('organization-profile-v7-62-1.js?v=7.62.1' in (ROOT/'organization.html').read_text(),'organization profile must load 7.62.1 bridge')
req(any(x in (ROOT/'live-following.html').read_text() for x in ('live-following-v7-62-1.js?v=7.62.1','live-following-v7-63-6.js?v=7.63.6','live-following-v7-63-9.js?v=7.63.9')),'My Teams must load stable team-hub bridge')
# No DB migration or scoring foundation change required for this read-only routing release.
req(not list((ROOT/'supabase/migrations').glob('*7_62_1*')),'7.62.1 must not add a database migration')
hashes=json.loads((ROOT/'data/live/protected-foundation-hashes-v7-62-1.json').read_text())['files']
for rel,expected in hashes.items():
    got=hashlib.sha256((ROOT/rel).read_bytes()).hexdigest(); req(got==expected,f'protected file changed: {rel}')
print('STABLE TEAM HUBS & LIVE BRIDGE 7.62.1 TEST PASSED')
