# WPI 7.63.0 — Analytics, Entitlements & Monetization Foundation

## Scope

- Adds server-derived finalized-game analytics built from canonical active `live_events`.
- Final → analytics current; Reopen → analytics invalidated; Final again → analytics regenerated with a new revision.
- Adds `team_insights` and `organization_insights` entitlement infrastructure without coupling analytics access to operational roles or billing.
- Seeds the existing WPI Platform Owner with platform-wide Organization Insights access for the initial private analytics phase.
- Closes the authenticated follower raw-data gap: following a team alone no longer grants direct `live_events`, `live_lineups`, or `live_game_recaps` table reads.
- Keeps the current team/result recap available to free Supporters while detailed player stats, lineups, event timeline, and recap analytics/text require team membership or detailed analytics entitlement.
- Adds scale-oriented finalized-game/event indexes.
- Adds Platform-Owner-only advertiser, creative, campaign and ad-reporting tables.
- Campaigns support platform/region/organization/team/tournament/weekend/game scope, exclusivity, share of voice, event tier, commercial model, contract value, payment status and impression caps.
- Enforces WPI advertiser + creative approval and explicit youth-safe approval before a campaign may be scheduled/activated.
- Adds private ad delivery accounting storage but intentionally exposes no public/client telemetry writer yet.
- Adds `docs/WPI_SCALE_MONETIZATION_SECURITY_PLAN_2026-08-16.md` as the living scale/business/security plan.

## Explicitly NOT in 7.63.0

- No Stripe/billing integration.
- No subscription checkout.
- No live-game ad rendering.
- No recap interstitial yet.
- No public programmatic ad-network integration.
- No GitHub Pages hosting migration yet.
- No public-score Broadcast migration yet.
- No server-side 6,000-game scoreboard pagination yet.
- No Edge Function changes or redeploys.
- No changes to the protected scoring engine files.

## Supabase migration

Apply:

`supabase/migrations/202608170001_analytics_entitlements_monetization_foundation.sql`

The migration is additive except for the intentional follower privacy policy tightening and the privacy-aware replacement of `live_game_recap_detail_v1`.

## Validation

```bash
./release-check-live-7.63.0
./release-check-clean
```

## Important access behavior after migration

- Platform Owner: full detailed analytics across WPI.
- Existing team members: current detailed recap behavior is preserved for operations.
- Future Team/Organization Insights entitlement: full detailed analytics through entitlement-aware RPCs.
- Follower only / Free Supporter: final score, event metadata and period progression remain; player stats, lineups, complete event timeline and detailed recap text/analytics are private.

## Infrastructure

- One Supabase SQL migration.
- No Edge Function redeploy.
- No new secret.
- No payment provider setup required.
- No advertiser setup required.
