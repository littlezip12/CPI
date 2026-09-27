# Install WPHQ 7.64.31 — Live Delivery & Finalization Reliability

This release intentionally changes the connected scorer/backend delivery path, one Supabase RLS contract, and the GroupMe Edge Function. It does **not** change Quick Time/event-entry behavior; that work is reserved for 7.64.32.

## Install

1. Install the 7.64.31 patch at the repository root.
2. Run:

   ```bash
   ./release-check-live-7.64.31
   ```

3. Apply this migration in the Supabase SQL Editor:

   `supabase/migrations/202609260001_live_delivery_finalization_reliability.sql`

   The migration replaces read policies only; it does not delete games, events, rosters, analytics, or GroupMe history.

4. Deploy the successor GroupMe function:

   ```bash
   npx supabase functions deploy groupme-post-v7-64-31 --project-ref jmdamtxspyshjxgmunda
   ```

   Do not use `--no-verify-jwt`. The existing protected GroupMe credential is reused; no new secret is required.

5. Re-run `./release-check-live-7.64.31` after the server deployment.
6. Commit/push only after that focused gate passes and the live validation below is complete.

`release-check-clean` is not required for this release; the repository still contains unrelated legacy global validators with stale release allowlists. The 7.64.31 focused chain is the authoritative gate for this patch.

## Focused live validation

Use a disposable/manual game rather than an upcoming real game.

1. Owner starts the game and records one play. Confirm GroupMe receives it.
2. Create a scorer handoff QR/code and let a second account/device accept it.
3. Guest scorer records at least two plays. Confirm they persist immediately and GroupMe continues without waiting for takeover.
4. Guest scorer ends the game with Final Whistle. Do **not** take over as admin.
5. Confirm the game becomes final, analytics/recap are visible, the guest scorer session ends, and GroupMe receives the final quarter + Game Story/team stats.
6. Reopen/owner recovery should remain available only through the existing permission-aware recovery rules.

## Explicitly deferred

- rapid-tap / event-composition race protection
- Back/Cancel during event composition
- iPhone input zoom/focus polish
- email/password account UX
- Organization Insights player-identity aggregation

Those remain the agreed 7.64.32–7.64.34 roadmap.
