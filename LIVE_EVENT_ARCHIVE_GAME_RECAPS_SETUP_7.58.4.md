# WPI Live 7.58.4 — Event Archive & Game Recaps

7.58.4 turns the existing durable game-series model into an explicit event archive and adds permanent recap-only game pages.

## Canonical event model

`live_game_series` remains the durable parent record for:
- Tournament
- Scrimmage Weekend

Each `live_games` record continues to keep its stable game UUID and points to one `series_id`.

The release does **not** create a second archive copy of a game. Moving a game between event containers changes only the event relationship; the game, score, structured events, lineups, scorer history, roster association, official reconciliation identity, and GroupMe delivery history remain on the same canonical game record.

## Scrimmage Weekend creation

Friendly creation now offers:
- an existing current-season Scrimmage Weekend, or
- **Create new Scrimmage Weekend…**

This allows Game 1 / Game 2 / Game 3 from the same weekend to attach intentionally to one event record instead of requiring repeated free-text labels.

## Explicit event reconciliation

New RPC:

`live_merge_game_series_v1(source_series_id, target_series_id)`

Rules:
- authentication required
- Owner/Admin required
- same team
- same series type
- same competitive season
- two different official tournament identities cannot be merged
- existing games are reassigned to the target event
- games are never duplicated
- source event is deleted only after it is empty
- every merge writes an audit record to `live_game_series_merge_audit`

There is deliberately no automatic historical merge heuristic.

## Permanent Game Recap detail

New RPC:

`live_game_recap_detail_v1(target_game_id)`

The recap response is built from structured records and includes:
- final game metadata and score
- Tournament / Scrimmage Weekend metadata
- approved or saved recap copy where available
- period score checkpoints
- lineups / starters with player names
- active scoring timeline
- per-player structured stats
- Owner/Admin-only GroupMe delivery audit counts

It intentionally does **not** return `live_games.state_snapshot`.

Read access follows `live_can_view_game`, so valid followers can view recap-safe content without receiving operational permissions.

## Season archive

New RPC:

`live_game_series_archive_v3(target_team_id)`

It preserves the season-aware event archive and W-L-T behavior while adding manager capability metadata used by the explicit **Merge event** UI.

## Browser routes

Completed games now link to:

`live-game-recap.html?game=<game_uuid>`

rather than treating the active scoring page as the permanent archive destination.

## Infrastructure

Required migration:

`202608130001_event_archive_game_recaps.sql`

No Edge Function redeploy and no new secret.
