# Install WPI 7.64.34 — Organization Insights Identity & Team-Scoped Season Stats

Built from pushed WPHQ 7.64.33.

## Install
Unzip the 7.64.34 patch at the repository root, then run:

```bash
./release-check-live-7.64.34
```

## Production database
After the local gate passes, apply:

`supabase/migrations/202609270001_organization_insights_stable_identity_team_season.sql`

This creates the versioned RPC `live_organization_insights_overview_v2`. No Edge Function deployment or secret change is required.

## Validate
Open Organization Insights for the 2026-2027 season and verify:

- one player row per team, not one row per roster version;
- BAWPL / Champions Cup stats roll into the same team-season player row;
- a child who appears on both A and B remains separate by team;
- cap numbers are not shown as player identity;
- Team Stats, GroupMe, Final Whistle, scorer handoff, and account login remain unchanged.
