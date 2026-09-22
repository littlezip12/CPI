# Install WPI 7.64.15 — Player Roster Accuracy & Parent Privacy

1. Install the patch.
2. Run `./release-check-live-7.64.15`.
3. Apply `supabase/migrations/202609210002_player_roster_privacy_hardening.sql` in Supabase SQL Editor.
4. Deploy `account-delete-v7-64-15` with JWT verification enabled.
5. Update Supabase Auth controls per `WPI_7.64.15_SUPABASE_PRIVACY_CONTROLS.md`.
6. Run `./release-check-clean`.
7. Commit/push as `WPI 7.64.15 — Player Roster Accuracy & Parent Privacy`.
