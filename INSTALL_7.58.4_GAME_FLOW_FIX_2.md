# WPI 7.58.4 — Game Start Flow Correction 2

This correction is cumulative over the pushed 7.58.4 repository ZIP from 2026-08-13T150442.439.

## Fixes

- Cache-busts the 7.58.4 live game controller so browsers cannot keep serving the pre-fix game-start JavaScript.
- Keeps the one-time dashboard launch intent until scorer control is actually ready.
- Retries scorer-control readiness briefly before falling back to the normal Start Game button.
- Preserves the existing Dashboard navigation buttons added in the first 7.58.4 flow correction.

## Infrastructure

- No Supabase migration.
- No Edge Function deployment.
- No secret/configuration change.

## Validation

Run `./release-check-live-7.58.4`, then `./release-check` before commit/push.
