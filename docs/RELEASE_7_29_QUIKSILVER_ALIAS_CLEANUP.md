# CPI Release 7.29 — Quiksilver Ranking Review + Alias Cleanup

## Purpose

Release 7.29 prepares Quiksilver Cup evidence for ranking adjustment by cleaning up source team names and CPI identity mapping.

## What changed

- Added an alias-resolution file for every Quiksilver placement row.
- Added a new-team-candidate file for teams that are not currently represented in the CPI ranking list for that age/gender.
- Updated the Quiksilver tournament JSON with canonical team/club mapping fields.
- Corrected the 16U Boys La Jolla mapping: `La Jolla Gold` maps to `La Jolla United Gold`; plain `La Jolla United` remains a separate review candidate.
- Added/confirmed the nested Quiksilver story page at `stories/quicksilver-cup-2026.html`.
- Added a root redirect from the previous `quicksilver-cup-2026.html` location.
- Added missing stories CSS for the story pages.

## What did not change

- No rank order changes.
- No CPI score changes.
- No team removals.
- No model logic changes.

## Main files

- `data/qa/quiksilver-cup-2026-alias-resolution.csv`
- `data/qa/quiksilver-cup-2026-new-team-candidates.csv`
- `data/qa/quiksilver-cup-2026-alias-summary-7-29.json`
- `data/tournaments/quiksilver-cup-2026.json`
- `stories/quicksilver-cup-2026.html`

## Next step

Use these review files to drive Release 7.30 — Quiksilver Ranking Adjustments.
