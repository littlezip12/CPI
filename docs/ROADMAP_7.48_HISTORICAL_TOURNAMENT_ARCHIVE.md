# CPI 7.48 — Historical Tournament Archive

## Objective

Move completed tournaments onto the same normalized, traceable data model used by Junior Olympics without treating completed-event source refreshes as live operations or allowing unaudited historical data to alter rankings.

## Initial archive events

- 2026 Quiksilver Cup — 7 divisions
- 2026 Boys Futures Super Finals — 13 divisions
- 2026 Girls US Club Championships — 5 divisions

## Control rules

- One registered source per division.
- Raw source rows and normalized games are preserved.
- Invalid responses cannot replace a last-known-good archive.
- Completed-event synchronization runs separately from live JO synchronization.
- Historical games are searchable but `rankingEvidenceEnabled` remains false.
- Public ranking publication remains manual.

## Next gate

After the first archive workflow run, audit source coverage, identity resolution, final-game counts, duplicates, and placement completeness. Only events that pass that review may become ranking evidence in a later release.
