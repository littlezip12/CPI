# CPI Junior Olympics Weekend 2 Schedule — Release 7.38.0

This is the first tournament tool built as part of the CPI stabilization roadmap.

## Coverage

- 10U Championship (D1)
- 12U Boys Championship (D1) and Classic (D2)
- 14U Boys Championship (D1), Classic (D2), and Invitational (D3)
- 16U Boys Championship (D1), Classic (D2), and Invitational (D3)
- 18U Boys Championship (D1), Classic (D2), and Invitational (D3)

All 12 tabs are registered in `source-registry.json` and use one shared workbook.

## Current data behavior

The browser attempts the Google Sheets CSV export first and then Google Visualization JSONP. The most recent successful division load is cached locally in the visitor's browser. No Boys offline snapshots are embedded yet because the source rows were not available inside the release package.

## Product behavior

- Age/division filters
- Team-specific schedule and tournament journey
- Next game and win/loss destinations
- Possible opponents derived from bracket dependencies
- Full division schedule search
- Direct official source link
- Shareable division/team URLs

## Next architecture step

Capture raw CSV snapshots for every division, normalize the games during the build, and make the browser consume generated JSON rather than parsing the official workbook directly.
