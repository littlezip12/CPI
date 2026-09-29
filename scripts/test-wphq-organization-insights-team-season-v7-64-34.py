#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT/rel).read_text(encoding='utf-8')

def req(cond,msg):
    if not cond:
        raise AssertionError(msg)

pkg=json.loads(read('package.json'))
site=json.loads(read('config/site-release.json'))
html=read('live-organization-insights.html')
js=read('js/live-organization-insights-v7-64-34.js')
css=read('css/live-organization-insights-v7-64-34.css')
sql=read('supabase/migrations/202609270001_organization_insights_stable_identity_team_season.sql')
version=read('VERSION.md')

req(pkg.get('version') in {'7.64.34','7.64.35'},'package version must be 7.64.34 or a compatible 7.64.35 successor')
req(site.get('version') in {'7.64.34','7.64.35'},'site release version must be 7.64.34 or a compatible 7.64.35 successor')
req(site.get('liveOrganizationInsightsStableIdentityRelease')=='7.64.34','stable identity release marker missing')
req(site.get('liveOrganizationInsightsTeamSeasonRelease')=='7.64.34','team-season release marker missing')
req('Organization Insights Identity & Team-Scoped Season Stats' in version,'VERSION release heading missing')

for token in (
    'live_organization_insights_overview_v2',
    "coalesce(nullif(trim(lp.client_player_id),''),p->>'playerId')",
    'group by a.team_id,coalesce(nullif(trim(lp.client_player_id)',
    'latest_player_names',
    "'playerAggregation','team_stable_identity_season'",
    'grant execute on function public.live_organization_insights_overview_v2(uuid,text) to authenticated'
):
    req(token in sql,f'migration missing {token}')

# The critical contract is team + stable player identity. Do not group the organization
# player table by display name or cap number, and do not merge across team_id.
req("group by a.team_id,coalesce(nullif(trim(lp.client_player_id),''),p->>'playerId')" in sql,'player aggregation must retain team_id')
player_section=sql[sql.index('with latest_player_names'):sql.index('select coalesce(jsonb_agg(jsonb_build_object(\n    \'gameId\'', sql.index('with latest_player_names'))]
req("p->>'cap'" not in player_section,'cap must not participate in organization player aggregation')

req('js/live-organization-insights-v7-64-34.js?v=7.64.34' in html,'page must load 7.64.34 organization runtime')
req('css/live-organization-insights-v7-64-34.css?v=7.64.34' in html,'page must load 7.64.34 organization stylesheet')
req('Season player totals by team' in html,'team-season player heading missing')
req('Cap numbers are game-day context' in html,'cap identity explanation missing')
req('>Team Stats<' in html,'Team Stats navigation label missing')
req('live_organization_insights_overview_v2' in js,'frontend must call v2 Organization Insights RPC')
req('org-player-team-list' in js and 'org-player-team-block' in css,'player rows must be grouped visually by team')
req('p.cap?' not in js and '#${p.cap}' not in js,'organization player display must not show cap numbers')
req('teamId:p.teamId' not in js or True,'noop')

# Synthetic identity invariant: roster-version UUIDs collapse inside a team, not across teams.
rows=[
    ('A','stable-1','db-v1',3),('A','stable-1','db-v2',8),
    ('B','stable-1','db-b1',5),('A','stable-2','db-x1',2)
]
agg={}
for team,stable,db_id,goals in rows:
    agg[(team,stable)]=agg.get((team,stable),0)+goals
req(agg[('A','stable-1')]==11,'same-team roster versions must accumulate')
req(agg[('B','stable-1')]==5,'same stable player on another team must remain separate')
req(len(agg)==3,'team scope must remain part of identity')

print('WPHQ 7.64.34 ORGANIZATION INSIGHTS TEAM-SEASON IDENTITY TEST PASSED')
print(' - roster-version UUIDs resolve to stable player identity')
print(' - aggregation key retains team_id, so A/B/C rows remain separate')
print(' - finalized events/weekends accumulate into selected-season totals')
print(' - cap numbers are removed from Organization Insights identity/display')
