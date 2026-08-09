# WPI 7.57.9 — Scorer Assignments & Game-Day Operations — Handoff

## Release status

Built from pushed WPI 7.57.8 baseline `CPI-main - 2026-08-09T000450.959.zip`. It is not authoritative until the user installs the patch, runs the full local release gate, applies the Supabase migration, pushes, and hosted-validates.

## Product objective

Turn the Game-Day Hub into an operational coverage surface without disturbing the hardened scorer-control architecture.

The invariant is:

> Pregame assignment says who is expected to score. `live_game_scorer_sessions` still says who actually has scoring control right now.

## User experience

- Game-Day Hub shows assigned vs unassigned coverage counts.
- Owner/Admin can assign a permanent Owner, Admin, or Scorer while adding/editing a game or directly from a Game-Day card.
- Scorer cards clearly show `You`, another assigned scorer, or `Unassigned`.
- A permanent Scorer may launch a game assigned to them.
- An unassigned game remains resilient: the first permanent Scorer to launch it claims the assignment automatically.
- A Scorer cannot launch a planned game assigned to somebody else.
- Owner/Admin remains emergency-capable and can start any planned game.
- Assignment controls lock once the game starts; live scorer handoff remains the existing QR/code flow.

## Database

Migration: `202608090001_scorer_assignments_game_day_operations.sql`

Adds assignment columns, assignment audit, `live_assign_game_scorer_v1`, `live_game_day_queue_v4`, `live_prepare_game_start_v2`, and stale-assignment cleanup when a team member is removed or becomes Viewer.

## Protected foundation

No Edge Function changes and no new secrets.

Byte-protected in focused tests:
- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- `supabase/migrations/202608080007_tournament_schedule_integration_reconciliation.sql`
- `js/live-team-context-v7-57-3.js`
- `js/live-dashboard-v7-57-8.js`
- `data/live/tournament-schedule-index.json`

## Product continuity

Preserved:
- Tournament / Friendly only
- typed identity/logo resolution including Stanford/CCU aliases
- manual tournament fallback
- official schedule reconciliation foundation
- multi-team workspaces
- roster vision
- GroupMe topic delivery/retry/audit
- exactly-one-active-scorer control
- guest/scorer handoff
- Final Whistle and ordered multipart Game Summary

History remains intentionally present during development. The permanent Games & Results replacement and test-record cleanup remain later work.

## Next logical work

Once 7.57.9 is hosted-validated, the next release should focus on the permanent **Games & Results** experience only when the user is ready to end the development-history phase. If a real 2026–2027 tournament schedule is published first, use it to hosted-validate 7.57.8 automatic schedule sync/reconciliation before expanding the tournament surface further.
