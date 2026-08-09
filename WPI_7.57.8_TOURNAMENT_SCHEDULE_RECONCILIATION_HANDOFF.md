# WPI 7.57.8 — Tournament Schedule Integration & Reconciliation — Handoff

## Release status

Built from the pushed WPI 7.57.7 baseline supplied by the user (`CPI-main - 2026-08-08T234306.858.zip`). This release is **not authoritative** until installed locally, the full release gate passes, the Supabase migration is applied, the repository is pushed, and hosted behavior is validated.

## Product objective

Connect WPI Live Game Day to the WPI public Tournament platform without ever making tournament-feed availability a prerequisite for scoring a real game.

The invariant is:

> A scorer may always create a missing tournament game manually. When the official schedule catches up, WPI links that official schedule game to the same scored record rather than creating a duplicate.

## User experience

Game Day now contains a WPI Tournament Schedule status area. It can sync official active-season games for the selected team when structured tournament schedule data exists. Manual Tournament and Friendly creation remain first-class.

Official game cards retain the Game-Day queue model. Canonical WPI team identity and artwork are used for display while raw source labels remain available for matching/reconciliation.

## Reconciliation rules

- High-confidence unique manual match: attach official identifiers to the existing row.
- Ambiguous match: persist a candidate and require Owner/Admin review.
- Already-linked official game: refresh safe official metadata; do not insert a duplicate.
- Planned/unscored game: official scheduling metadata may update the plan.
- Live/final game: do not rewrite scoring state/event history.
- Official score disagreement with WPI Live: preserve both and mark a conflict for review.

## Current public Tournament state

Active competitive season: 2026–2027.

The public Tournament hub currently announces **Evan Cousineau Memorial Cup — October 3–4, 2026** but states that divisions/schedules will be added when an official source is published. The 7.57.8 schedule builder therefore produces zero active-season games today. This is expected and safer than inventing fixtures.

## New files

- `data/live/tournament-schedule-index.json`
- `scripts/build-live-tournament-schedule-index.py`
- `scripts/test-live-tournament-schedule-reconciliation-v7-57-8.py`
- `js/live-dashboard-v7-57-8.js`
- `css/live-sandbox-v7-57-8.css`
- `release-check-live-7.57.8`
- `supabase/migrations/202608080007_tournament_schedule_integration_reconciliation.sql`
- `LIVE_TOURNAMENT_SCHEDULE_RECONCILIATION_SETUP_7.57.8.md`
- `WPI_7.57.8_TOURNAMENT_SCHEDULE_RECONCILIATION_HANDOFF.md`
- `PATCH_MANIFEST_7.57.8.txt`

## Protected foundation

Do not rebuild or casually modify the known-good foundation:

- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- `js/live-team-context-v7-57-3.js`
- scorer handoff / exactly-one-scorer authority
- GroupMe delivery/retry/audit
- Final Whistle and ordered multipart summary delivery
- high-accuracy roster vision

7.57.8 has no Edge Function change and no secret change.

## Database work

Apply `202608080007_tournament_schedule_integration_reconciliation.sql` in Supabase SQL Editor after local gates pass.

Important additions include official schedule metadata on `live_games`, candidate reconciliation metadata, a unique partial index preventing duplicate official schedule identities per team/environment, and authenticated reconciliation/sync RPCs.

## Test status in build environment

Focused 7.57.8 gate passed. `node --check js/live-dashboard-v7-57-8.js` passed. Key regressions passed separately: release integrity, team directory logos, tournament seasons, multi-season foundation, public tournament hub, and tournament data validation.

The complete monolithic `./release-check` was attempted but exceeded the build execution window after progressing through Tournament Sync Safety. No test failure was observed before timeout. The user's local full gate is therefore mandatory before push.

## Hosted acceptance now

Because the current active-season schedule is not yet published, validate the schedule-coming-soon state plus all manual paths and core scoring/GroupMe regressions. Do not claim automatic schedule import/reconciliation is hosted-validated yet.

## Next work after 7.57.8

Once a real 2026–2027 tournament schedule is published, use it for end-to-end acceptance of automatic import, logo/identity matching, high-confidence reconciliation, ambiguous review, and score-conflict behavior. Subsequent roadmap can then move into scorer assignments / game-day operations, followed by Games & Results replacing development-era History and test-record cleanup.
