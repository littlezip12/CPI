# WPI 7.57.11 — Game-Day Queue Hotfix & Dashboard Simplification

## Why this release exists

A Friendly/Tournament game could save successfully and then appear to fail with:

`cannot pass more than 100 arguments to a function`

The failure was in `live_game_day_queue_v4`, not the scorer. PostgreSQL limits function calls to 100 arguments, and the queue used one `jsonb_build_object` call with more than 50 key/value pairs. The game save RPC can commit before the browser asks the queue to reload, so a game from a failed-looking test may already exist and should be checked after the migration before creating another copy.

## Database change

Apply `supabase/migrations/202608090003_game_day_queue_hotfix_dashboard_simplification.sql` in Supabase SQL Editor. It replaces the existing `live_game_day_queue_v4` implementation with chunked JSON construction while keeping the same RPC name and response contract.

No Edge Function deployment and no secret change are required.

## UX cleanup

- `Save & start` is renamed `Start game`.
- Game creation is centralized in the Game-Day Hub.
- The duplicate Overview `Add a game` action is removed.
- The empty Game-Day state no longer adds a second `Add first game` button.
- The readiness completion CTA now says `Go to Game Day` and scrolls to the hub instead of opening another creation path.

## Protected behavior

Atomic game + scorer assignment persistence from 7.57.10 remains in place, along with the established scorer-control, handoff, GroupMe, Final Whistle, summary, tournament reconciliation, roster vision, and Viewer-first onboarding behavior.
