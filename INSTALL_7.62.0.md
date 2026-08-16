# WPI 7.62.0 — Unified Organization Discovery & Scale

## Install
Unzip the patch over the current pushed 7.61.1 repository, run `./release-check-live-7.62.0`, apply migration `202608160004_unified_organization_discovery_scale.sql`, then run `./release-check-clean`.

## Supabase
One migration is required. It adds no tables and mutates no game/team/member/follow data. It extends the existing user organization workspace list with `organizationType` and adds a safe read-only organization overview RPC for public games plus team-private games visible to an authenticated member/follower. Stable directory-only team-family follows are also returned so a followed team can remain visibly followed before that organization has a Live workspace.

## No deploys
No Edge Function redeploy and no new secret.
