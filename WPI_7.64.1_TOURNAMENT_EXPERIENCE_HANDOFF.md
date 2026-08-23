# WPI 7.64.1 — Tournament Experience Handoff

WPI 7.64.1 connects the public WPI Live score stream into tournament-level destinations.

## Public Tournament Center

Route: `live-tournament.html`

Accepted identity:
- `?id=<tournament_public_id>` when a stable tournament public ID exists.
- fallback `?name=<exact tournament name>&season=<competitive season>` for manual tournament records without an official public ID.

The page exposes only public team-level game summaries. It does not expose player events, rosters, lineups, scorer identity, memberships, GroupMe delivery data or team-private games.

## Tournament content

- Live games
- Upcoming public WPI Live games
- Recent finals
- Search
- Division filter from exact stored `official_division_label`
- WPI-team filter
- Status filter
- exact stage/game number when stored
- event dates and venues derived from WPI Live game records
- WPI-team records derived from finalized public games
- safe share link
- existing youth-safe event sponsorship delivery

The page explicitly states that WPI-team records are not official tournament standings and that WPI Live games may not represent the complete official schedule.

## Discovery/navigation

- `live.html` gains Tournament centers.
- tournament game cards link to the tournament center.
- `live-score.html` links back to the tournament center.
- authenticated Supporter Game Info links back to the tournament center.
- the historical tournament archive remains separate at `tournaments.html`.

## Backend

Migration: `202608220001_public_tournament_experience.sql`

Adds:
- `live_public_tournament_catalog_v1()`
- `live_public_tournament_v1(text,text,text)`
- `live_public_scoreboard_v2()`
- `live_public_game_score_v2(uuid)`

All public RPCs require `visibility='public_team'`; tournament RPCs additionally require `game_kind='tournament'`.

## Protected foundation

No changes to:
- `js/live-backend-v7-56-8.js`
- `js/live-game-v7-58-6.js`
- `js/live-game-storage-v7-58-6.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`

The 7.64.0 `launch=1` fan-layer bypass is preserved in `js/live-fan-experience-v7-64-1.js`.

## Deferred to scale/readiness

7.64.1 intentionally does not solve mega-event pagination/realtime scale. The tournament RPC currently caps a selected tournament response at 2,000 public WPI Live game rows. Server-side pagination, push-style score delivery, high-concurrency instrumentation and 6,000-game mega-event load testing remain 7.64.2 scale/readiness work.
