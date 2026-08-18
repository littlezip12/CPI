# WPI 7.63.6 — Sponsorship Validation & Event Inventory

## Included
- Free Supporter tournament/weekend result pages.
- `live.weekend.banner` inventory mounted on the event result surface.
- Series-aware direct sponsorship selection.
- Placement-level O(1) impression/click counters and reporting.
- Platform Owner-controlled 24-hour WPI house validation campaign.
- Campaign pause/reactivation controls.
- No third-party/programmatic ad network.
- Stripe/payment collection remains disabled.

## Supabase migration
`supabase/migrations/202608170007_sponsorship_validation_event_inventory.sql`

No Edge Function redeploy and no new secrets.

The migration does NOT activate the WPI house campaign. Platform Owner must explicitly click **Activate WPI test for 24 hours** in Commercial Operations after deployment.
