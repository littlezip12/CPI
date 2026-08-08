# WPI 7.56.13 — Game Actions & Automatic GroupMe Summary

Baseline: validated/pushed WPI 7.56.12 (`CPI-main - 2026-08-07T215104.647.zip`).

## Product changes

### Direct scoring buttons
The poolside scorer no longer has a **More actions** drawer. The seven direct actions are:

1. Goals → **Us / Them**
2. Shots → **Missed / Post / Blocked / Saved**
3. Saves → **Goalie save / Field block**
4. Steals
5. Exclusions → **Drawn by us / Committed by us**
6. Turnover
7. 5M → **Drawn by us / Committed by us**

This keeps every structured 7.56.12 event directly reachable without a hidden all-events select. The internal `eventType` select remains as hidden state only so the established scorer form/event engine stays intact.

### Automatic GroupMe summary
Ending a game now creates exactly one auditable `game_summary` system event after Final Whistle and before final server synchronization.

The GroupMe summary contains:
- final score
- team shots
- goals
- assists
- goalie saves
- field blocks
- steals
- turnovers
- exclusions drawn
- 5M drawn
- up to three recorded contributors

The summary message uses the same persisted `live_events` → `live_deliveries` → `groupme-post` pipeline as scoring events. That preserves existing exactly-once claiming, retry, audit, Topic delivery, Bot fallback and final-game delivery authorization.

## Required migration

The database already constrains `live_events.event_type` to known values. Therefore 7.56.13 includes one minimal forward migration:

`supabase/migrations/202608080001_game_summary_event.sql`

It only extends the existing event-type CHECK constraint with `game_summary`.

No table is created. No RPC/function is changed. No secret changes are required. The GroupMe Edge Function remains byte-for-byte unchanged and does not need redeployment.

**Apply this migration before pushing the frontend live.** Otherwise the browser would attempt to persist `game_summary` against the old CHECK constraint when a game ends.

## Protected behavior

7.56.13 intentionally preserves:
- Supabase auth/roles
- one active scorer
- scorer/Guest Scorer handoff
- Admin takeover
- roster and lineup persistence
- quarter transitions
- OT/shootout
- score/play correction
- all structured analytics fields
- GroupMe Topic delivery
- Bot fallback
- delivery retries/audit
- awaited Final Whistle/final-save sequencing

## Focused validation

Run:

```bash
./release-check-live-7.56.13
```

Expected:

```text
WPI LIVE GAME ACTIONS & AUTO SUMMARY 7.56.13 TEST PASSED
...
WPI Live 7.56.13 focused release check passed.
```

Then run the full release gate and restore generated tournament/QA files afterward, following the normal WPI release workflow.

## Hosted smoke test

After migration + push:

1. Start a brand-new game on phone.
2. Confirm all seven primary action buttons appear and **More actions** is gone.
3. Goals → Us; confirm player/assist/time and GroupMe.
4. Goals → Them; confirm no our-player selection is required and GroupMe.
5. Shots → each outcome at least once.
6. Saves → Goalie save and Field block.
7. Steal, Exclusion, Turnover and 5M.
8. End Quarter; confirm next-quarter lineup and no action Player dropdown opens.
9. End Game.
10. Confirm Final Whistle arrives first.
11. Confirm **GAME SUMMARY** arrives next in the same configured GroupMe Topic.
12. Confirm completed game, recap, analytics and summary event are present in WPI history/audit data.
