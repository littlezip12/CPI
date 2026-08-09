# WPI 7.57.9 — Scorer Assignments & Game-Day Operations

## Supabase

Apply one migration in the WPI Live Supabase project:

`supabase/migrations/202608090001_scorer_assignments_game_day_operations.sql`

No Edge Function redeploy is required. Do not change `groupme-post`, `roster-extract`, GroupMe secrets, or `OPENAI_API_KEY`.

## What the migration adds

- Optional pre-game scorer assignment fields on `live_games`.
- `live_assign_game_scorer_v1` for Owner/Admin assignment management.
- `live_game_day_queue_v4` with assignment state, `isAssignedToMe`, and `canStart`.
- `live_prepare_game_start_v2`, which preserves the existing active-scorer system while enforcing a planned assignment for permanent Scorers.
- Immutable `live_game_assignment_audit` records for assignment changes.
- Automatic clearing of future assignments if a member is removed or changed to Viewer.

## Authority model

Pregame assignment is operational responsibility, not the live scoring lock.

- Owner/Admin: can assign or clear a permanent scorer before start and can still launch a game for emergency coverage.
- Scorer: can launch a game assigned to them; if a game is unassigned, the first permanent Scorer to launch it is assigned automatically.
- Viewer: cannot be assigned and cannot launch scoring.
- Guest Scorer / QR / six-digit handoff: unchanged and remains game-scoped after scoring begins.
- `live_game_scorer_sessions` remains authoritative for exactly one active scorer.

## Hosted acceptance

1. Assign a permanent Scorer to an upcoming Tournament game.
2. Sign in as that Scorer and confirm the card shows `You` under Scoring coverage.
3. Start the game and confirm the existing scoring console opens.
4. Assign a different Scorer to a second planned game and confirm the first Scorer cannot launch it.
5. Leave a third game unassigned; start it as a permanent Scorer and confirm it auto-assigns to that account.
6. Confirm Owner/Admin can reassign or clear a future game.
7. Confirm assignment controls disappear after a game starts.
8. Confirm scorer handoff, GroupMe, Final Whistle, and Game Summary remain unchanged.
