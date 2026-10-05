# WPHQ 7.64.46 — Team Stat Report + Stats Freshness Handoff

## Baseline
Built directly from the pushed 7.64.45 ZIP supplied after the Coach Report contrast/cache-bust fix.

## User-facing change
**Coach Report** is now **Team Stat Report**. The report represents full-team player statistics and is not a coach-only permission level.

Labels:
- Team Stat Report
- Full-team player stats
- View full team / Hide full team
- Refresh stats
- Copy report
- Download CSV

## Freshness behavior
`live_team_player_insights_v2` remains the source of truth. 7.64.46 does not create a second stat calculator.

The page now re-queries the current overview and player analytics:
- when the user presses Refresh stats;
- when the page regains window focus after at least 30 seconds;
- when the document becomes visible again after at least 30 seconds;
- when a back-forward-cache page is restored.

This addresses the scenario where Team Insights was already open while another game was finalized elsewhere. The report can no longer remain indefinitely stale simply because the user never reloaded the page.

## Preserved
- four-player comparison cap and UX;
- Season / Event / Game scoping;
- copy + CSV full-team export;
- 7.64.45 light-table contrast;
- 7.64.42 ECC Google live-results + Team Journey behavior;
- 7.64.41 Supabase SECURITY DEFINER least-privilege hardening;
- scorer/finalization and native unified-bundle flows.

## Backend
No Supabase migration or Edge Function deployment.
