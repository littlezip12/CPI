# WPI 7.58.2 — Multi-Team Profiles & Rosters

## What this release changes

- Makes Team Profile metadata fully team-scoped: name, workspace label, age group, gender, and squad/division.
- Keeps the competitive season explicit and read-only in the current workspace.
- Loads the selected team's latest active roster for that team's current competitive season.
- Turns every confirmed roster save into a **new preserved roster version** instead of rewriting the current roster in place.
- Keeps historical game `roster_id` references attached to the roster version used for that game.
- Adds roster-version history to the Owner/Admin dashboard.
- Adds a team-specific **Default starters** editor with age-aware starter counts and one required goalie.
- Remaps valid default starters to a newly saved roster version by stable player identity when possible; otherwise clears the default safely.
- Preserves 7.58.0 Club → Teams isolation and 7.58.1 Owner Dashboard hierarchy.

## Infrastructure

**One Supabase migration is required:**

`supabase/migrations/202608110004_multi_team_profiles_rosters.sql`

**No Edge Function redeploy.**  
**No new secret.**

## 1. Install + focused check

Paste this into Terminal:

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI && unzip -o ~/Downloads/WPI-7.58.2-MULTI-TEAM-PROFILES-ROSTERS-PATCH.zip -d . && chmod +x release-check release-check-live-7.58.2 && ./release-check-live-7.58.2
```

Expected final line:

```text
WPI Live 7.58.2 focused release check passed.
```

## 2. Supabase migration

Take a pre-migration roster safety snapshot before applying the migration. Then paste this into Terminal to copy the migration to the clipboard:

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI && cat supabase/migrations/202608110004_multi_team_profiles_rosters.sql | pbcopy
```

In Supabase: **SQL Editor → New query → Paste → Run**.

Expected result:

```text
Success. No rows returned
```

Then run the post-migration safety query and verify the existing Lamorinda pilot keeps the same team ID, active roster ID, player count, and game records.

## 3. Full gate

Paste this into Terminal:

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI && ./release-check
```

Expected final line:

```text
CPI release check passed.
```

When the migration verification and full gate both pass, commit and push normally. Then perform the live site check before treating 7.58.2 as authoritative.
