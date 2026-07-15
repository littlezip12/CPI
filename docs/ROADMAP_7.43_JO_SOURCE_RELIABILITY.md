# CPI 7.43 — Full JO Schedule Banking & Source Reliability

## Objective

Make every registered Junior Olympics division observable and safe before results begin flowing. CPI must know which schedules are banked, which official sources are current, and which games are truly completed without blending or guessing between sources.

## Source policy

1. One registered source publishes each division.
2. A failed or invalid source never replaces a verified snapshot.
3. CPI does not merge Google Sheets and OneDrive feeds for the same division.
4. A future source change must be deliberate and division-scoped.
5. Every banked record retains source row, workbook, tab, fetch time, and content hash.

## Pre-tournament rules

- Empty scores remain scheduled.
- Partial score entries remain scheduled and enter QA review.
- Blank `0-0` cells remain scheduled.
- No team record is shown until at least one final result exists.
- A dataset fetched before its first scheduled date cannot contain final games.
- Bracket references remain structured references rather than team identities.

## Operational outputs

- `data/tournaments/health/index.json`
- `data/tournaments/health/runtime.js`
- `tournament-source-health.html`
- Complete `data/tournaments/qa/sync-latest.json` after every workflow run

## Release boundary

7.43 improves data reliability and observability. It does not change published CPI rankings automatically. Final results continue into the manual ranking-review queue introduced in 7.42.
