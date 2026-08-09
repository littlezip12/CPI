# WPI 7.57.4 — Self-Service Tournament GroupMe Setup

Built from the user-provided, pushed WPI 7.57.3 repository baseline.

## Product behavior

WPI Team Administration now presents GroupMe setup as four product steps only:

1. Tournament GroupMe
2. Score Updates Topic
3. Test connection
4. Use for new games

The browser no longer exposes a Supabase secret name, GroupMe credential, delivery-mode selector, or other provider-internal configuration.

### Owner
- May securely load the GroupMes available to the platform-managed GroupMe connection.
- Chooses/approves the tournament GroupMe.
- Chooses its Score Updates topic.
- Must successfully test the exact GroupMe/topic selection before activating it.
- May pause the tested destination for new games.

### Admin with `Can manage tournament GroupMe`
- Cannot browse the Owner's other GroupMes.
- The Owner-approved tournament GroupMe is locked.
- May refresh/select topics inside that approved GroupMe.
- Must test the exact topic before activation.
- May pause the destination when no game is live.

### Admin without the permission
- GroupMe setup remains read-only.

## Reliability guardrails

- An untested GroupMe/topic cannot be activated.
- Changing the GroupMe route while a game is live is blocked server-side.
- A browser-side check also stops a live-game route change before it is attempted.
- A test updates test status without changing a currently active route unless the user intentionally selected a different destination.
- Activation preserves the successful test timestamp/status instead of resetting it.
- New team workspaces automatically use the existing platform-managed GroupMe Edge Function secret name; the secret value stays only in Supabase Edge Function secrets.

## Supabase setup

Apply:

`supabase/migrations/202608080004_self_service_groupme_setup.sql`

Then redeploy only:

`supabase/functions/groupme-post/index.ts`

No new secret is required. Keep the existing `GROUPME_ACCESS_TOKEN_WPI_LIVE` secret in Supabase Edge Function secrets.

Do not change or redeploy `roster-extract`.

## Protected foundation

The following remain byte-for-byte unchanged from the pushed 7.57.3 baseline:

- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `supabase/functions/roster-extract/index.ts`
- `js/live-team-context-v7-57-3.js`
- `supabase/migrations/202608080003_multi_team_switching.sql`

The `groupme-post` Edge Function is intentionally updated only in setup/discovery credential selection. Existing event delivery, retry, ordering and summary behavior remain on the validated path.

## Hosted acceptance

1. Owner opens Team Administration → GroupMe.
2. Confirm there is no secret-name, token, or delivery-mode field.
3. Load GroupMes and choose the tournament GroupMe.
4. Choose the Score Updates topic.
5. Send a test message and confirm it appears in the selected topic.
6. Confirm `Use for new games` becomes available only after the successful test.
7. Activate and confirm the status becomes `Connected`.
8. Start a short game; verify a normal scoring event reaches GroupMe.
9. Finish the game; verify Final Whistle and complete Game Summary ordering.
10. During a live game, attempt to change the selected destination and confirm WPI refuses the route change.
11. With an Admin who has GroupMe permission, confirm the GroupMe itself is locked while topic selection/testing remains available.
12. With an Admin without GroupMe permission, confirm setup is read-only.
13. In a second team workspace, confirm the Owner can load GroupMes without entering a Supabase secret name.
