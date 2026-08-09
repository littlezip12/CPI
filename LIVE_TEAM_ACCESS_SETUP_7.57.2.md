# WPI Live 7.57.2 — Team Access & Admin Invitations Setup

WPI 7.57.2 adds a database-backed Team Access workspace and separately scoped Tournament GroupMe management permission.

## Required hosted changes

### 1. Apply the migration

Preferred path for this project: Supabase Dashboard → **SQL Editor** → **New query**.

Paste the complete contents of:

`supabase/migrations/202608080002_team_access_admin.sql`

Run it once against the WPI Live project.

This migration:
- adds `can_manage_groupme` to team memberships and invitations;
- adds access-list / invite / reissue / revoke / member-management RPCs;
- keeps ownership transfer separate;
- prevents Admins from changing Admin access;
- prevents a non-designated Admin from changing GroupMe destination metadata;
- does not contain any secret or credential.

### 2. Redeploy `groupme-post`

The existing GroupMe Edge Function has one intentional access-control change: setup/discovery/test operations now honor the new scoped Admin permission. Event delivery, retry, Final Whistle and summary behavior remain unchanged.

From the repo on macOS:

```bash
pbcopy < supabase/functions/groupme-post/index.ts
```

Then Supabase Dashboard → **Edge Functions** → `groupme-post` → edit/deploy the pasted code.

Do not change any GroupMe secret.

### 3. No new secrets

7.57.2 requires no new Supabase secret and no OpenAI configuration change. The 7.57.1 `roster-extract` function and `OPENAI_API_KEY` stay as-is.

## Permission model

- **Owner**: full team access management; may invite/manage Admin/Scorer/Viewer; may browse GroupMe groups; may grant or remove GroupMe-management permission.
- **Admin**: may invite/manage Scorer/Viewer; cannot manage Admin access; GroupMe setup is read-only unless the Owner grants `Can manage tournament GroupMe`.
- **Designated Admin**: may browse/manage topics only inside the GroupMe already approved by the Owner. Cannot browse unrelated groups and cannot choose/change the credential secret.
- **Scorer**: permanent team scoring role; no Team Access administration.
- **Viewer**: read-only team role.

Game-scoped scorer handoff remains separate from permanent membership and still enforces exactly one active scorer.

## Hosted acceptance test

1. Owner opens Team Access and sees current members.
2. Owner invites an Admin with GroupMe permission OFF.
3. Invite link works for an existing or newly created account.
4. Admin can view Team Access but cannot change Admins.
5. Admin without GroupMe permission sees the saved GroupMe destination read-only and cannot load topics/test/save setup.
6. Owner enables `Can manage tournament GroupMe` for that Admin.
7. Designated Admin can load topics inside the Owner-approved GroupMe, test the topic, and save it.
8. Designated Admin still cannot browse the Owner's other GroupMes or view/change the credential secret.
9. Owner/eligible Admin can invite Scorer/Viewer, reissue an invite, revoke it, and remove a member.
10. Roster extraction failure shows Retry / Upload Another / Enter Manually and does not show the existing saved roster as if it were detected.
11. Score a short game and verify GroupMe play delivery, handoff, Final Whistle and multipart Game Summary remain unchanged.
