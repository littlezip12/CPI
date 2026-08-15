# Install WPI 7.58.9 — Club Operations & Scale Polish

1. Apply the patch ZIP at the repository root.
2. Run `./release-check-live-7.58.9`.
3. Open `supabase/migrations/202608140001_club_operations_scale_polish.sql` in TextEdit, copy all, paste into Supabase SQL Editor, and Run.
4. Run `./release-check`.
5. Commit/push only after the full gate ends with `CPI release check passed.`

No Edge Function redeploy and no new secrets are required.
