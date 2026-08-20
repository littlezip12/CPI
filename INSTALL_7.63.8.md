# WPI 7.63.8 — Install

1. Apply the patch over the current WPI 7.63.7 project.
2. Run `./release-check-live-7.63.8`.
3. Run Supabase migration `202608190001_free_team_insights_launch_mode.sql`.
4. Run `./release-check-clean`.
5. Commit/push.
6. Validate with a Supporter account: detailed recap + Team Insights should be unlocked with no upgrade prompt; free-user ads should remain eligible.

No Edge Function redeploy, Stripe activation, secrets, or infrastructure changes are required.
