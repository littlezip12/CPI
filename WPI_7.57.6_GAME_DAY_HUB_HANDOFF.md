# WPI 7.57.6 — Game-Day Hub & Universal Game Model — Handoff

## Baseline

Built cumulatively from the pushed WPI 7.57.5 repository baseline supplied on 2026-08-08:

`CPI-main - 2026-08-08T223957.462.zip`

7.57.5 remains the validated browser foundation for guided Team Readiness. 7.57.6 adds the universal game model without rebuilding the scoring engine.

## Release objective

Create a reliable game-day layer that works even when tournament automation is missing.

The key architectural rule is:

> A manually entered tournament game is the provisional canonical WPI Live game. When the official WPI tournament schedule catches up, reconciliation must enrich/link that same scored record rather than leave two games.

## User-facing additions

### Game-Day Hub

New Team Administration navigation and dashboard section for:

- Tournament Games
- Scrimmages
- Friendlies
- Upcoming / Ready / Live workflow
- manual add
- edit before start
- cancel before start
- one-click launch into the existing scorer

### Tournament game fallback

Owners/Admins can create a tournament game even when the public WPI tournament schedule is incomplete. The flow captures:

- tournament
- opponent
- date/time
- venue
- quarter length
- known WPI team/logo association when available

Manual tournament cards clearly show that the official link is pending.

### Logos

The dashboard loads the WPI club/team catalog and uses existing WPI logo assets for recognized teams. Unknown opponents use WPI-neutral artwork rather than inventing an identity.

### Duplicate guardrail

A same-opponent/same-kind game near the same scheduled time triggers a warning before a second manual record is created. It remains overridable because repeat matchups are possible.

## Database additions

Migration:

`supabase/migrations/202608080005_game_day_hub_universal_game_model.sql`

Adds metadata to `live_games`:

- `game_kind`
- `creation_source`
- `tournament_name`
- `scheduled_timezone`
- `tournament_public_id`
- `opponent_wpi_team_id`
- `team_logo_url`
- `opponent_logo_url`
- `reconciliation_status`
- `reconciliation_confidence`
- `reconciled_at`
- `reconciled_by`
- `cancelled_reason`

Adds RPCs:

- `live_game_day_queue`
- `live_create_manual_game_v2`
- `live_update_planned_game_v1`
- `live_cancel_planned_game_v1`
- `live_link_manual_tournament_game_v1`

The last RPC is a foundation for 7.57.7. It attaches official source IDs to the same record and refuses a collision with an already-linked official game. It does not replace score/event state.

## Protected foundations

7.57.6 intentionally leaves these byte-for-byte unchanged:

- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- `js/live-team-context-v7-57-3.js`
- `js/live-groupme-setup-v7-57-4.js`
- `js/live-dashboard-v7-57-5.js`
- `css/live-sandbox-v7-57-5.css`

No Edge Function deploy and no new secret are required.

## History decision

Do **not** remove or purge current History/test games in this release.

7.57.6 routes upcoming/live work into Game-Day Hub and keeps completed/cancelled records in History temporarily. The product plan is to replace History with a permanent **Games & Results** experience in 7.57.9 and perform intentional test-data cleanup/exclusion there.

## Next release

### WPI 7.57.7 — Tournament Schedule Integration & Reconciliation

Planned scope:

- connect public WPI tournament schedule games into Game-Day Hub;
- show tournament matchup/team logos automatically;
- match official tournament games against provisional manual tournament games;
- auto-link only high-confidence unambiguous matches;
- show Admin review for ambiguous matches;
- prevent duplicate official/manual game rows;
- flag score conflicts instead of overwriting completed WPI Live scoring;
- enrich the existing scored record with official division/venue/source metadata.

## Release gate

Focused expected output:

`WPI LIVE GAME-DAY HUB 7.57.6 TEST PASSED`

`WPI LIVE TEAM CONTEXT 7.57.3 TEST PASSED`

`WPI Live 7.57.6 focused release check passed.`

The build environment also runs key release integrity, logo, season, multi-season, and public tournament-hub regressions. The user's local full `./release-check` is the final pre-push gate.
