# WPI 7.64.10 — BAWPL Event & TBD Game Readiness

## Scope
- Add a durable **League / event** game type for recurring events such as BAWPL.
- Add private **planned game slots**: event + date + game count only, with no fabricated opponent/time/venue.
- Show planned slots in Game-Day Hub as **Details pending** with `Opponent TBD` / `Time TBD` clearly marked as planning state, not game data.
- Convert a planned slot into the real canonical WPI Live game once an opponent is known; exact start time can remain TBD until published.
- Keep all BAWPL weekends under one season-long event record while each actual game retains its own score/stats/recap.
- Preserve tournament schedule reconciliation, school schedule sync, Scrimmage Weekends, scorer control, Quick Time, GroupMe, and recap behavior.

## Database
Run `supabase/migrations/202609160002_bawpl_event_tbd_game_readiness.sql` before deploying the frontend.

No Edge Function, secret, billing, hosting, or protected scorer/GroupMe foundation changes.

## Validation
Run `./release-check-live-7.64.10`, then `./release-check-clean`.
