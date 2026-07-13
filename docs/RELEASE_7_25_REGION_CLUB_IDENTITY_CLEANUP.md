# CPI Release 7.25 — Region + Club Identity Cleanup

Status: v2 built from the user-reviewed club region audit.

## Region model

- San Diego
- Orange County
- Los Angeles
- Inland Empire
- Central Coast
- Central Valley
- Sacramento
- East Bay
- Peninsula / San Francisco
- Out of State
- Needs Review

## Applied cleanup

- Applied user-reviewed club region assignments from the uploaded audit CSV.
- Removed older labels such as Southern California, South Bay, Region TBD, Bay Area, Peninsula, and Out of State / Needs Review from active ranking/club data.
- Normalized `Cental Coast` to `Central Coast`.
- Normalized Elite manual note `South East of LA` to the approved `Los Angeles` region.
- Added club and team region review CSV files under `data/qa/`.
- Preserved all rankings, CPI scores, team ordering, logos, routing, UI behavior, and pipeline files.

## Region counts

| Region | Clubs | Teams |
|---|---:|---:|
| San Diego | 15 | 48 |
| Orange County | 29 | 146 |
| Los Angeles | 28 | 86 |
| Inland Empire | 8 | 27 |
| Central Coast | 12 | 38 |
| Central Valley | 9 | 15 |
| Sacramento | 3 | 10 |
| East Bay | 10 | 48 |
| Peninsula / San Francisco | 16 | 50 |
| Out of State | 12 | 22 |
| Needs Review | 0 | 0 |
