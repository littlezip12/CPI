# WPI 7.56.2 — GroupMe Delivery and Audit Foundation

- Connects WPI Live to GroupMe through an authenticated Supabase Edge Function.
- Stores every scored play in WPI before attempting parent-message delivery.
- Atomically claims each event so simultaneous scorer devices cannot ordinarily send the same play twice.
- Adds Owner/Admin setup for a team GroupMe destination and a safe test-message workflow.
- Keeps each GroupMe bot ID in a named Supabase Edge Function secret; no bot credential is stored in GitHub, Postgres, or browser JavaScript.
- Adds persistent sent, queued, failed, suppressed, and retry status for each outbound play.
- Adds an immutable per-attempt audit trail with response code, error, actor, trigger source, and timestamp.
- Adds scorer-visible delivery status and manual retry controls; failed rows remain queued across refreshes and devices.
- Retries while an authorized WPI Live client is open using 1-, 5-, 15-, and 60-minute backoff windows.
- Preserves connected authentication, permanent game storage, roles, realtime resume, overtime, shootout, offensive shot tracking, and all immutable WPI ranking/tournament data.
