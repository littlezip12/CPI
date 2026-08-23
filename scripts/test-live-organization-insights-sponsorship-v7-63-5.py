#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def req(c,m):
    if not c: raise AssertionError(m)
def read(rel):
    p=ROOT/rel; req(p.exists(),f'Missing file: {rel}'); return p.read_text(encoding='utf-8')
version=read('VERSION.md'); site=json.loads(read('config/site-release.json'))
sql=read('supabase/migrations/202608170006_organization_insights_sponsorship_operations.sql')
org_html=read('live-organization-insights.html'); org_js=read('js/live-organization-insights-v7-63-5.js'); org_css=read('css/live-organization-insights-v7-63-5.css')
commercial_html=read('live-commercial.html'); commercial_js=read('js/live-commercial-v7-63-5.js'); commercial_css=read('css/live-commercial-v7-63-5.css')
ad_js=read('js/live-ad-delivery-v7-63-5.js'); ad_css=read('css/live-ad-delivery-v7-63-5.css')
score_html=read('live-score.html'); score_js=read('js/live-public-score-v7-63-5.js'); recap_html=read('live-game-recap.html'); recap_js=read('js/live-game-recap-v7-63-5.js')
team_html=read('live-team-insights.html'); team_js=read('js/live-team-insights-v7-63-5.js')
premium_cta_css=read('css/live-team-insights-cta-v7-63-5.css')
action_button_css=read('css/live-action-buttons-v7-63-5.css')
dashboard_html=read('live-dashboard.html'); following_html=read('live-following.html')
req(any(v in version for v in ('WPI 7.63.5','WPI 7.63.6','WPI 7.63.7','WPI 7.63.8','WPI 7.63.9','WPI 7.64.0','WPI 7.64.1','WPI 7.64.2')),'VERSION missing 7.63.5+')
req(site.get('version') in {'7.63.5','7.63.6','7.63.7','7.63.8','7.63.9','7.64.0','7.64.1','7.64.2'},'site release mismatch')
for k in ('liveOrganizationInsightsRelease','liveSponsorshipOperationsRelease','liveDirectAdDeliveryRelease','liveAdAccountingScaleRelease'): req(site.get(k)=='7.63.5',f'missing marker {k}')
# Organization Insights access must be entitlement/server enforced.
for token in ('live_has_organization_insights_access_v1','live_organization_insights_directory_v1','live_organization_insights_overview_v1'):
    req(token in sql,f'missing organization analytics function {token}')
req("e.entitlement_type='organization_insights'" in sql,'Organization Insights entitlement check missing')
req("raise exception 'Organization Insights access required'" in sql,'Organization Insights must fail closed')
for token in ('team-by-team performance','Cross-team production','live_organization_insights_overview_v1'):
    req(token.lower() in (org_html+org_js).lower(),f'Organization Insights UX missing {token}')
# Direct ad system: approved advertiser AND exact creative, direct-paid/waived only, contextual scope only.
for token in ('live_ad_campaign_counters','live_ad_delivery_tokens','live_ad_select_v1','live_record_ad_delivery_v1','live_ad_admin_snapshot_v1','live_ad_admin_save_advertiser_v1','live_ad_admin_save_creative_v1','live_ad_admin_save_campaign_v1'):
    req(token in sql,f'missing ad operation {token}')
req("a.status='approved' and a.youth_safe_approved" in sql,'advertiser whitelist missing')
req("cr.status='approved' and cr.youth_safe_approved" in sql,'creative whitelist missing')
req("a.advertiser_type='house' or c.payment_status in ('paid','waived')" in sql,'direct campaign prepayment/waiver gate missing')
for scope in ("'platform'","'region'","'organization'","'team'","'tournament'","'weekend'","'game'"):
    req(scope in sql,f'missing campaign scope {scope}')
