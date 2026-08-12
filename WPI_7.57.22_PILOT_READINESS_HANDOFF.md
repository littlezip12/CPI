# WPI 7.57.22 — Pilot Readiness & Operational Hardening

## Baseline
Built cumulatively from pushed WPI 7.57.21 (`CPI-main - 2026-08-11T205554.368.zip`).

## Product intent
This is a stabilization release, not a new feature layer. The scoring, handoff, reopen/re-final, GroupMe, Supporter, roster, tournament reconciliation, account registry, and weekend archive foundations remain intact.

## New behavior
- `Game ready check` appears before Start game and checks Matchup, Roster, Scorer, Connection, and Score updates in plain language.
- Start game is gated only by the essential protections: valid matchup, enough roster players, canonical remote game record, and active scorer authority. GroupMe and internet connectivity are visible warnings rather than blockers once scorer authority is established.
- A poolside sync badge is visible during live scoring.
- Offline play is explicitly retained on-device and remote sync is deferred until connectivity returns.
- Online recovery automatically refreshes scorer control, delivery status, and pending remote sync.
- Page restore / app resume performs the same continuity refresh.
- Focused release regression permanently checks the handoff/reopen/re-final reliability sequence is still present.

## Infrastructure
- No Supabase migration.
- No Edge Function changes.
- No new secrets.
- Do not redeploy `groupme-post` or `roster-extract`.

## Protected architecture
Do not regress:
- exactly one active scorer
- Supporter game-scoped handoff without permanent promotion
- GroupMe delivery / retries / audit
- score preservation on reopen
- repeat Final → Reopen → Final cycles
- fresh full recap on each later Final
- Final Whistle sequencing
- tournament/manual reconciliation to one canonical game

## Hosted pilot acceptance
1. Open a saved Game-Day game. Confirm Game ready check.
2. Verify Start game stays disabled until matchup, roster, remote game, and scorer authority are ready.
3. Start and record a normal play.
4. Disable Wi-Fi briefly. Confirm `Offline · saved here`, record a play, and verify the score/play remains on the device.
5. Restore Wi-Fi. Confirm WPI automatically returns to syncing/synced and the saved play reaches the server/GroupMe without reload.
6. Background/foreground or refresh the page and confirm scorer authority recovers.
7. Run scorer handoff, score on the new device, Final, Reopen, score immediately, Final again, and confirm a new complete recap.

## Next milestone
If this passes real poolside use, avoid speculative feature releases. Validate a real Scrimmage Weekend and the first available official 2026–2027 tournament schedule, then target WPI 7.58.0 as the stable pilot baseline.
