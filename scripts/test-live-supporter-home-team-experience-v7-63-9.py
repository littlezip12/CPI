#!/usr/bin/env python3
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def req(c,m):
    if not c: raise AssertionError(m)
def read(rel):
    p=ROOT/rel; req(p.exists(),f'Missing file: {rel}'); return p.read_text(encoding='utf-8')
site=json.loads(read('config/site-release.json')); version=read('VERSION.md')
following_html=read('live-following.html'); following_js=read('js/live-following-v7-63-9.js'); following_css=read('css/live-following-v7-63-9.css')
hub_html=read('team-hub.html'); hub_js=read('js/team-hub-v7-63-9.js'); hub_css=read('css/team-hub-v7-63-9.css')
req(any(v in version for v in ('WPI 7.63.9','WPI 7.64.0','WPI 7.64.1')),'VERSION missing 7.63.9+ supporter-home baseline')
req(site.get('version') in {'7.63.9','7.64.0','7.64.1'},'site release mismatch')
req(site.get('liveScoringSupporterHomeRelease')=='7.63.9','supporter-home release marker missing')
req(site.get('liveScoringUnifiedTeamExperienceRelease')=='7.63.9','unified-team release marker missing')
# Personalized supporter home comes before broad discovery.
for token in ('supporter-glance','supporterTeamStat','supporterLiveStat','supporterUpcomingStat','supporterFinalStat','myTeams','gameFeed','eventSummary','findWpiTeam'):
    req(token in following_html,f'My Teams page missing {token}')
req(following_html.index('id="myTeams"') < following_html.index('id="gameFeed"') < following_html.index('id="eventSummary"') < following_html.index('id="findWpiTeam"'),'supporter-home hierarchy must prioritize followed teams and activity before discovery')
req('live-following-v7-63-9.js?v=7.63.9' in following_html and 'live-following-v7-63-9.css?v=7.63.9' in following_html,'My Teams must load 7.63.9 assets')
for token in ('myTeamRows','teamSnapshot','Recent record','Live now','Next game','Latest result','Team Insights','teamHubHref','resetFilters'):
    req(token in following_js,f'supporter-home behavior missing {token}')
req('live_following_overview_v2' in following_js and 'live_following_event_summaries_v1' in following_js,'supporter home must reuse read-only existing Live RPCs')
req('setPublicTeamFamilyFollow' in following_js,'following must continue using canonical team-family relationship')
req('data-unfollow-family' in following_js,'unfollow path missing')
req('grid-template-columns:repeat(4,1fr)' in following_css,'supporter glance layout missing')
# Unified team page preserves identity while adding live/next/recent/events/insights.
for token in ('teamHubInsightsLink','teamHubRecord','teamHubPriority','teamHubGames','teamHubEvents','teamHubRelationship'):
    req(token in hub_html,f'team hub missing {token}')
req('team-hub-v7-63-9.js?v=7.63.9' in hub_html and 'team-hub-v7-63-9.css?v=7.63.9' in hub_html,'Team Hub must load 7.63.9 assets')
for token in ('organization-directory-v7-62-1.json','live_public_organization_overview_v1','canonicalWpiTeamFamilyKey','setPublicTeamFamilyFollow','live_team_insights_overview_v1','seriesSummaries','Live now','Next game','Latest result'):
    req(token in hub_js,f'unified Team Hub behavior missing {token}')
req('(live.games||[]).filter(g=>String(g.teamId)===String(lt.teamId))' in hub_js,'Team Hub game data must remain strictly team-scoped')
req('requested_season:null' in hub_js,'Team Hub must request the current Team Insights season rather than fabricate a record')
req('Following is read-only' in hub_html,'Team Hub must preserve the Following permission boundary')
req('team-primary' in hub_css and 'team-secondary' in hub_css,'Team Hub must preserve organization branding')
# Free-launch UX must not regress to a visible purchase prompt on these surfaces.
for text in (following_html,following_js,hub_html,hub_js):
    req('$5/month' not in text and '$50/year' not in text and 'Upgrade to Team Insights' not in text,'7.63.9 supporter/team surfaces must not show dormant pricing or upgrade copy')
# No new backend deployment is required for this experience release.
req(not list((ROOT/'supabase/migrations').glob('20260819*7639*')),'7.63.9 should not introduce a Supabase migration')
# Mature scoring/delivery foundation remains byte-stable.
expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'}
for rel,h in expected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f'Protected file changed: {rel}')
print('WPI 7.63.9 supporter home + unified team experience regression passed.')
