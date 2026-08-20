# WPI 7.64.0 — Install

1. Apply the patch over the authoritative pushed WPI 7.63.9 project.
2. Run `./release-check-live-7.64.0`.
3. No Supabase migration or Edge Function redeploy is required.
4. Run `./release-check-clean`.
5. Commit/push.
6. Live-site validation with a Supporter account:
   - Open an active game from My Teams.
   - Confirm the read-only page becomes the new Game Center with Game / Plays / Stats / Info tabs.
   - Confirm score, period and clock continue following the scorer.
   - Confirm latest play and play-by-play update, and Stats/Info load without exposing GroupMe or scorer audit data.
   - Confirm the existing Supporter sponsor banner remains visible when a campaign is eligible.
   - Finish a game and confirm the primary action becomes `View final recap`.
   - Owner/Admin/Scorer should continue seeing the existing scoring console, not fan mode.

No Stripe activation, push notifications, new permissions, new secrets or infrastructure changes are required.
