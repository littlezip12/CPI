# Install — WPI 7.64.24

## Summary
Fixes the remaining signed-out My Teams visibility issue found during iPhone Simulator QA.

## Changes
- Adds a focused My Teams stylesheet that enforces `[hidden]` for authentication-only controls.
- Signed-out users no longer see Add another team, Team Dashboard, Account Security, or Sign out.
- Keeps public Live Scores / High Schools links and the supporter sign-in/create-account card.
- No Supabase migration or Edge Function deployment required.

## Run
```bash
./release-check-live-7.64.24
npm run mobile:sync
npm run mobile:open:ios
```
