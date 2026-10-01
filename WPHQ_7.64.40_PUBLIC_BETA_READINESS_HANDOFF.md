# Water Polo HQ — 7.64.40 Public Beta Readiness Handoff
**Date:** September 30, 2026  
**Built from:** authoritative pushed 7.64.39 GitHub ZIP `CPI-main - 2026-09-30T224756.478.zip`  
**Status:** candidate until local gate, browser/native validation, commit and push

## Scope
- Complete Water Polo HQ consumer naming on active live/admin surfaces.
- Preserve Water Polo Index / WPI terminology where it refers to ranking methodology, canonical WPI identity, ranking/team directory data, or historical release naming.
- Show exact WPHQ release + browser/native runtime in Account Security.
- Correct native release verification sequencing:
  - normal release gate tolerates a stale pre-sync local Xcode payload,
  - `npm run mobile:update:ios` syncs first and then requires strict iOS parity.
- Capture a read-only live Supabase Security Advisor audit for public-beta planning.

## Security boundary
No database migration, RLS change, Auth setting mutation, Edge Function deployment, or function privilege mutation is included. The live audit found leaked-password protection disabled and 77 SECURITY DEFINER functions executable by database role `anon`; these require classification before least-privilege changes because public score surfaces and anonymous guest-scoring sessions are intentional WPHQ behavior.

## Validation
Run:
`./release-check-live-7.64.40`

Then:
`npm run mobile:update:ios`

Validate browser + physical iPhone:
- login/session
- My Teams
- Live Scores
- Team Insights
- Account Security release/runtime label
- scorer handoff and scoring entry smoke check
- native relaunch

## Next security release
Classify the 77 flagged SECURITY DEFINER functions into public, authenticated, privileged, and internal/trigger categories, then apply explicit EXECUTE grants/revokes with full scorer/supporter/public regression.
