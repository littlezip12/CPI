# WPI 7.56.7 — In-Game Scorer Code Claim

- Adds **Enter scorer code** directly to the WPI Live dashboard, active-game history rows, and read-only live game view.
- Allows an already signed-in Viewer, parent, or Scorer to claim temporary game-scoped scoring control without leaving the page or changing their permanent team role.
- Keeps the standalone QR/no-account Guest Scorer flow for people who are not already viewing WPI.
- Promotes the accepted session to effective game scoring authority in the browser while preserving Owner/Admin-only roster, invitation, and GroupMe configuration controls.
- Adds a mobile Share link action to the current scorer’s transfer dialog.
- Preserves exactly one active scorer, previous-device read-only enforcement, audited handoff, and exactly-once GroupMe delivery.
- Requires no new database migration, Supabase setting change, secret reset, or Edge Function deployment.
