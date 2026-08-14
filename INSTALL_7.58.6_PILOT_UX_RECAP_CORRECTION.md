# Install — WPI 7.58.6 Pilot UX + Recap Correction

1. Apply the patch ZIP over the pushed 7.58.6 checkout.
2. Run `./release-check-live-7.58.6`.
3. In Terminal open `supabase/migrations/202608130002_recap_following_pilot_ux_correction.sql` in TextEdit, copy all, paste into Supabase SQL Editor, and Run.
4. Supabase should return `Success. No rows returned`.
5. Reopen a previously failing recap and confirm structured recap/stats render.
6. Run `./release-check`; if it ends `CPI release check passed.`, commit and push.
