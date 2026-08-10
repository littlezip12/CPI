# WPI 7.57.13 — Mobile Game-Day Polish & Pilot Hardening Handoff

Built cumulatively from pushed WPI 7.57.12 — Supporter & Scorer Experience.

## Product intent
Keep the pilot simple by showing each role only the information needed for the next action.

- Owner/Admin: full capabilities remain, but completed onboarding collapses and mobile administration uses a compact jump menu.
- Supporter: Follow a game, grouped Live → Upcoming → Recent finals.
- Scorer: Your games, grouped Live → Assigned → Available to claim.
- Game Day remains the sole Owner/Admin game-creation surface.

## Protected foundation
No changes to the validated scoring/delivery plane, scorer handoff, GroupMe Edge Function, roster extraction Edge Function, tournament reconciliation migrations, or 7.57.11 Game-Day queue hotfix.

## Release validation
Run `./release-check-live-7.57.13`, then the full `./release-check` locally before pushing.
