# WPI 7.57.3 — Multi-Team & Team Switching Handoff

Built from the user-provided, hosted-validated WPI 7.57.2 repository baseline.

## Product additions
- Persistent Team workspace selector in WPI Live Team Administration.
- Membership list includes every authorized Owner/Admin/Scorer/Viewer team for the signed-in account.
- Switching performs a page reload into a server-validated workspace to avoid cross-team in-memory state leakage.
- Dashboard Open / Continue / Start Game routes carry the selected `team` context into the scorer.
- Accepted invitations automatically become the selected team.
- Existing Team Owners may create an additional isolated team workspace.
- Multi-team-aware login copy; authentication behavior remains the validated email/password flow.

## Supabase setup
Apply `supabase/migrations/202608080003_multi_team_switching.sql` after the already-installed 7.57.2 migration.

No Edge Function redeploy and no new secrets.

## Protected foundation
The following remain byte-for-byte unchanged from the validated 7.57.2 baseline:
- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- 7.57.2 Team Access migration
- GroupMe topic and Game Summary migrations

## Next planned release
WPI 7.57.4 — Self-Service Tournament GroupMe Setup.
