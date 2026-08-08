# WPI 7.56.15 — Tournament-Scale GroupMe Summary Reliability

WPI 7.56.15 is built directly on the validated **7.56.14 Action Flow Cleanup & Team Labels** baseline.

## Release focus

- Keeps every recorded play as an independent GroupMe delivery; there is no WPI character pool shared across a game, tournament, topic, or team.
- Builds the end-of-game recap from the complete structured game record and splits it into as many ordered GroupMe messages as required.
- Caps each outbound GroupMe summary message at a conservative 900 characters, below GroupMe's documented 1,000-character per-message maximum.
- Summary parts are explicitly chained: Final Whistle -> Summary 1/N -> Summary 2/N -> ... -> Summary N/N. A failed prerequisite prevents later parts from jumping ahead.
- Uses compact <=280-character audit notes for each `game_summary` database event, eliminating the 7.56.14 `live_events_note_check` final-sync failure.
- Includes all player stat lines and scorer-entered notes in the derived recap; the aggregate recap has no fixed WPI product cap because it is persisted as structured events plus independent summary chunks.
- Repairs an unsent legacy 7.56.14 oversized Game Summary when the ended game is reopened.
- Preserves the seven direct action buttons, team-name Goal labels, scorer handoff, Topic delivery, Bot fallback, delivery retries/audit, and final-save sequencing.

## Tournament capacity model

A tournament can use one GroupMe main chat with one Scores topic for all games. Each play and each summary chunk is a separate message/event. Eight games do not consume a shared 10K/100K allowance. GroupMe's external rate limiting is handled by WPI's existing queued retry/backoff path; no undocumented unlimited provider throughput is assumed.

## Infrastructure

No new Supabase migration, GroupMe secret, database password, or Edge Function redeploy is required. The 7.56.13 `game_summary` event-type migration remains the only schema prerequisite for automatic summaries.
