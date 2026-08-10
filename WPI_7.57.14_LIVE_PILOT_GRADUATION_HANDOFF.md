# WPI 7.57.14 — WPI Live Pilot Graduation Handoff

Built cumulatively from pushed WPI 7.57.13.

## Outcome
WPI Live is no longer presented to users as a sandbox. `live-game.html` is now the canonical scoring/following route. The previous `live-sandbox.html` path is a compatibility redirect only.

## Reliability boundary
The validated 7.56.15 scorer file remains untouched in the repository. The active 7.57.14 game controller is a narrowly modified copy whose changes are limited to canonical routing, product-facing copy, removal of local-demo authorization, Supporter terminology, and permanently hiding internal reset controls. Backend, GroupMe, scorer-control, handoff, event, Final Whistle and summary contracts are unchanged.

## No backend deployment
No SQL migration. No Edge Function redeploy. No secrets.

## Next
After hosted pilot-graduation acceptance, continue pilot hardening and the first real active-season tournament schedule validation. Keep current History until the planned Games & Results/test-data cleanup near the end of the pilot build.
