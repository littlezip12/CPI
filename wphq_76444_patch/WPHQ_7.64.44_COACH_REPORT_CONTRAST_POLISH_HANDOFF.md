# WPHQ 7.64.44 — Coach Report Contrast Polish

## Summary
7.64.44 is a small follow-up to 7.64.43.

The Coach Report/full-roster table worked functionally, but some environments still showed very dark data cells because a legacy/global table theme was bleeding into the new report. This patch keeps the Coach Report on explicit light table surfaces.

## What changed
Only the Coach Report table presentation was updated:
- explicit white/light cell backgrounds
- darker readable text on body cells
- light sticky player column background
- alternating row striping
- light hover state
- light header background and stronger divider color

## What did NOT change
- no Coach Report logic changes
- no player stat calculations changed
- no scope selection changes
- no ECC changes
- no Supabase changes
- no release gate changes

## Files changed
- `css/live-team-insights-v7-64-43.css`

## Validation target
After install, open Team Insights → Player Stats → Coach Report → View full roster.
The full-roster grid should now render with light cells and strong contrast instead of dark-filled stat cells.