req("c.exclusive desc" in sql and 'share_of_voice' in sql,'takeover/rotation ordering missing')
req('impression_cap' in sql and 'live_ad_campaign_counters' in sql,'scalable impression cap/counters missing')
# Delivery accounting must not collect PII and must be token/idempotency constrained.
for forbidden in ('viewer_email','user_agent','ip_address','card_number','cvv','billing_address'):
    req(forbidden not in sql.lower(),f'forbidden ad telemetry PII: {forbidden}')
req('live_ad_delivery_events_token_type_unique' in sql,'ad event token idempotency missing')
# UI is owner-operated and explicitly youth-safe.
for phrase in ('youth-facing WPI pages','Create campaign','Exclusive takeover','Friendly / fun','Flagship / 500+'):
    req(phrase in commercial_html,f'commercial UX missing {phrase}')
req('live_is_platform_owner' in commercial_js,'commercial page must verify Platform Owner')
# Public Live banners rotate by period, never timer-based ad rotation. Existing score polling remains separate legacy behavior.
req('publicGameAd' in score_html and 'WPILiveAds.renderBanner' in score_js,'public game banner not wired')
req('rotation=g.status==="live"?period(g)' in score_js,'Live banner must rotate by natural game period')
req('live.game.banner' in ad_js,'game banner placement missing')
# Free recap interstitial is short and frequency-capped per game-view session; paid/authorized viewers skip it.
req('showRecapInterstitial' in recap_js and 'seconds:4' in recap_js,'4-second recap interstitial missing')
req('!hasDetailedAnalytics' in recap_js and 'sessionStorage.getItem(recapAdKey)' in recap_js,'recap ad entitlement/frequency cap missing')
req('live.recap.interstitial' in ad_js,'recap ad placement missing')
# Team Insights must read as a distinct premium destination in authenticated navigation.
for page_name,page in (('dashboard',dashboard_html),('supporter hub',following_html),('recap',recap_html),('team insights',team_html),('organization insights',org_html),('commercial',commercial_html)):
    req(any(x in page for x in ('live-action-buttons-v7-63-5.css?v=7.63.5-ui3','live-action-buttons-v7-63-5.css?v=7.63.6')),f'{page_name} missing cache-busted canonical action-button stylesheet')
    stylesheet_hrefs=re.findall(r'<link[^>]+rel=[\"\']stylesheet[\"\'][^>]+href=[\"\']([^\"\']+)',page,re.I)
    req(stylesheet_hrefs and stylesheet_hrefs[-1] in ('css/live-action-buttons-v7-63-5.css?v=7.63.5-ui3','css/live-action-buttons-v7-63-5.css?v=7.63.6'),f'{page_name} canonical action-button stylesheet must load last')
req('#f5dc72' in action_button_css and '#d6a62d' in action_button_css and 'font-weight:900!important' in action_button_css,'Unified premium/bold action-button treatment missing')
req('live-recap-header-actions' in action_button_css and 'org-insights-hero' in action_button_css and 'commercial-hero' in action_button_css,'Unified action-button coverage missing')
# Team/Organization Insights are ad-free; organization navigation is available only with the higher entitlement.
req('organizationInsightsLink' in team_html and 'access.analyticsLevel !== "organization_insights"' in team_js,'Organization Insights navigation entitlement check missing')
req('live-ad-delivery-v7-63-5.js' not in team_html,'paid Team Insights page must not mount advertising runtime')
# No programmatic network or payment activation in this release.
for network in ('googletag','adsbygoogle','doubleclick','adservice.google','prebid'):
    req(network not in (ad_js+score_html+recap_html+commercial_js).lower(),f'programmatic network unexpectedly enabled: {network}')
req('team-insights-billing' not in commercial_js,'commercial ad UI must not activate Stripe billing')
# Protected mature scoring/delivery files remain byte-identical.
expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'}
for rel,h in expected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f'Protected file changed: {rel}')
print('WPI 7.63.5 Organization Insights + sponsorship operations regression passed.')
