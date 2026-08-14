# WPI 7.58.6 — Club-Level Pilot Hardening Handoff

## Baseline

Built cumulatively from pushed and live-site-validated **WPI 7.58.5 — Tournament Feed → Game-Day Validation**.

## Primary production hardening

The scoring console's local/offline state is now game-scoped rather than shared across every WPI Live game in the same browser.

New assets:

- `js/live-game-storage-v7-58-6.js`
- `js/live-game-v7-58-6.js`

`live-game.html` loads both with the 7.58.6 cache key.

### Why this matters

The database already isolates scorer control, events, deliveries, rosters and games by canonical game/team IDs. The remaining concurrency weakness was the browser recovery copy: simultaneous games used one legacy localStorage key. 7.58.6 removes that collision so Game A and Game B can each retain independent offline state.

## Protected foundations confirmed

- Club → Teams stable IDs and team isolation
- season-aware roster versions/default starters
- team-specific membership and separate Following
- game-scoped scorer sessions and handoff passes
- Supporter game-scoped scorer authority without permanent promotion
- offline preservation and automatic reconnect/resume sync
- GroupMe claim serialization, retry and audit behavior
- Final Whistle, Reopen and repeat Final recovery
- permanent Event Archive / Game Recaps
- manual-game canonical tournament reconciliation
- squad-safe official tournament feed matching

## Validation

Focused 7.58.6 gate passes, including new concurrent-game storage regression plus all protected 7.57.22–7.58.5 foundations.

The full repository release gate was executed in contiguous segments because the execution environment limits long individual commands. Every command passed through the final `CPI release check passed.`. Gate-generated tournament/QA artifacts were restored afterward and the focused 7.58.6 gate was rerun successfully.

## Infrastructure

- No Supabase migration.
- No Edge Function redeploy.
- No new secret.

## 7.59.0 milestone

Do not label WPI **7.59.0 — Club Pilot Ready** merely because 7.58.6 is pushed.

Keep the following external/real-usage observations explicit until completed:

1. multiple real Lamorinda teams coexist and operate correctly
2. concurrent real games / scorer handoff are observed
3. real offline/reconnect behavior is observed poolside
4. real event archive/recap behavior is observed across a multi-game weekend
5. the first published 2026–2027 official schedule populates Game-Day Hub
6. any manual fallback for that event reconciles to one canonical game without duplication

The repository currently has no published 2026–2027 official game schedule, so item 5 remains pending for reasons outside this release.
