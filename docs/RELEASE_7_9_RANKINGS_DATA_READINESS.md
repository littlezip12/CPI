# Release 7.9 — Rankings Data Readiness & Tournament Inventory

Release 7.9 prepares CPI for multi-group ranking expansion without publishing new rankings yet.

## Objective

Audit the tournament files collected after Release 7.8 and prepare the rankings system for top-100 expansion across 12U, 14U, 16U, and 18U boys/girls groups.

## What changed

- Added `data/tournament-coverage-7-9.json` with a structured tournament/source audit.
- Updated group hub empty states in `data.js` so non-live groups show **Ranking Intake** status instead of generic “coming soon” language.
- Updated platform metadata to reflect Release 7.9 data readiness.
- Added tournament coverage and intake workflow documentation.
- Preserved all existing public rankings, CPI scores, ranking order, club/team pages, and homepage structure.

## What did not change

- No new public rankings were published.
- No 14U Boys ranking order changed.
- No CPI scores changed.
- No tournament scoring logic changed.
- No homepage/rankings/clubs/team page visual redesign was done.

## Readiness summary

| Group | Source files | Tournaments | Games detected | Qualifier files | Futures files | Readiness |
|---|---:|---:|---:|---:|---:|---|
| 12U Boys | 11 | 10 | 1018 | 3 | 1 | ready for preliminary rankings |
| 12U Girls | 12 | 11 | 666 | 3 | 1 | ready for preliminary rankings |
| 14U Boys | 11 | 10 | 1330 | 2 | 1 | ready for preliminary rankings |
| 14U Girls | 12 | 11 | 720 | 3 | 1 | ready for preliminary rankings |
| 16U Boys | 10 | 10 | 902 | 2 | 1 | ready for preliminary rankings |
| 16U Girls | 5 | 5 | 271 | 3 | 1 | ready for preliminary rankings |
| 18U Boys | 7 | 7 | 486 | 2 | 1 | ready for preliminary rankings |
| 18U Girls | 4 | 4 | 256 | 3 | 1 | near ready manual review needed |

## Release decision

The uploaded dataset is strong enough to begin preliminary ranking construction for every roadmap group except 18U Girls, which is close but should receive extra manual review because its source count and total game volume are lower than the other groups.

Junior Olympics is not included because it has not happened yet. JO results should become the next major weighting layer once available.

## Validation checklist

After installing the targeted files, check:

- `index.html` loads unchanged.
- `rankings.html` loads unchanged.
- `14u-boys.html` remains live.
- `12u-boys.html`, `12u-girls.html`, `14u-girls.html`, `16u-boys.html`, `16u-girls.html`, `18u-boys.html`, and `18u-girls.html` show Ranking Intake / data readiness messaging instead of generic coming-soon placeholders.
- `data/tournament-coverage-7-9.json` opens in the browser if requested directly.

## Suggested commit message

```text
Release 7.9 rankings data readiness
```

## Suggested commit description

```text
- Add tournament coverage audit for uploaded ranking source files
- Update group hub empty states with data readiness signals
- Document rankings intake workflow and group readiness status
- Preserve existing public rankings, CPI scores, and page structure
```
