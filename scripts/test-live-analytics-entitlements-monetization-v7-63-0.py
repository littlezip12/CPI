#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, re, sys

ROOT = Path(__file__).resolve().parents[1]
MIG = ROOT / 'supabase/migrations/202608170001_analytics_entitlements_monetization_foundation.sql'
RECAP_JS = ROOT / 'js/live-game-recap-v7-63-0.js'
RECAP_HTML = ROOT / 'live-game-recap.html'
PLAN = ROOT / 'docs/WPI_SCALE_MONETIZATION_SECURITY_PLAN_2026-08-16.md'

EXPECTED_PROTECTED = {
    'js/live-backend-v7-56-8.js': 'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
    'js/live-game-v7-58-6.js': '5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
    'js/live-game-storage-v7-58-6.js': 'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
    'supabase/functions/groupme-post/index.ts': '1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
    'supabase/functions/roster-extract/index.ts': '26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
}

def require(condition, message):
    if not condition:
        raise AssertionError(message)

def text(path):
    require(path.exists(), f'Missing required file: {path.relative_to(ROOT)}')
    return path.read_text(encoding='utf-8')

version = text(ROOT / 'VERSION.md')
site = json.loads(text(ROOT / 'config/site-release.json'))
sql = text(MIG)
js = text(RECAP_JS)
html = text(RECAP_HTML)
plan = text(PLAN)

require(any(v in version for v in ('WPI 7.63.0','WPI 7.63.1','WPI 7.63.2','WPI 7.63.3','WPI 7.63.4','WPI 7.63.5','WPI 7.63.6','WPI 7.63.7')), 'VERSION.md no longer preserves 7.63.0')
require(site.get('version') in {'7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7'}, 'site-release.json no longer preserves 7.63.0')
require(site.get('version') in {'7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7'}, 'site release no longer preserves analytics/entitlements foundation')

for needle in [
    'create table if not exists public.live_analytics_entitlements',
    'create table if not exists public.live_game_analytics',
    'create or replace function public.live_analytics_access_level_v1',
    'create or replace function public.live_game_analytics_detail_v1',
    'create trigger live_games_analytics_status_trigger',
    "analytics_status='invalidated'",
    'live_refresh_game_analytics_internal_v1',
    'live_events_game_active_type_player_idx',
]:
    require(needle in sql, f'Missing analytics foundation requirement: {needle}')

for needle in [
    'drop policy if exists "game participants and followers read events" on public.live_events',
    'drop policy if exists "game participants and followers read lineups" on public.live_lineups',
    'drop policy if exists "game participants and followers read recaps" on public.live_game_recaps',
    'create policy live_events_member_read',
    'create policy live_lineups_member_read',
    'create policy live_game_recaps_member_read',
    "'hasDetailedAnalytics',can_view_detail",
    "'supporter_free'",
]:
    require(needle in sql, f'Missing follower privacy requirement: {needle}')

require('grant execute on function public.live_game_recap_detail_v1(uuid) to authenticated' in sql,
        'Authenticated recap RPC grant missing')
require('grant execute on function public.live_game_recap_detail_v1(uuid) to anon' not in sql,
        'Detailed recap RPC must not be anonymous')
require('grant execute on function public.live_game_analytics_detail_v1(uuid) to anon' not in sql,
        'Detailed analytics RPC must not be anonymous')

for needle in [
    'create table if not exists public.live_advertisers',
    'create table if not exists public.live_ad_creatives',
    'create table if not exists public.live_ad_campaigns',
    'create table if not exists public.live_ad_campaign_creatives',
    'create table if not exists public.live_ad_delivery_events',
    'youth_safe_approved boolean not null default false',
    "scope_type in ('platform','region','organization','team','tournament','weekend','game')",
    "event_tier in ('friendly','local','standard','major','flagship')",
    'exclusive boolean not null default false',
    'share_of_voice numeric(5,2)',
    'contract_value_cents bigint',
    'payment_status text not null',
    'live_validate_ad_campaign_activation_v1',
    'live_platform_ad_campaign_reporting_v1',
]:
    require(needle in sql, f'Missing commercial safety requirement: {needle}')

# 7.63.0 deliberately creates no anonymous/client ad telemetry write path.
require('grant execute on function public.live_record_ad_event' not in sql,
        '7.63.0 must not expose a public ad telemetry writer yet')
require('viewer user_id' in sql.lower() or 'no viewer pii' in sql.lower() or 'no viewer user_id' in sql.lower(),
        'Migration should explicitly document privacy-minimized ad telemetry')

for forbidden in ['cvv', 'card_number', 'full_card', 'service_role_key']:
    # Words in explanatory comments are acceptable only for CVV/card descriptions; schema columns are not.
    require(not re.search(rf'\b{re.escape(forbidden)}\s+(text|varchar|character|numeric|bigint|integer)', sql, re.I),
            f'Forbidden sensitive-data column detected: {forbidden}')

require('hasDetailedAnalytics' in js, 'Recap UI is not entitlement aware')
require('Detailed player analytics are private' in js, 'Free Supporter privacy message missing')
require('recapAnalyticsAccessNotice' in html, 'Recap access notice missing')
require(any(v in html for v in ('js/live-game-recap-v7-63-0.js?v=7.63.0','js/live-game-recap-v7-63-2.js?v=7.63.2','js/live-game-recap-v7-63-3.js?v=7.63.3','js/live-game-recap-v7-63-5.js?v=7.63.5')), 'Recap page is not loading the 7.63.x client')

for needle in ['6,000 games', '150,000', '$2K–$5K', '$25K', 'GitHub Pages', 'Supabase', 'Mega-Event Readiness Gate', 'youth-safe']:
    require(needle in plan, f'Scale/security plan missing: {needle}')

for rel, expected in EXPECTED_PROTECTED.items():
    path = ROOT / rel
    require(path.exists(), f'Protected file missing: {rel}')
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    require(digest == expected, f'Protected file changed unexpectedly: {rel}')

print('WPI 7.63.0 analytics / entitlements / monetization foundation regression passed.')
