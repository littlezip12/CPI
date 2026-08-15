# Install WPI 7.60.3 — Public / Supporter Experience at Scale

1. Apply the patch.
2. Run `./release-check-live-7.60.3`.
3. Apply `supabase/migrations/202608140005_public_supporter_experience_scale.sql`.
4. Run `./release-check-clean`.
5. Commit/push and validate `live-following.html`.

No Edge Function redeploy. No new secret.
