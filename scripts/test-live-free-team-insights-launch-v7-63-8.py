#!/usr/bin/env python3
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def req(c,m):
    if not c: raise AssertionError(m)
def read(rel):
    p=ROOT/rel; req(p.exists(),f'Missing file: {rel}'); return p.read_text(encoding='utf-8')
version=read('VERSION.md'); site=json.loads(read('config/site-release.json'))
sql=read('supabase/migrations/202608190001_free_team_insights_launch_mode.sql')
correction=read('supabase/migrations/202608190002_free_team_insights_launch_recap_correction.sql')
recap_html=read('live-game-recap.html'); recap_js=read('js/live-game-recap-v7-63-8.js')
event_html=read('live-event-recap.html')
req('WPI 7.63.8' in version,'VERSION missing 7.63.8')
req(site.get('version')=='7.63.8','site release mismatch')
req(site.get('liveTeamInsightsFreeLaunchRelease')=='7.63.8','free-launch marker missing')
req(site.get('liveTeamInsightsExperienceRelease')=='7.63.8','Team Insights marker did not advance')
# Launch mode is explicit, reversible, and limited to authenticated team context.
for token in ("access_mode text not null default 'paywalled'","access_mode in ('free_launch','paywalled')","set access_mode='free_launch'","live_team_insights_launch_free_access_v1"):
    req(token in sql,f'launch-mode foundation missing: {token}')
req('if caller is null then return false' in sql.lower(),'anonymous users must not receive free Team Insights')
req('public.live_is_team_follower(target_team_id)' in sql,'team followers must receive launch access')
req('from public.live_team_members m' in sql and 'm.team_id=target_team_id' in sql,'team members/viewers must receive launch access')
req('or public.live_team_insights_launch_free_access_v1(target_team_id)' in sql,'detailed analytics helper must include free-launch access')
# Do NOT promote launch users into paid analyticsLevel; ad-free decisions still use explicit entitlement level.
req('create or replace function public.live_analytics_access_level_v1' not in sql,'free launch must not overwrite paid analyticsLevel semantics')
# All analytics RPC paths must honor free-launch detailed access.
req('not public.live_has_detailed_analytics_access(game_team_id)' in sql,'game analytics detail did not adopt free-launch helper')
req(sql.count('public.live_has_detailed_analytics_access(team_row.id)')>=2,'Team Insights overview/player RPCs did not adopt free-launch helper')
req('public.live_has_detailed_analytics_access(game_row.team_id)' in sql,'recap RPC did not adopt free-launch helper')
req("then 'launch_free'" in sql,'recap access reason does not identify launch-free access')
# Recap remains ad-supported for free launch; ad-free still means operational role or explicit paid analyticsLevel.
req('js/live-game-recap-v7-63-8.js?v=7.63.8' in recap_html,'recap page does not load 7.63.8 client')
req('const adFreeViewer' in recap_js,'recap ad-free decision missing')
req('["team_insights","organization_insights"].includes(analyticsLevel)' in recap_js,'explicit paid entitlement ad-free check missing')
req('!adFreeViewer && window.WPILiveAds' in recap_js,'free-launch recap users should remain eligible for ads')
req('!hasDetailedAnalytics && window.WPILiveAds' not in recap_js,'detailed launch access must not accidentally suppress recap ads')
# Visible launch UX should not advertise a price on event results.
req('$5/month' not in event_html and '$50/year' not in event_html,'event-results surface still advertises paid pricing during free launch')
req('Full analytics included during launch' in event_html and 'Open Team Insights' in event_html,'event-results launch CTA missing')

# Correction makes free launch truly global for authenticated WPI accounts and removes recap paywall UI.
req("where t.id=target_team_id and t.active=true" in correction,'free-launch correction must allow authenticated accounts on active teams')
req("live_is_team_follower(target_team_id)" not in correction.split('create or replace function public.live_team_insights_launch_free_access_v1',1)[1].split('$$;',1)[0],'free launch must not remain follower-only')
req('recapAnalyticsAccessNotice' not in recap_html,'recap paywall panel must be absent during free launch')
req('Upgrade to Team Insights' not in recap_html and '$5/month' not in recap_html and '$50/year' not in recap_html,'recap must not advertise paid pricing during free launch')
req('Explore Team Insights' in correction and 'included during the WPI launch' in correction,'house creative must be truthful during free launch')
req("advertiser_type='house'" in correction and 'advertiser_kind' not in correction,'house creative update must use live_advertisers.advertiser_type')

# Billing stays dormant and no payment/security behavior changes.
req(site.get('liveBillingReadinessRelease')=='7.63.4','billing readiness marker should not advance')
for forbidden in ('card_number','cvv','billing_address','home_address','viewer_email','ip_address'):
    req(forbidden not in sql.lower(),f'forbidden sensitive field introduced: {forbidden}')
# Mature scoring/delivery remains byte-stable.
expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'}
for rel,h in expected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f'Protected file changed: {rel}')
print('WPI 7.63.8 free Team Insights launch-mode regression passed.')
