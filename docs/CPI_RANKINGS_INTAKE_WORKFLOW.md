# CPI Rankings Intake Workflow

This workflow defines how tournament files should be handled before new public rankings are published.

## Preferred source format

1. Master by Division CSV
2. Clean age/gender-specific CSV
3. Published spreadsheet exported as CSV
4. PDF/screenshot only when no structured file exists

## Required fields

Each tournament source should preserve as much of the following as possible:

- Tournament name
- Age/gender group
- Division/tier
- Game number or round
- Date/time
- White/team 1
- Dark/team 2
- Both scores
- Placement context
- Final placements/seeding when available

## Division/tier interpretation

CPI should preserve division strength explicitly:

- Platinum = D1
- Gold = D2
- Silver = D3
- Championship / Classic / Invitational should be treated as qualifier-level placement context, not generic tournament placement

A lower-division champion should not automatically outrank teams from stronger divisions.

## Ranking workflow

1. Import source files.
2. Normalize tournament names.
3. Normalize team aliases and club identity.
4. Deduplicate files and duplicate game rows.
5. Preserve division/tier context.
6. Apply minimum confidence threshold, currently 5 games.
7. Score tournament evidence chronologically from earliest to latest.
8. Review strength of schedule and cross-division results.
9. Manually review obvious ranking anomalies.
10. Publish one age/gender group at a time.

## Publication recommendation

Do not publish every group at once. Recommended order:

1. 12U Boys
2. 14U Girls
3. 12U Girls
4. 16U Boys
5. 16U Girls
6. 18U Boys
7. 18U Girls after extra manual review
8. 14U Boys refresh after JO / new data reconciliation

## Junior Olympics handling

Junior Olympics should become the largest late-season weighting layer once results are available. Until then, JO Qualifiers should be used as strong pre-JO evidence, not the final seasonal authority.
