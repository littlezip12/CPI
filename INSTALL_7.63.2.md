# WPI 7.63.2 — Team Insights Experience

## Purpose
Turn the analytics/privacy foundation into the first usable Team Insights experience while keeping checkout disabled until billing is intentionally built.

## Product behavior
- Free Supporter: final score + period progression + Team Insights upgrade CTA.
- Team Insights launch price: **$5/month or $50/year**.
- Checkout status in this release: **preview only**. No payment is collected.
- Owner/Admin/Scorer: detailed analytics included through operational team access.
- Team Insights entitlement: detailed analytics for the entitled team.
- Organization Insights entitlement: detailed analytics across the entitled organization.

## Detailed analytics experience
- Canonical game totals derived from `live_game_analytics`.
- Permanent player game stats / lineups / event timeline remain on the game recap.
- Tournament and Scrimmage Weekend combined record + team totals + player totals.
- Full-season record + team totals + player totals.
- Game list links back to individual canonical game analytics.

## Privacy correction carried forward
7.63.2 closes the remaining direct `live_game_analytics` policy gap: `viewer` / Supporter membership no longer grants direct analytics-row access. Detailed analytics requires Owner/Admin/Scorer or an explicit Team/Organization Insights entitlement.

## Recap UI correction
The recap page previously showed its hidden Loading/Error panels because the page CSS `display:grid` rule overrode the browser's `[hidden]` behavior. 7.63.2 adds a scoped `[hidden]{display:none!important}` rule so success, loading, locked and error states display correctly.

## Migration
`supabase/migrations/202608170003_team_insights_experience.sql`

## No redeploys / secrets
- No Edge Function redeploy.
- No new secrets.
- No Stripe integration yet.
- No advertising rendering yet.
- No scoring / GroupMe changes.
- No infrastructure tier upgrade required.
