# Install WPHQ 7.64.43 — Coach Full-Roster Player Stats + ECC/Security Merge

7.64.43 is the convergence release after two parallel work streams used overlapping release numbers.

It starts from the latest pushed 7.64.41 security repo, preserves the already-applied SECURITY DEFINER least-privilege work, restores the completed 7.64.42 ECC Google live-results / Team Journey behavior from the parallel chat, and adds a new full-roster Coach Report to Team Insights.

## Install / validate

```bash
unzip -o WPHQ_7.64.43_COACH_FULL_ROSTER_STATS_MERGED_PATCH.zip -d .
chmod +x release-check-live-7.64.43
./release-check-live-7.64.43
npm run mobile:update:ios
```

The release gate includes a live anonymous check against ECC's public Google `MASTER BY DIVISION` source, so internet access is required for the final gate.

## Product validation

In Team Insights → Player Stats:

1. choose **Event** for a weekend/tournament report;
2. choose the event;
3. use **Coach Report → View full roster**;
4. verify every rostered player is present;
5. test **Copy report** and **Download CSV**.

The existing up-to-four-player comparison remains available and unchanged.

## Backend

No new Supabase migration or Edge Function is required by 7.64.43. The already-applied 7.64.41 least-privilege migration remains part of the repository and production state.
