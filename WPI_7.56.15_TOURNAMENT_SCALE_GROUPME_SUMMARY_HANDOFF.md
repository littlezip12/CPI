# WPI 7.56.15 — Tournament-Scale GroupMe Summary Reliability

Baseline: validated/pushed WPI 7.56.14 (`CPI-main - 2026-08-07T225132.276.zip`).

## Why this release exists

A 7.56.14 hosted test exposed a final-sync failure because the full automatic Game Summary was stored in `live_events.note`, whose database constraint intentionally caps notes at 280 characters. End-of-period/final events in the same final sync then remained queued.

The initial 7.56.15 idea of placing a single larger summary in one `message_text` was discarded before installation. GroupMe documents a 1,000-character maximum per individual message, so WPI now treats provider message size and tournament/game storage as separate concerns.

## Capacity model

- Every recorded play remains one independent structured WPI event and one independent GroupMe delivery when GroupMe delivery is enabled.
- There is no WPI 10K/100K character pool shared across a game, tournament, Scores topic, or team.
- One tournament can use one GroupMe main chat + one Scores topic across all games.
- End-game summaries are derived from the complete structured game record and split into as many ordered GroupMe messages as necessary.
- WPI caps each generated outbound summary message at 900 characters, leaving margin below GroupMe's 1,000-character per-message API maximum.
- The aggregate recap is not given a fixed product-level cap. Regression coverage proves a synthetic >100K-character recap is safely represented as independent <=900-character messages.

## Final delivery ordering

The final sequence is explicitly dependent:

`Final Whistle -> Game Summary 1/N -> Game Summary 2/N -> ... -> Game Summary N/N`

Each summary message references the previous event as a prerequisite. If Final Whistle or an earlier summary part has not reached a terminal delivered/suppressed/mock state, later summary parts do not jump ahead.

Existing delivery retry/backoff/audit behavior remains in place. GroupMe publishes rate-limit responses but does not publish an unlimited throughput guarantee; WPI therefore continues to treat delivery as queued/retryable rather than assuming every request will always be accepted immediately.

## Summary contents

The derived GroupMe summary includes:

- final score
- team stats
- period-ending scores when available
- all player stat lines with recorded activity
- scorer-entered notes
- unofficial-stat disclaimer

Individual play notes remain attached to their original structured events; summary text is derived from that data rather than replacing it.

## Database safety

- `live_events.note` remains <=280 characters.
- Each `game_summary` event stores only a compact audit note such as `Game summary 2/4 · Lamorinda A vs Stanford`.
- Full GroupMe text lives in that event's independent `message_text`, capped by WPI at 900 characters.
- Multiple `game_summary` events represent multiple summary parts.
- No new Supabase migration is needed; the 7.56.13 migration already allows `game_summary` events.

## Legacy 7.56.14 recovery

When an ended 7.56.14 game is reopened, WPI detects an unsent oversized legacy summary, removes the unsent local summary representation, rebuilds safe summary chunks, and schedules the existing remote sync/retry path. Already-sent summary messages are never rewritten.

## Protected foundation

Byte-for-byte unchanged in 7.56.15:

- `js/live-backend-v7-56-8.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/migrations/202608070001_groupme_topic_delivery.sql`
- `supabase/migrations/202608080001_game_summary_event.sql`
- 7.56.8 full setup SQL
- dashboard/handoff connected backend assets protected by focused hashes

No GroupMe secret change, Supabase password change, SQL execution, or Edge Function redeploy is required.

## Validation

Focused gate:

```bash
./release-check-live-7.56.15
```

Expected:

`WPI Live 7.56.15 focused release check passed.`

The complete `release-check` was executed in sequential chunks in the build environment and every command passed through the final `CPI release check passed.` line. The local Mac full release gate remains the final pre-push check because it also regenerates deterministic tournament/QA artifacts that should be restored before commit.
