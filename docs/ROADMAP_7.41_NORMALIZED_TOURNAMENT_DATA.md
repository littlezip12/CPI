# CPI 7.41 — Normalized Tournament Data Foundation

## Purpose

Tournament viewers previously interpreted live spreadsheets independently in the browser. Release 7.41 introduces a reproducible evidence pipeline without disrupting the working public schedule tools.

## Included

- Central registry for five current tournament products and 48 source divisions.
- Automatic raw and normalized snapshots for 23 Junior Olympics divisions.
- Stable game IDs and source-row traceability.
- Separate participant fields for source text, JO seed, bracket reference, clean name, canonical team ID, and canonical club ID.
- Structured scores, outcomes, and winner/loser destinations.
- QA classification for blockers, unresolved identities, and placeholders.
- Six-hour GitHub Actions synchronization that commits only changed source data.
- A 192-game 14U Girls Championship bootstrap dataset migrated from the existing embedded fallback.

## Deliberately deferred

- Public pages consuming normalized JSON instead of their current live parsers.
- Manual identity overrides for every unresolved tournament alias.
- Ranking calculation from normalized evidence.
- Placements and team-profile result histories.

Those become the next vertical steps after the pipeline has banked and validated the current JO sources.
