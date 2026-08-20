# WPI 7.63.9 — Install

1. Apply the patch over the authoritative pushed WPI 7.63.8 project.
2. Run `./release-check-live-7.63.9`.
3. No Supabase migration or Edge Function redeploy is required.
4. Run `./release-check-clean`.
5. Commit/push.
6. Live-site validation:
   - My Teams loads personalized team cards before discovery.
   - A followed/member Live team shows live/next/latest context and Team Insights.
   - Team Hub shows exact team identity, grouped games, record/event context and Team Insights.
   - Follow/unfollow remains read-only and does not change team membership or scoring authority.
   - Anonymous/public team views do not expose player analytics.

No Stripe activation, new secrets or infrastructure changes are required.
