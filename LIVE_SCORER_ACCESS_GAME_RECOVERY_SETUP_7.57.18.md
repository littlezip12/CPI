# WPI 7.57.18 — Scorer Access & Game Recovery

## Product changes
- Team Access now gives Supporters an explicit **Make scorer** action.
- The existing role dropdown also routes Supporter → Scorer through the new dedicated server RPC.
- The scoring form now shows an always-visible **Notes · Optional** field.
- **More controls** is renamed **Game actions**; mobile **More** becomes **Actions**.
- Final games now offer **Reopen game** for accidental early endings.

## Reopen-game safety
- Owner/Admin may reopen a final game.
- The most recent Scorer (including a Guest Scorer on the still-open device) may reopen within 30 minutes.
- Reopening creates a new active scorer session; it does not revive the closed session.
- Automatically generated final-summary events and an accidental `Final whistle` quarter-end event are voided in structured data before scoring continues.
- Previously delivered GroupMe messages remain in delivery audit. If messages are active, WPI sends a correction that the game was reopened.
- The next real Final Whistle creates a fresh final summary.

## Supabase
Apply:

`supabase/migrations/202608110001_scorer_access_game_recovery.sql`

No Edge Function redeploy and no new secret.

Do not redeploy `groupme-post` or `roster-extract`.
