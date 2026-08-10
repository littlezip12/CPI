# WPI Live Pilot Graduation — 7.57.14

## Purpose
7.57.14 removes the visible sandbox/demo product surface while preserving the validated connected WPI Live backend and scoring reliability architecture.

## Canonical routes
- Sign in: `live-login.html`
- Team workspace: `live-dashboard.html`
- Live/final game: `live-game.html`
- Guest scorer handoff: `live-scorer-handoff.html`

`live-sandbox.html` is retained for one compatibility release as a redirect to `live-game.html`. Query parameters and URL hash data are preserved so old bookmarks and game links do not break.

## Product-surface changes
- Removes `Sandbox · test data only` from sign-in.
- Removes local browser-demo access from sign-in and dashboard.
- Sets browser config to `environment: "pilot"`, `mode: "connected"`, `allowLocalDemo: false`.
- Removes visible Reset Test Game controls from the connected scoring experience.
- Renames visible sandbox/parent copy to WPI Live/Supporter language.
- Uses `live-game.html` for Owner/Admin, Scorer, Supporter, History and handoff routing.

## Deliberately preserved internals
For reliability, the historical `config/live-sandbox.js` filename, CSS class names, storage keys, and original `js/live-sandbox-v7-56-15.js` file remain in the repository. They are internal compatibility artifacts, not the active product route. The original 7.56.15 scorer remains byte-for-byte protected.

## Backend
No database migration.
No Edge Function deployment.
No secret changes.
Do not redeploy `groupme-post` or `roster-extract`.

## Acceptance
1. Sign in has no Sandbox/local-demo UI.
2. Game Day Start opens `live-game.html`.
3. Friendly and Tournament games score normally.
4. Supporter Follow Live/View Final opens `live-game.html` read-only.
5. Guest Scorer Pass acceptance opens `live-game.html`.
6. Old `live-sandbox.html?game=...` links redirect to the same game on `live-game.html`.
7. No Reset Test Game controls are visible in connected WPI Live.
8. GroupMe, handoff, Final Whistle and multipart summary remain unchanged.
