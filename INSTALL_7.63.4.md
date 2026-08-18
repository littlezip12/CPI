# WPI 7.63.4 — Promotional Access & Billing Readiness

## What this release does
- Adds no-card promotional Team Insights access windows that automatically expire.
- Preserves $5/month and $50/year launch pricing.
- Adds Stripe-ready price, customer, subscription, and signed-webhook event ledgers.
- Adds disabled-by-default `team-insights-billing` and `stripe-subscription-webhook` Edge Functions.
- Adds Team Insights preview/subscription status UX.
- Requires an explicit 18+ / authorized-purchaser confirmation before checkout can open once billing is activated.
- Stores no card number, CVV, payment method, home address, or Stripe secret in WPI.

## What is NOT live yet
Checkout stays `preview`. Do not activate it until WPI has a business entity/banking setup, reviewed Terms/Privacy/Refund-Cancellation terms, a commercial production host/domain, Stripe account/products/prices, and server-side secrets.

## Migration
`supabase/migrations/202608170005_promotional_access_billing_readiness.sql`

## Edge Functions
Files are included but should NOT be deployed yet unless Stripe test-mode setup is intentionally being configured:
- `supabase/functions/team-insights-billing/index.ts`
- `supabase/functions/stripe-subscription-webhook/index.ts`

When the business is ready, configure test mode first, add Stripe price IDs to `live_subscription_prices`, set server-side secrets, deploy the functions, register the webhook, validate test payments/cancel/retry/renewal, then separately enable live mode.

## Go-live checklist
See `MONETIZATION_GO_LIVE_CHECKLIST_7.63.4.md` before activating live payment collection.
