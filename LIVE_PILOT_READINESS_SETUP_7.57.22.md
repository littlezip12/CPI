# WPI 7.57.22 — Pilot Readiness & Operational Hardening

## Scope
- Adds a simple Game ready check before starting.
- Adds a visible poolside sync/offline badge.
- Keeps scoring locally when the browser is offline and automatically retries sync when connectivity returns.
- Refreshes scorer authority and delivery state after app resume/page restore.
- Adds permanent regression checks for the validated handoff/reopen/re-final reliability path.

## Infrastructure
No Supabase migration. No Edge Function redeploy. No new secrets.

## Pilot acceptance
1. Open a Game-Day game and confirm Matchup, Roster, Scorer, Connection, and Score updates preflight states.
2. Start Game is enabled only when the game record, roster, matchup, and scorer authority are ready.
3. During a live game, briefly disable Wi-Fi. WPI must show `Offline · saved here`; record a play and confirm it remains on the device.
4. Re-enable Wi-Fi. WPI must automatically sync without a page reload; verify the play reaches Supabase/GroupMe.
5. Refresh/resume the scoring page and confirm scorer authority and delivery status recover.
6. Re-run the proven handoff → Final → Reopen → Final flow and confirm fresh recap delivery.
