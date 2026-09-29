# Install WPHQ 7.64.35

From the CPI repo root:

```bash
unzip -o ~/Downloads/WPI_7.64.35_TEAM_STATS_STABLE_SEASON_LEADERS_PATCH.zip -d .
./release-check-live-7.64.35
npm run mobile:sync
```

Then reopen/run the iOS app from Xcode. No Supabase migration or Edge Function deployment is required.
