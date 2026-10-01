# Water Polo HQ — 7.64.39 Unified Web + Native Release Pipeline Handoff
**Date:** September 30, 2026  
**Built from:** authoritative pushed 7.64.38 GitHub ZIP  
**Status:** candidate; must pass user local gate/native refresh and then be committed/pushed

## Why this release exists
WPHQ already uses Capacitor as a thin native shell around generated web files. The missing operational piece was making native refresh a standard part of every product release rather than treating the app as a separate code line.

## Release contract
- Repository-root WPHQ files remain the only product source of truth.
- `mobile/www` is regenerated from the current source and is never hand-edited.
- Every generated native HTML page carries the current WPHQ source release.
- `wphq-native-release.json` travels inside the native bundle for release traceability.
- Current runtime JS/CSS assets are parity-checked against the web source.
- `npm run mobile:update:ios` performs preflight → prepare → `cap sync ios` → parity check → opens Xcode.

## Delivery boundary
A GitHub/web release and the native codebase are synchronized, but an already-installed iPhone app still requires a new native installation/build to receive the refreshed embedded files. For local use, press Run from Xcode after `npm run mobile:update:ios`. For outside testers, archive/upload a new TestFlight build from the same committed WPHQ release.

## Backend boundary
No Supabase migration. No Edge Function. No RLS, auth callback, scorer, GroupMe, analytics, ECC, or tournament data change.

## Gate
`./release-check-live-7.64.39`

## Next native distribution milestones
1. Confirm permanent App Store bundle ID.
2. Select Apple Development Team/signing and run on a physical iPhone.
3. Smoke test account/session, My Teams, Team Insights, Live Scores, team QR/deep link, auth callback, scorer permissions, network recovery, and app relaunch.
4. Lock marketing version/build-number strategy.
5. Complete App Privacy/privacy policy/account deletion/privacy manifest review.
6. Archive/upload internal TestFlight build.
7. Add Universal Links after the permanent WPHQ production domain is final.
8. Add Android after iOS stabilizes.
