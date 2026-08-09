# WPI 7.57.2 — Team Access & Admin Invitations

WPI 7.57.2 builds on the hosted-validated 7.57.1 High-Accuracy Roster Import and the validated 7.56.15 scoring/delivery engine.

## Release focus

- Turns the existing invite foundation into a complete Team Access workspace: members, roles, pending invites, reissue/revoke, and remove access.
- Adds an explicit, separately granted **Can manage tournament GroupMe** permission for Admins.
- Preserves the Owner privacy boundary: only the Team Owner may browse the connected GroupMe account's groups or select a server-side credential; a designated Admin may manage topics only inside the Owner-approved GroupMe.
- Owner can invite/manage Admin, Scorer and Viewer roles. Admin can invite/manage Scorer and Viewer roles but cannot manage Admin access.
- Invite links remain private, expire after 14 days, can be copied or opened in a pre-addressed email, and can be reissued or revoked.
- Existing login/signup invite acceptance remains compatible; accepted invites now carry the scoped GroupMe-management permission.
- Fixes roster-import failure UX: a failed automatic read no longer fills the draft with the previously saved roster. WPI shows Retry / Upload Another / Enter Manually instead.
- Manual roster entry and the hosted-validated 7.57.1 photo/upload vision flow remain intact.

## Security boundary

- No GroupMe credential is exposed to Team Admins.
- Group discovery remains Team Owner-only.
- GroupMe setup permission is enforced in the database and the `groupme-post` Edge Function, not just hidden in the UI.
- Exactly-one-active-scorer, Guest Scorer handoff, Admin takeover, GroupMe delivery/retry/audit, Final Whistle and tournament-scale multipart Game Summary remain protected.

## Deployment requirement

Apply `supabase/migrations/202608080002_team_access_admin.sql` and redeploy `supabase/functions/groupme-post/index.ts` before hosted Team Access testing. No new secret is required. See `LIVE_TEAM_ACCESS_SETUP_7.57.2.md`.
