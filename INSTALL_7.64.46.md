# Water Polo HQ 7.64.46 — Team Stat Report + Stats Freshness

## What this release does

- renames **Coach Report** to **Team Stat Report**;
- changes **View full roster** to **View full team**;
- adds a **Refresh stats** action;
- automatically reloads analytics when Team Insights returns to the foreground/focus or is restored from browser/app navigation cache;
- preserves the existing four-player comparison;
- preserves 7.64.45 light-table contrast, ECC Google live results, and 7.64.41 Supabase least-privilege hardening.

No Supabase SQL or Edge Function deployment is required.

## Install

Download `WPHQ_7.64.46_TEAM_STAT_REPORT_STATS_FRESHNESS_PATCH.zip`, then from the CPI repo root:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
unzip -o "$HOME/Downloads/WPHQ_7.64.46_TEAM_STAT_REPORT_STATS_FRESHNESS_PATCH.zip" -d .
chmod +x release-check-live-7.64.46
chmod +x scripts/test-wphq-team-stat-report-freshness-v7-64-46.py
chmod +x scripts/test-wphq-ecc-security-merge-v7-64-46.py
chmod +x scripts/test-wphq-unified-mobile-release-v7-64-46.py
./release-check-live-7.64.46
npm run mobile:update:ios
```

## Smoke test

1. Open Team Insights → Player Stats.
2. Confirm the card says **Team Stat Report**.
3. Switch Season / Event / Game scopes.
4. Open **View full team**.
5. Press **Refresh stats** and confirm the status changes to `Stats refreshed · <time>`.
6. Confirm Copy report and Download CSV still work.
7. On iPhone, background the app for at least 30 seconds, return, and confirm the report refreshes automatically.
