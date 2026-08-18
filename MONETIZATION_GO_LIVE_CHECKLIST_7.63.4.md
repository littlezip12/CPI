# WPI Monetization Go-Live Checklist — 7.63.4

WPI 7.63.4 deliberately builds promotional-access and Stripe-ready subscription infrastructure while keeping checkout disabled. Complete this checklist before changing Team Insights checkout from `preview` to `active`.

## Business / finance
- Form the chosen business entity and obtain formation records.
- Obtain an EIN directly from the IRS.
- Open a separate business bank account and route all WPI revenue/expenses through it.
- Establish bookkeeping/accounting and a tax-reserve process.
- Confirm whether a DBA/fictitious business name filing is needed for the WPI/Water Polo Index brand.
- Complete a CPA review of federal/state income tax treatment and sales-tax/economic-nexus monitoring.

## Legal / customer terms
- Review WPI Terms of Service.
- Review Privacy Policy and youth/COPPA posture with qualified counsel before broad commercialization.
- Publish subscription, cancellation, refund and renewal terms.
- Establish a customer-support/business contact channel.
- Confirm adult purchaser language. WPI checkout is designed to require the purchaser to confirm they are 18+ and authorized; do not collect DOB solely for billing.
- Perform brand/trademark clearance before meaningful paid expansion.

## Security / privacy
- Keep card number, CVV, payment method secrets and home addresses out of WPI databases.
- Require MFA for Platform Owner / production administrative accounts.
- Keep Stripe and Supabase privileged secrets server-side only.
- Complete RLS/privacy regression checks and verify free Supporters cannot retrieve entitled analytics.
- Enable an appropriate production backup/PITR policy before meaningful paid scale.
- Establish incident-response and account-recovery procedures.

## Production infrastructure
- Move the commercial production site from GitHub Pages to an appropriate production static/CDN host while keeping GitHub as source control.
- Use a WPI-controlled production domain and HTTPS.
- Configure production monitoring/logging and error alerting.
- Keep scale upgrades demand-driven; do not buy high-scale Supabase/hosting tiers until measured usage requires them.

## Stripe test-mode activation
- Create Team Insights product/prices: $5 monthly and $50 annual.
- Add the Stripe test price IDs to `live_subscription_prices` (`environment='test'`).
- Configure server-side secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `WPI_BILLING_ENVIRONMENT=test`, `WPI_PUBLIC_BASE_URL`.
- Deploy `team-insights-billing` and `stripe-subscription-webhook` only after test-mode configuration is intentional.
- Register the Stripe webhook endpoint and keep signature verification enabled.
- Test: successful purchase, adult confirmation, cancellation, cancel-at-period-end, renewal, failed payment, recovery, duplicate webhook delivery, refund/exception handling, and customer portal.
- Verify subscription webhooks grant/revoke only the correct team entitlement.

## Free adoption preview
- Create no-card Team Insights promotional windows for selected teams/organizations/platform dates.
- Make the preview end date obvious in-product.
- Do not auto-enroll preview users into a paid subscription.
- When the preview expires, Supporters automatically return to free access unless they explicitly subscribe.
- Measure preview usage and conversion so launch pricing can be revisited with real evidence.

## Live-money activation
Only after the above is complete:
- configure live Stripe price IDs (`environment='live'`),
- switch server secrets to live mode,
- run a real low-dollar controlled purchase/refund validation,
- set `live_subscription_products.checkout_status='active'`,
- monitor the first transactions and entitlement changes closely.
