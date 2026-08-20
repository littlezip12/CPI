#!/usr/bin/env python3
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def req(c,m):
    if not c: raise AssertionError(m)
def read(rel):
    p=ROOT/rel; req(p.exists(),f'Missing file: {rel}'); return p.read_text(encoding='utf-8')
version=read('VERSION.md'); site=json.loads(read('config/site-release.json'))
sql=read('supabase/migrations/202608170007_sponsorship_validation_event_inventory.sql')
repair_sql=read('supabase/migrations/202608170008_house_validation_activation_order_correction.sql')
ambiguity_fix_sql=read('supabase/migrations/202608170009_house_validation_campaign_id_ambiguity_correction.sql')
event_html=read('live-event-recap.html'); event_js=read('js/live-event-recap-v7-63-6.js'); event_css=read('css/live-event-recap-v7-63-6.css')
following_html=read('live-following.html'); following_js=read('js/live-following-v7-63-6.js')
commercial_html=read('live-commercial.html'); commercial_js=read('js/live-commercial-v7-63-6.js')
ad_js=read('js/live-ad-delivery-v7-63-6.js')
score_html=read('live-score.html'); recap_html=read('live-game-recap.html')
game_html=read('live-game.html'); supporter_game_ads=read('js/live-game-supporter-ads-v7-63-6.js')
req(any(v in version for v in ('WPI 7.63.6','WPI 7.63.7','WPI 7.63.8','WPI 7.63.9')),'VERSION missing 7.63.6+')
req(site.get('version') in {'7.63.6','7.63.7','7.63.8','7.63.9'},'site release mismatch')
for k in ('liveSponsorshipValidationRelease','liveEventInventoryRelease','liveWeekendBannerRelease','liveAdPlacementReportingRelease','liveHouseCampaignValidationRelease'):
    req(site.get(k)=='7.63.6',f'missing release marker {k}')
# Supporter event surface is team-result only.
for token in ('live_following_event_summaries_v1','live_supporter_event_summary_v1'):
    req(token in sql,f'missing event summary RPC {token}')
req('live-event-recap.html' in following_js and 'View event results' in following_js,'Supporter Hub event result bridge missing')
req('live_supporter_event_summary_v1' in event_js,'event page must use server summary RPC')
for forbidden in ('playerStats','live_events','lineups','secondaryPlayer','cap_number'):
    req(forbidden not in event_js,f'free event page exposes detailed player concept: {forbidden}')
req('eventSponsorBanner' in event_html and 'renderWeekendBanner' in event_js,'weekend/tournament banner not mounted')
req('viewer.adFree' in event_js,'paid analytics users must suppress event ads')
# Series-aware serving + scalable placement accounting.
req('live_ad_select_v2' in sql and 'target_series_id' in sql,'series-aware ad selection missing')
req('live.weekend.banner' in ad_js and 'renderWeekendBanner' in ad_js,'weekend ad runtime missing')
req('live_ad_campaign_placement_counters' in sql,'placement counter table missing')
req('live_platform_ad_campaign_reporting_v2' in sql and "'placementMetrics'" in sql,'placement reporting missing')
req('live_platform_ad_campaign_reporting_v2' in commercial_js and 'placementMix' in commercial_js,'commercial placement reporting not wired')
# House validation must be intentional and owner-controlled.
req('live_ad_admin_provision_house_validation_v1' in sql,'house validation provisioning RPC missing')
req('Platform Owner access required' in sql,'house validation must be owner-only')
req('activateHouseValidation' in commercial_html and 'live_ad_admin_provision_house_validation_v1' in commercial_js,'owner activation control missing')
req('Nothing activates automatically with the migration.' in commercial_html,'migration no-auto-activation message missing')
req("'WPI House Validation','draft'" in sql,'house validation must stage new campaign before creative attachment')
req("set status='active'" in sql and sql.index("set status='active'") > sql.index('insert into public.live_ad_campaign_creatives'), 'house validation must activate only after approved creatives are attached')
req('live_ad_admin_provision_house_validation_v1' in repair_sql and "'WPI House Validation','draft'" in repair_sql,'installed-database house validation repair migration missing')
req('v_house_campaign_id uuid;' in ambiguity_fix_sql and '\n  campaign_id uuid;' not in ambiguity_fix_sql,'house validation ambiguity correction must avoid campaign_id PL/pgSQL variable collision')
req('values(v_house_campaign_id,v_banner_id,1)' in ambiguity_fix_sql and 'where c.id=v_house_campaign_id' in ambiguity_fix_sql,'house validation ambiguity correction not wired through campaign writes')
req('live_ad_admin_set_campaign_status_v1' in sql and 'campaign-toggle' in commercial_js,'campaign pause/reactivation control missing')
# House creative is youth-safe and no external programmatic network is enabled.
req("'wpi-house'" in sql and "'approved',true" in sql,'WPI house advertiser must be explicitly approved/youth-safe')
for network in ('googletag','adsbygoogle','doubleclick','adservice.google','prebid'):
    req(network not in (ad_js+event_html+commercial_js).lower(),f'programmatic network unexpectedly enabled: {network}')
# Existing game/recap surfaces use the new ad runtime and paid suppression remains intact.
req('live-ad-delivery-v7-63-6.js?v=7.63.6' in score_html,'public score missing 7.63.6 ad runtime')
req('live-ad-delivery-v7-63-6.js?v=7.63.6' in recap_html,'recap missing 7.63.6 ad runtime')
req('supporterGameSponsorBanner' in game_html and 'live-game-supporter-ads-v7-63-6.js?v=7.63.6' in game_html,'authenticated Supporter game banner surface missing')
req('is-live-viewer' in supporter_game_ads and 'live_analytics_access_level_v1' in supporter_game_ads,'Supporter game ad must require read-only viewer state and suppress paid analytics')
req('team_insights' in supporter_game_ads and 'organization_insights' in supporter_game_ads,'paid Team/Organization Insights suppression missing on Supporter game ad')
req('scorePeriodLabel' in supporter_game_ads and 'gameStatus' in supporter_game_ads,'Supporter game ad rotation must follow natural game-state changes')
# PII/card data must not enter telemetry or event summaries.
for forbidden in ('viewer_email','user_agent','ip_address','card_number','cvv','billing_address','home_address'):
    req(forbidden not in sql.lower(),f'forbidden sensitive field introduced: {forbidden}')
# Protected mature scoring/delivery files remain byte-identical.
expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'}
for rel,h in expected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f'Protected file changed: {rel}')
print('WPI 7.63.6 sponsorship validation + event inventory regression passed.')
