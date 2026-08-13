# WPI 7.58.3 — Multi-Team Access & Following

## What this release changes

- Keeps permanent team membership and permissions scoped to `live_team_members`.
- Adds `live_team_follows` as a separate read-only relationship rather than adding extra Supporter memberships.
- Limits pilot Following to Lamorinda teams and to users who are permanent Supporters or Scorers on an active Lamorinda team.
- Lets Supporters/Scorers discover and follow additional Lamorinda teams.
- Adds followed-team live/upcoming/final games to the role-shaped dashboard experience.
- Lets Owners/Admins see **Following this team** separately from Team Access members.
- Followed games are read-only and never grant scoring, roster editing, access management, GroupMe configuration, or delivery-audit access.
- Preserves 7.58.0 Club → Teams, 7.58.1 dashboard hierarchy, and 7.58.2 team-profile/roster-versioning foundations.

## Infrastructure

**One Supabase migration is required:**

`supabase/migrations/202608120001_multi_team_access_following.sql`

**No Edge Function redeploy.**  
**No new secret.**

## 1. Install + focused check

Paste this into Terminal:

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI && unzip -o ~/Downloads/WPI-7.58.3-MULTI-TEAM-ACCESS-FOLLOWING-PATCH.zip -d . && chmod +x release-check release-check-live-7.58.3 && ./release-check-live-7.58.3
```

Expected final line:

```text
WPI Live 7.58.3 focused release check passed.
```

## 2. Pre-migration safety snapshot

Before applying the migration, capture the existing Lamorinda pilot team and membership counts. The migration must not mutate membership, roster, game, or GroupMe records.

## 3. Supabase migration

Paste this into Terminal to copy the migration to the clipboard:

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI && cat supabase/migrations/202608120001_multi_team_access_following.sql | pbcopy
```

In Supabase: **SQL Editor → New query → Paste → Run**.

Expected result:

```text
Success. No rows returned
```

Then run the post-migration safety query and verify the existing team/member/roster/game/destination counts are unchanged and the new Following table/functions are present.

## 4. Full gate

Paste this into Terminal:

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI && ./release-check
```

Expected final line:

```text
CPI release check passed.
```

When migration verification and the full gate both pass, commit and push normally. Then perform the live site check before treating 7.58.3 as authoritative.
