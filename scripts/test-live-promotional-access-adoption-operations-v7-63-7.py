#!/usr/bin/env python3
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def req(c,m):
    if not c: raise AssertionError(m)
def read(rel):
    p=ROOT/rel; req(p.exists(),f'Missing file: {rel}'); return p.read_text(encoding='utf-8')
version=read('VERSION.md'); site=json.loads(read('config/site-release.json'))
sql=read('supabase/migrations/202608170010_team_insights_preview_operations.sql')
foundation=read('supabase/migrations/202608170005_promotional_access_billing_readiness.sql')
html=read('live-commercial.html'); js=read('js/live-commercial-v7-63-7.js'); css=read('css/live-commercial-v7-63-7.css')
insights_html=read('live-team-insights.html'); insights_js=read('js/live-team-insights-v7-63-5.js')
req('WPI 7.63.7' in version,'VERSION missing 7.63.7')
req(site.get('version')=='7.63.7','site release mismatch')
req(site.get('livePromotionalAccessOperationsRelease')=='7.63.7','preview operations marker missing')
req(site.get('liveAdoptionOperationsRelease')=='7.63.7','adoption operations marker missing')
for token in ('live_team_insights_preview_admin_snapshot_v1','live_team_insights_preview_series_v1','live_team_insights_preview_admin_save_v1','live_team_insights_preview_admin_set_status_v1'):
    req(token in sql,f'Missing preview admin RPC: {token}')
req(sql.count('Platform Owner access required')>=4,'all preview admin RPCs must be Platform Owner-only')
req("scope_type_value not in ('platform','organization','team')" in sql,'preview scope allowlist missing')
req('no_payment_method_required=true' in sql.replace(' ',''),'preview must explicitly require no payment method')
req("ends_value <= starts_value" in sql and "promo.ends_at <= now()" in sql,'preview date/expiration safety missing')
req('reference_series_value' in sql and 'series_team<>team_value' in sql,'optional event reference must be team-scoped safely')
req("p.status='active'" in foundation and 'p.starts_at <= now()' in foundation and 'p.ends_at > now()' in foundation,'existing preview access must remain time-bounded')
req('public.live_is_team_follower(target_team_id)' in foundation,'preview still must require existing team/follower context')
for token in ('previewForm','previewScope','previewOrganization','previewTeam','previewSeries','previewStart','previewEnd','data-preview-days="3"','data-preview-days="7"','data-preview-days="14"','previewTable'):
    req(token in html,f'Missing preview operations UI: {token}')
for token in ('live_team_insights_preview_admin_snapshot_v1','live_team_insights_preview_series_v1','live_team_insights_preview_admin_save_v1','live_team_insights_preview_admin_set_status_v1','renderPreviews','previewScopeVisibility','No event reference'):
    req(token in js,f'Missing preview operations client behavior: {token}')
req('live-commercial-v7-63-7.js?v=7.63.7' in html and 'live-commercial-v7-63-7.css?v=7.63.7' in html,'commercial page must load 7.63.7 assets')
req('commercial-preview-panel' in css and 'preview-status' in css,'preview operations styling missing')
# Existing customer preview UX stays clear and no-card.
for token in ('insightsPromotionBanner','Free Team Insights preview'):
    req(token in insights_html,f'Team Insights preview banner missing: {token}')
req('No card required.' in insights_js and 'returns to free Supporter access' in insights_js,'preview customer message must state no card + automatic return to free')
# Stripe/payment collection remains dormant.
req(site.get('liveBillingReadinessRelease')=='7.63.4','billing readiness marker should not advance')
req("'preview'" in foundation and 'checkout_status' in foundation,'billing checkout must remain preview-only')
for forbidden in ('card_number','cvv','billing_address','home_address','viewer_email','ip_address'):
    req(forbidden not in sql.lower(),f'forbidden sensitive field introduced: {forbidden}')
# Mature protected scoring/delivery files stay byte-stable.
expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'}
for rel,h in expected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f'Protected file changed: {rel}')
print('WPI 7.63.7 promotional access + adoption operations regression passed.')
