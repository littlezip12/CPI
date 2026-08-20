#!/usr/bin/env python3
from pathlib import Path
import json, hashlib, re

ROOT = Path(__file__).resolve().parents[1]
MIG = ROOT / 'supabase/migrations/202608170003_team_insights_experience.sql'

EXPECTED_PROTECTED = {
    'js/live-backend-v7-56-8.js': 'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
    'js/live-game-v7-58-6.js': '5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
    'js/live-game-storage-v7-58-6.js': 'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
    'supabase/functions/groupme-post/index.ts': '1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
    'supabase/functions/roster-extract/index.ts': '26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
}

def req(condition, message):
    if not condition:
        raise AssertionError(message)

def read(rel):
    p = ROOT / rel
    req(p.exists(), f'Missing file: {rel}')
    return p.read_text(encoding='utf-8')

version = read('VERSION.md')
site = json.loads(read('config/site-release.json'))
sql = read('supabase/migrations/202608170003_team_insights_experience.sql')
recap_html = read('live-game-recap.html')
recap_js = read('js/live-game-recap-v7-63-2.js')
recap_css = read('css/live-game-recap-v7-63-2.css')
insights_html = read('live-team-insights.html')
insights_js = read('js/live-team-insights-v7-63-2.js')
insights_css = read('css/live-team-insights-v7-63-2.css')

req(any(v in version for v in ('WPI 7.63.2','WPI 7.63.3','WPI 7.63.4','WPI 7.63.5','WPI 7.63.6','WPI 7.63.7','WPI 7.63.8','WPI 7.63.9')), 'VERSION must preserve 7.63.2')
req(site.get('version') in {'7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9'}, 'site release must preserve 7.63.2')
req(site.get('liveTeamInsightsExperienceRelease') in {'7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9'}, 'Team Insights release marker missing')
req(site.get('liveSubscriptionPricingRelease') in {'7.63.2','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9'}, 'pricing release marker missing')
req(site.get('liveAnalyticsPrivacyBoundaryRelease') == '7.63.2', 'privacy boundary marker must advance to 7.63.2')

for needle in [
    'create table if not exists public.live_subscription_products',
    "'team_insights'",
    "'USD',500,5000,'preview'",
    'create policy live_game_analytics_authorized_read',
    "live_has_team_role(team_id,array['owner','admin','scorer']::public.live_team_role[])",
    'public.live_has_detailed_analytics_access(team_id)',
    'create or replace function public.live_team_insights_overview_v1',
    "can_view_detail := coalesce(member_role in ('owner','admin','scorer'),false)",
    "analytics_level in ('team_insights','organization_insights')",
    "'seasonSummary'",
    "'seriesSummaries'",
    "'seasonPlayerTotals'",
]:
    req(needle in sql, f'Missing 7.63.2 SQL behavior: {needle}')

# The direct analytics table must no longer treat viewer membership as analytics entitlement.
policy = re.search(r'create policy live_game_analytics_authorized_read.*?\);', sql, re.S)
req(policy is not None, 'analytics read policy missing')
req('live_is_team_member' not in policy.group(0), 'viewer membership still unlocks direct analytics rows')

# Upgrade UX is preserved for paywalled releases; 7.63.8 intentionally removes it during free launch.
if site.get('version') in {'7.63.8','7.63.9'}:
    req('Upgrade to Team Insights' not in recap_html and '$5/month' not in recap_html and '$50/year' not in recap_html, 'free-launch recap must not show paid upgrade UX')
    for needle in ['live-team-insights.html','recapGameAnalyticsPanel']:
        req(needle in recap_html, f'Recap Team Insights navigation/analytics missing: {needle}')
else:
    for needle in ['Upgrade to Team Insights','$5/month','$50/year','live-team-insights.html','recapGameAnalyticsPanel']:
        req(needle in recap_html, f'Recap Team Insights UX missing: {needle}')
req('.live-recap-shell [hidden]{display:none!important}' in recap_css, 'recap hidden-state CSS correction missing')
req('live_game_analytics_detail_v1' in recap_js, 'recap must show trusted canonical game totals for detailed users')
if site.get('version') not in {'7.63.8','7.63.9'}:
    req('weekend, tournament and season analytics' in recap_js, 'locked recap copy must explain expanded Team Insights value')

for needle in ['Team Insights','monthlyPrice','annualPrice','seasonRecord','seriesCards','seasonPlayerTotals','gameList']:
    req(needle in insights_html, f'Team Insights page missing: {needle}')
for needle in ['live_team_insights_overview_v1','renderSeriesSelection','renderDetailed','Subscriptions are coming soon','Checkout will be enabled']:
    req(needle in insights_js, f'Team Insights client behavior missing: {needle}')
req('.insights-shell [hidden]{display:none!important}' in insights_css, 'Team Insights hidden-state safety missing')

# No billing provider is activated yet. Pricing is preview-only.
joined = '\n'.join([sql,recap_html,recap_js,insights_html,insights_js])
req('js.stripe.com' not in joined.lower(), 'Stripe JS must not be enabled in 7.63.2')
req('checkout_status' in sql and "'preview'" in sql, 'pricing must remain preview-only')

for rel, expected in EXPECTED_PROTECTED.items():
    p = ROOT / rel
    req(p.exists(), f'Protected file missing: {rel}')
    req(hashlib.sha256(p.read_bytes()).hexdigest() == expected, f'Protected file changed: {rel}')

print('WPI 7.63.2 Team Insights experience regression passed.')
