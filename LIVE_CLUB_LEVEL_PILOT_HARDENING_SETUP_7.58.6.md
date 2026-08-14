# WPI Live 7.58.6 — Club-Level Pilot Hardening

## What this release hardens

7.58.6 is the final engineered hardening pass in the 7.58.x Club & Team Operating Model series.

### Concurrent game isolation

Previously the scoring console retained its on-device/offline recovery state under one legacy browser-storage key. Server-side game records were isolated correctly, but two simultaneously open games could overwrite that local recovery copy.

7.58.6 changes the browser storage contract:

- saved games use `wpi-live-game-v7-58-6:game:<game_id>`
- unsaved drafts are scoped by team
- an explicit `?game=` route always wins over team context
- the legacy 7.56.15 storage key remains read-only-compatible for one-time migration
- once a draft receives its canonical remote game ID, its local state moves to the game-scoped key

This specifically protects concurrent club games during offline/reconnect situations.

## Automated club-level regression coverage

The focused gate permanently checks:

- per-game browser/offline state isolation
- one active scorer per game, not globally
- scorer handoff passes scoped to the target game
- event idempotency scoped to `(game_id, client_event_id)`
- Following remains a separate read-only relationship
- Following never creates or mutates team membership
- GroupMe claims remain serialized per event/provider with already-sent and in-flight protection
- delivery attempts remain auditable/retriable
- reconnect, page-resume and local-preservation behavior remain present
- Reopen / repeat Final recovery remains present
- event archive and permanent recap contracts remain present
- tournament matching remains squad-safe and no current-season schedule is fabricated

## Infrastructure

No Supabase migration.  
No Edge Function redeploy.  
No new secret.

## What remains before WPI 7.59.0 — Club Pilot Ready

7.58.6 completing successfully does **not** by itself satisfy the 7.59.0 milestone.

Real-world acceptance still includes, where not already completed in production:

- multiple real Lamorinda teams operating concurrently
- a real multi-game Scrimmage Weekend / event archive observation
- scorer handoff during concurrent real games
- offline/reconnect observation during real poolside scoring
- GroupMe delivery/recovery observation under real usage
- first real official 2026–2027 tournament schedule flowing into Game-Day Hub
- confirmation that official schedule reconciliation does not duplicate a manually created canonical game

The current WPI public 2026–2027 schedule index still has zero published official games. This is an external-source state and must not be replaced with fabricated test data.
