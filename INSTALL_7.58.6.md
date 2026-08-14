# Install WPI 7.58.6 — Club-Level Pilot Hardening

Baseline: pushed and live-site-validated WPI 7.58.5.

## Infrastructure

- No Supabase migration.
- No Edge Function redeploy.
- No new secret.

## Install

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI && unzip -o ~/Downloads/WPI-7.58.6-CLUB-LEVEL-PILOT-HARDENING-PATCH.zip -d . && chmod +x release-check release-check-live-7.58.6 && ./release-check-live-7.58.6 && ./release-check
```

If the final line is `CPI release check passed.`, commit and push immediately.

## Live-site check after push

```bash
open "https://littlezip12.github.io/CPI/live-dashboard.html?release=7.58.6"
```

Confirm the existing team workspace, Game-Day Hub, scoring page, Dashboard return action, Following, archive/recap, and normal Start-game flow still load correctly.

The concurrency/offline change is intentionally internal: each saved game now gets a separate browser storage key, so one simultaneously open game cannot overwrite another game's local/offline recovery state.
