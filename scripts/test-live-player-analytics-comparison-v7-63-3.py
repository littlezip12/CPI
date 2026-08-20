#!/usr/bin/env python3
from pathlib import Path
import json, hashlib, re

ROOT = Path(__file__).resolve().parents[1]
MIG = ROOT / 'supabase/migrations/202608170004_player_analytics_comparison.sql'
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
sql = read('supabase/migrations/202608170004_player_analytics_comparison.sql')
recap_html = read('live-game-recap.html')
recap_js = read('js/live-game-recap-v7-63-3.js')
insights_html = read('live-team-insights.html')
insights_js = read('js/live-team-insights-v7-63-3.js')
insights_css = read('css/live-team-insights-v7-63-3.css')

req(any(v in version for v in ('WPI 7.63.3','WPI 7.63.4','WPI 7.63.5','WPI 7.63.6','WPI 7.63.7','WPI 7.63.8','WPI 7.63.9')), 'VERSION must preserve 7.63.3')
req(site.get('version') in {'7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9'}, 'site release must preserve 7.63.3')
req(site.get('liveTeamInsightsExperienceRelease') in {'7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9'}, 'Team Insights release marker must preserve 7.63.3')
req(site.get('livePlayerAnalyticsComparisonRelease') == '7.63.3', 'player analytics comparison marker missing')

# Supporters should see one upgrade surface, not repeated locked private panels.
for panel_id in ['recapPrivateLineupsPanel','recapPrivatePlayerStatsPanel','recapPrivateTimelinePanel']:
    req(panel_id in recap_html, f'Private recap panel ID missing: {panel_id}')
    req(f'"{panel_id}"' in recap_js, f'Private recap panel not controlled by entitlement: {panel_id}')
req('panel.hidden = !hasDetailedAnalytics' in recap_js, 'Private recap panels must be hidden for free Supporters')
if site.get('version') in {'7.63.8','7.63.9'}:
    req('Upgrade to Team Insights' not in recap_html and '$5/month' not in recap_html and '$50/year' not in recap_html, '7.63.8 free-launch recap must not show paid upgrade copy')
else:
    req('Upgrade to Team Insights' in recap_html and '$5/month' in recap_html and '$50/year' in recap_html, 'single Supporter upgrade offer missing')
req('Detailed player analytics are private. Upgrade to unlock' not in recap_js, 'locked placeholder private-panel copy should be removed')

# Player scope + comparison UX.
for needle in ['playerScopeSelect','primaryPlayerSelect','comparisonPlayerSelect','addComparisonPlayer','playerComparison']:
    req(needle in insights_html, f'Player analytics UI missing: {needle}')
for needle in ['live_team_player_insights_v1','loadPlayerAnalytics','comparisonPlayerIds','Shooting %','Goals / game','Shots saved','Shootout goals']:
    req(needle in insights_js, f'Player comparison client behavior missing: {needle}')
req('comparisonPlayerIds.length >= 3' in insights_js, 'comparison must cap at primary + three teammates')
req('insights-comparison-table' in insights_css, 'comparison table styling missing')

# Server-side detailed access and scope safety.
for needle in [
    'create or replace function public.live_team_player_insights_v1',
    "member_role in ('owner','admin','scorer')",
    "analytics_level in ('team_insights','organization_insights')",
    "raise exception 'Detailed analytics access required'",
    "scope_value not in ('season','series','game')",
    "scope_value='season'",
    "scope_value='series'",
    "scope_value='game'",
    "e.event_type='goal'",
    "e.event_type in ('goal','shot_missed','shot_post','shot_blocked','shot_saved')",
    "e.event_type='shootout_goal'",
    "e.event_type='shootout_miss'",
    "grant execute on function public.live_team_player_insights_v1(uuid,text,text,uuid) to authenticated",
]:
    req(needle in sql, f'Missing player analytics SQL behavior: {needle}')
req('security definer' in sql.lower(), 'player analytics RPC must enforce access server-side')
req('live_events e' in sql and "e.status='active'" in sql, 'shooting metrics must derive from canonical active events')

# Pricing remains preview-only; no payment or external ad network is enabled here.
joined = '\n'.join([sql,recap_html,recap_js,insights_html,insights_js])
req('js.stripe.com' not in joined.lower(), 'Stripe must remain disabled in 7.63.3')
req('googlesyndication' not in joined.lower(), 'programmatic ads must remain disabled in 7.63.3')

for rel, expected in EXPECTED_PROTECTED.items():
    p = ROOT / rel
    req(p.exists(), f'Protected file missing: {rel}')
    req(hashlib.sha256(p.read_bytes()).hexdigest() == expected, f'Protected file changed: {rel}')

print('WPI 7.63.3 player analytics comparison regression passed.')
