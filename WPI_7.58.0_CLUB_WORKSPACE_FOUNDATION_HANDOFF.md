# WPI 7.58.0 — Club Workspace Foundation Handoff

## Baseline

Built cumulatively from the user-attached pushed repository:

`CPI-main - 2026-08-11T214806.923.zip`

Verified baseline before modification:

`WPI 7.57.22 — Pilot Readiness & Operational Hardening`

## Architectural result

7.58.0 adds the parent Club → Teams layer around the existing stable `live_teams.id` model. Team switching is context selection only; it never copies or migrates one team's roster, access, GroupMe settings, games, series, scorer state, deliveries or history into another team.

The Lamorinda pilot is linked to the public canonical club identity `club-lamorinda`. A current-season canonical public team ID is intentionally left unset until the 2026–2027 identity registry provides a verified match. Lamorinda Brentwood remains explicitly separate.

Club-level authority is not inferred from team roles. The backfill grants the club workspace only to the verified existing pilot Owner. Creating additional teams is Club Owner-only.

## 7.58.0 product surface

- Club name + selected team context in the Owner dashboard header.
- Team selector retains stable team IDs and the existing local selection key.
- `All Lamorinda Teams` operational view for the Club Owner.
- Club overview includes live games, upcoming games, scorer gaps, readiness signals, recent finals and team quick-jumps.
- Additional teams are created as independent `live_teams` rows under the club and receive their own roster through the existing owner-membership trigger/workspace model.

## Protected foundation

The release intentionally does not rewrite:

- `js/live-backend-v7-56-8.js`
- `js/live-game-v7-57-22.js`
- `js/live-sandbox-v7-56-15.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`

Static regression tests verify their expected hashes/behavior.

## Infrastructure

Required migration:

`supabase/migrations/202608110003_club_workspace_foundation.sql`

No Edge Function redeploy. No new secret.

## Validation in build environment

Passed:

- `scripts/test-live-club-workspace-v7-58-0.py`
- `scripts/test-live-club-context-v7-58-0.js`
- 7.57.22 protected pilot regression
- existing 7.57.3 team-context regression
- Node syntax checks for current Live assets
- `./release-check-live-7.58.0`
- every command in the monolithic `./release-check` sequence; the build environment command-duration ceiling required the monolithic gate to be executed in contiguous segments

After the gate, generated `data/tournaments` and `qa` outputs were restored to the pushed baseline so they are not part of the release patch.

## Authority status

The build artifact is **not authoritative yet**. It becomes authoritative only after the user:

1. installs the patch locally;
2. runs the focused gate;
3. takes the Supabase pre-migration snapshot;
4. applies the migration;
5. verifies the existing Lamorinda team UUID and child-record counts are unchanged;
6. runs the full local `./release-check` successfully;
7. commits and pushes;
8. hosted-validates the Club/Team workspace and protected scoring behavior.

## Next planned release

**7.58.1 — Owner Dashboard Refactor**

That release should move Team Profile near the top, replace persistent Guided Team Launch with compact Team Readiness, consolidate Games on Deck into Game-Day Hub, collapse Game Day Setup, and clean up the Owner information hierarchy without changing the stable Club → Teams data model established here.
