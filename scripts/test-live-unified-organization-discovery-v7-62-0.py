#!/usr/bin/env python3
import json,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def req(cond,msg):
    if not cond: raise SystemExit('FAIL: '+msg)
release=(ROOT/'VERSION.md').read_text()
req(any(v in release for v in ('7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8')),'VERSION must preserve 7.62.0 or later')
data=json.loads((ROOT/'data/live/organization-directory-v7-62-0.json').read_text())
req(data['counts']['organizations']==185,'expected 185 organizations')
req(data['counts']['clubs']==182,'expected 182 clubs')
req(data['counts']['highSchools']==3,'expected 3 high schools')
req(data['counts']['teams']==736,'expected 736 teams')
ids={o['organizationId'] for o in data['organizations']}
for x in ['school-acalanes','school-campolindo','school-miramonte','club-lamorinda']:
    req(x in ids,f'missing organization {x}')
html=(ROOT/'organizations.html').read_text(); profile=(ROOT/'organization.html').read_text(); js=(ROOT/('js/organization-directory-v7-62-1.js' if (ROOT/'js/organization-directory-v7-62-1.js').exists() else 'js/organization-directory-v7-62-0.js')).read_text(); pjs=(ROOT/('js/organization-profile-v7-62-1.js' if (ROOT/'js/organization-profile-v7-62-1.js').exists() else 'js/organization-profile-v7-62-0.js')).read_text()
for marker in ['orgSearch','orgType','orgLocation','orgTeamGroup']:
    req(marker in html,f'organizations page missing {marker}')
req('live_public_organization_overview_v1' in pjs,'profile must use safe organization overview RPC')
req('setPublicTeamFamilyFollow' in pjs,'profile must preserve stable team-family following')
req('familyFollows' in pjs,'profile must reflect directory-only follows before a Live workspace exists')
req('Following is read-only' in profile,'profile must explain Following is read-only')
index=(ROOT/'index.html').read_text()
req('Search for a team, club or school' in index,'homepage search must include schools')
req(any(x in index for x in ('homepage-organization-search-v7-62-0.js','homepage-organization-search-v7-62-1.js')),'homepage must load unified search overlay')
# Platform Owner scale filters
board=(ROOT/'live-dashboard.html').read_text(); boardjs=(ROOT/'js/live-dashboard-v7-62-0.js').read_text()
req('dashboardWorkspaceType' in board and 'high_school' in board,'workspace type filter missing')
req('teamWorkspaceType' in boardjs and 'organizationType(club)' in boardjs,'workspace type filtering missing')
req('css/live-dashboard-v7-62-0.css?v=7.62.0' in board,'workspace scale CSS missing')
# Migration must be read-only except function replacement/grants; no table data writes.
sql=(ROOT/'supabase/migrations/202608160004_unified_organization_discovery_scale.sql').read_text().lower()
req('live_public_organization_overview_v1' in sql,'public overview RPC missing')
req('grant execute on function public.live_public_organization_overview_v1(text) to anon,authenticated' in sql,'public overview RPC grant missing')
req("'familyfollows',follows_json" in sql.replace(' ',''),'public overview must return directory-only family follows')
for dangerous in ['insert into public.live_games','update public.live_games','delete from public.live_games','insert into public.live_team_members','insert into public.live_team_follows']:
    req(dangerous not in sql,f'migration must not mutate operational data: {dangerous}')
# Protected foundation hashes unchanged.
hashes=json.loads((ROOT/'data/live/protected-foundation-hashes-v7-62-0.json').read_text())['files']
for rel,expected in hashes.items():
    got=hashlib.sha256((ROOT/rel).read_bytes()).hexdigest(); req(got==expected,f'protected file changed: {rel}')
print('UNIFIED ORGANIZATION DISCOVERY 7.62.0 TEST PASSED')
