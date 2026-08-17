# WPI 7.62.1 — Stable Team Hubs & Live Bridge

## Install
Unzip the patch over the current pushed WPI 7.62.0 repository, run `./release-check-live-7.62.1`, then run `./release-check-clean`.

## Supabase
No migration is required. 7.62.1 reuses the safe read-only `live_public_organization_overview_v1` RPC and existing stable team-family Following RPCs from 7.60.3/7.62.0.

## No deploys
No Edge Function redeploy and no new secret.

## Live checks after push
- Search a club team such as Lamorinda A 14U Boys from the homepage and confirm it opens `team-hub.html`.
- Open a high-school team from an organization profile and confirm the hub uses the school logo/colors.
- On a signed-in account, confirm Follow/Following works and remains read-only.
- For a connected Live team, confirm entitled Live/Upcoming/Final activity appears; for a directory-only team, confirm the hub says `No Live feed yet` without fabricating games.
