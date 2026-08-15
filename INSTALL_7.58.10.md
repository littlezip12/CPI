# Install WPI 7.58.10 — Pilot Launch Prep & Admin Safety

1. Apply the patch ZIP at the repository root.
2. Run `./release-check-live-7.58.10`.
3. Open `supabase/migrations/202608140002_pilot_launch_admin_safety.sql` in TextEdit, copy all, paste into Supabase SQL Editor, and Run.
4. Run `./release-check`.
5. Commit/push only after the full gate ends with `CPI release check passed.`

No Edge Function redeploy and no new secrets are required.
