# WPI 7.57.2 — Team Access & Admin Invitations Handoff

Built from the hosted-validated WPI 7.57.1 baseline.

## Product additions
- Member list with Owner/Admin/Scorer/Viewer roles.
- Pending invitation list with copy/email/reissue/revoke actions.
- Owner role management and member removal.
- Admin management of Scorer/Viewer only.
- Separately granted `Can manage tournament GroupMe` permission for Admins.
- Owner-only GroupMe group browsing remains intact.
- Designated Admin may manage topics only in the Owner-approved GroupMe.
- Roster import failure no longer fills the draft with the existing roster.

## Hosted setup
Apply `supabase/migrations/202608080002_team_access_admin.sql`, then redeploy `supabase/functions/groupme-post/index.ts`. No new secret.

## Protected foundation
7.57.1 roster vision remains intact. `js/live-backend-v7-56-8.js` and `js/live-sandbox-v7-56-15.js` remain unchanged. GroupMe delivery behavior is unchanged except for setup/test/discovery authorization.

## Next planned release
WPI 7.57.3 — Multi-Team & Team Switching.
