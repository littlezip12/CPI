# WPHQ 7.64.31 — Live Delivery & Finalization Reliability Handoff

## Why this release exists

Production games on September 26 exposed two linked failures after a successful scorer handoff:

- guest-entered plays remained usable on-device but failed to persist immediately to `live_events`, so GroupMe stopped during the guest scoring window;
- Final Whistle from the handed-off scorer did not complete normally, forcing an Owner/Admin takeover before analytics and recap became available.

Database/log review isolated the primary cause: the 7.63.1 Supporter privacy correction narrowed raw `live_events` SELECT access to permanent Owner/Admin/Scorer membership. A guest scorer had a valid active scorer session and could update the game, lineup and participation, but could not SELECT `live_events`. Because Supabase `INSERT ... RETURNING` also requires row visibility, event persistence produced repeated RLS failures.

## 7.64.31 changes

- Adds `live_has_recent_scorer_session_access(uuid)` for active/read-only scorer sessions plus the existing 30-minute post-final recovery window.
- Restores raw event/lineup/recap operational reads to legitimate scorer sessions while keeping ordinary Supporters outside those tables.
- Uses successor scorer/backend files; the 7.64.11 rollback foundation stays byte-stable.
- Reads delivery audit before the final database update closes the scorer session.
- Final Whistle waits for any prior autosave to finish instead of racing it.
- Adds `groupme-post-v7-64-31` action `flush_game`, which scans canonical persisted events and idempotently fills missing GroupMe deliveries using the existing delivery-claim ledger.
- Final catch-up is authorized only to an active scorer/manager while live, or Owner/Admin / most-recent scorer during the 30-minute final window.

## Not included

No Quick Time, rapid-tap, event-composition, zoom, Back/Cancel, authentication UI, or Organization Insights changes are included. Those are intentionally separate releases.
