# WPI 7.57.4 — Self-Service Tournament GroupMe Setup Handoff

Built from the pushed WPI 7.57.3 Multi-Team & Team Switching baseline supplied on 2026-08-08.

## Release objective
Make tournament GroupMe configuration a normal product workflow rather than a technical integration screen, while protecting the already-validated delivery and scorer foundations.

## Product additions
- Four-step GroupMe setup: Tournament GroupMe → Score Updates Topic → Test connection → Use for new games.
- No browser-visible Supabase secret-name field.
- No normal-user delivery-mode selector; Topic delivery is the self-service path.
- Owner-only GroupMe browsing.
- Delegated Admin remains restricted to topics inside the Owner-approved GroupMe.
- Exact destination must pass a test before activation.
- Explicit pause control.
- Live-game destination route is immutable until the game is finished.
- New team workspaces reuse the protected platform-managed GroupMe credential automatically.

## Database
New migration:
`supabase/migrations/202608080004_self_service_groupme_setup.sql`

Adds:
- `live_prepare_groupme_destination_v3`
- `live_activate_groupme_destination_v3`
- `live_pause_groupme_destination_v3`
- active-game GroupMe-route guard trigger

No tables are recreated and no credentials are stored in the migration.

## Edge Function
`supabase/functions/groupme-post/index.ts` is intentionally updated.

Discovery no longer accepts browser-selected secret names. It uses the already-saved server-side secret-name reference or the WPI platform default `GROUPME_ACCESS_TOKEN_WPI_LIVE`. The token value remains in Supabase Edge Function secrets.

Normal event delivery, exactly-once/retry behavior, Topic posting, Final Whistle and Game Summary dispatch are otherwise preserved.

## Browser architecture
The validated `js/live-backend-v7-56-8.js` remains unchanged.

A small additive adapter, `js/live-groupme-setup-v7-57-4.js`, adds the three new setup RPC calls. `js/live-dashboard-v7-57-4.js` owns the new setup workflow.

## Validation completed in build environment
- `release-check-live-7.57.4` passes.
- 7.57.3 team-context regression passes.
- release-integrity regression passes.
- team-directory logo regression passes.
- tournament competitive-season regression passes.
- multi-season foundation regression passes.
- public tournament hub regression passes.
- new dashboard/helper JavaScript passes `node --check`.
- Full monolithic `./release-check` was started but exceeded the build execution window during tournament rebuild work; local full release gate remains mandatory before push.

## Hosted setup
1. Apply `202608080004_self_service_groupme_setup.sql` in Supabase SQL Editor.
2. Redeploy `groupme-post` with the 7.57.4 source.
3. Do not change GroupMe/OpenAI secrets.
4. Do not redeploy `roster-extract`.
5. Push only after the local full gate returns 0 / `CPI release check passed.`

## Next recommended release
WPI 7.57.5 — Onboarding Readiness & Guided Team Launch: convert Team Readiness into a true guided launch checklist, add permission-aware calls to action, and finish the first-team/next-team onboarding experience without touching scoring reliability.
