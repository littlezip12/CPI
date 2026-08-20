#!/usr/bin/env python3
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]

def req(c,m):
    if not c: raise AssertionError(m)
def read(r):
    p=ROOT/r; req(p.exists(),f'Missing file: {r}'); return p.read_text(encoding='utf-8')
version=read('VERSION.md'); site=json.loads(read('config/site-release.json'))
sql=read('supabase/migrations/202608170005_promotional_access_billing_readiness.sql')
html=read('live-team-insights.html'); js=read('js/live-team-insights-v7-63-4.js'); css=read('css/live-team-insights-v7-63-4.css')
billing=read('supabase/functions/team-insights-billing/index.ts'); webhook=read('supabase/functions/stripe-subscription-webhook/index.ts'); config=read('supabase/config.toml')
req(any(v in version for v in ('WPI 7.63.4','WPI 7.63.5','WPI 7.63.6','WPI 7.63.7','WPI 7.63.8')),'VERSION missing 7.63.4+'); req(site.get('version') in {'7.63.4','7.63.5','7.63.6','7.63.7','7.63.8'},'site release mismatch')
req(site.get('livePromotionalAccessRelease')=='7.63.4','promo release marker missing'); req(site.get('liveBillingReadinessRelease')=='7.63.4','billing marker missing')
for n in ['live_team_insights_promotions','live_active_team_insights_promotion_v1','live_subscription_prices','live_billing_customers','live_billing_subscriptions','live_billing_events','live_apply_team_insights_subscription_v1','live_team_insights_commerce_status_v1']:
    req(n in sql,f'Missing SQL foundation: {n}')
req("p.status='active'" in sql and 'p.starts_at <= now()' in sql and 'p.ends_at > now()' in sql,'promotions must auto-expire by time')
req("public.live_is_team_follower(target_team_id)" in sql,'promotion must require team context')
req("subscription_status_value in ('active','trialing','past_due')" in sql,'billing entitlement lifecycle missing')
for n in ['insightsPromotionBanner','monthlyPlanButton','annualPlanButton','manageSubscriptionButton','adultPurchaserConfirm']:
    req(n in html and n in js,f'Missing commerce UX: {n}')
req('Subscriptions are not live yet. No payment will be collected.' in js,'checkout preview guard missing')
req('live_team_insights_commerce_status_v1' in js,'commerce status RPC missing')
req('team-insights-billing' in js,'billing function hook missing')
for n in ['STRIPE_SECRET_KEY','WPI_BILLING_ENVIRONMENT','WPI_PUBLIC_BASE_URL','checkoutStatus !== "active"','adult_purchaser_confirmed','Adult purchaser confirmation is required','stripe.checkout.sessions.create','stripe.billingPortal.sessions.create']:
    req(n in billing,f'Missing billing behavior: {n}')
req('stripe.webhooks.constructEventAsync' in webhook,'Stripe webhook signature verification missing')
req('live_apply_team_insights_subscription_v1' in webhook,'webhook must apply server-side subscription state')
req('[functions.stripe-subscription-webhook]' in config and 'verify_jwt = false' in config,'webhook JWT config missing')
req('sk_test_REPLACE_ME' not in billing+webhook,'example secret must never be embedded in function source')
req('payment_method_id text' not in sql.lower() and 'card_last4' not in sql.lower() and 'billing_address' not in sql.lower(),'billing schema must not store payment-method/card/address fields')
# Protected mature scoring/delivery files must stay byte-identical.
expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'}
for rel,h in expected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f'Protected file changed: {rel}')
print('WPI 7.63.4 promotional access + billing readiness regression passed.')
