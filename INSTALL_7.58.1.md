# WPI 7.58.1 — Owner Dashboard Refactor

## What this release changes

- Moves **Team Profile** to the top of the Owner/Admin team workspace.
- Replaces the persistent **Guided Team Launch** experience with compact **Team Readiness**.
- Keeps **Game-Day Hub** as the only routine game queue and removes the separate “Games on Deck” concept.
- Collapses roster, team access, and GroupMe configuration under **Game Day Setup**.
- Preserves the 7.58.0 Club → Teams hierarchy and stable team IDs.
- Preserves role-shaped Supporter/Scorer experiences and the validated scoring/recovery/GroupMe foundation.

## Infrastructure

**No Supabase migration.**  
**No Edge Function redeploy.**  
**No new secret.**

## Install + focused check

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI && unzip -o ~/Downloads/WPI-7.58.1-OWNER-DASHBOARD-REFACTOR-PATCH.zip -d . && chmod +x release-check release-check-live-7.58.1 && ./release-check-live-7.58.1
```

Expected final line:

```text
WPI Live 7.58.1 focused release check passed.
```

## Full gate

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI && ./release-check
```

Expected final line:

```text
CPI release check passed.
```

When the full gate passes, commit and push normally. Hosted validation should then confirm the Owner/Admin dashboard hierarchy and the collapsed Game Day Setup disclosure.
