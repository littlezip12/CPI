# WPI 7.64.8 — Game-Day Speed & Storytelling Handoff

Built from the authoritative pushed WPI 7.64.7 ZIP `CPI-main - 2026-09-14T232723.897.zip`.

## Product decisions implemented

### Flexible player identity and caps

Permanent roster identity now supports cap number only, player name only, or both. Game-day cap assignments are stored with the game state and do not overwrite the permanent roster identity. An attached event/series can store reusable cap defaults; a game override takes precedence over event cap, which takes precedence over the permanent/default cap.

### Quick Time Pad

The scoring workflow is event-first. After an action and required player are selected, a large time pad opens. Compact values such as `632`, `105`, and `48` resolve to `6:32`, `1:05`, and `0:48`. Same-time and +/- one-second actions reduce repeated clock entry. No running/automatic game clock was introduced.

### Game Story + Game Stats

The recap headline section is now Game Story. It uses canonical structured game events to generate a short narrative using result/margin, defensive activity, offensive production, and positive player leaders in goals, assists, saves, steals, and blocks. Strong losses can be described candidly at team level, but individual youth players are never singled out negatively. Existing stat presentation remains available separately.

## Database

Migration: `202609160001_game_day_speed_storytelling.sql`.

No production data is fabricated or seeded. No BAWPL opponents/times were created. BAWPL can be created as an ongoing WPI Live series and games can be attached when authoritative opponent/time details are known.

## Protected foundation

The original protected files retain their historical hashes:

- `js/live-backend-v7-56-8.js` — `fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328`
- `js/live-game-v7-58-6.js` — `5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76`
- `js/live-game-storage-v7-58-6.js` — `ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353`
- `supabase/functions/groupme-post/index.ts` — `1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6`
- `supabase/functions/roster-extract/index.ts` — `26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb`

7.64.8 introduces successor `live-backend-v7-64-8.js` and `live-game-v7-64-8.js` for intentional new behavior.

## Validation

`./release-check-live-7.64.8` passes through the full chained Live regression stack to 7.64.0 and related public/tournament regressions. The monolithic `./release-check-clean` exceeds the build container's execution window, but its long legacy sections and remaining tail were run in segments with no product failures after stale version/current-season assertions were updated. Tyler should still run `./release-check-clean` locally before commit/push.
