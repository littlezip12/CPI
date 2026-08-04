# WPI 7.55.1 Season Architecture

## Canonical convention

WPI uses competitive seasons in `startYear-endYear` form rather than calendar-year seasons.

- **2025–2026** is final. It begins with the October 2025 Evan Cousineau Memorial Cup and closes with the 2026 Junior Olympics cycle.
- **2026–2027** is active. It begins with the October 2026 Evan Cousineau Memorial Cup and remains in results-gathering status until reviewed rankings are published.
- Tournament `eventYear` and exact dates remain separate from competitive-season assignment.

## Immutable final snapshot

Release 7.55.1 banks the completed season under `data/seasons/2025-2026/`:

- 724 rankings across eight age/gender groups
- 182 club snapshots
- 724 ranked-team profile records
- eight public tournament-history records
- SHA-256 hashes for each snapshot asset

The season manifest defines the files as immutable after publication. Future tournament imports, age transitions, and ranking releases must not rewrite this snapshot.

## Active-season policy

The `2026-2027` manifest intentionally contains:

- zero public rankings
- zero ranked teams
- no fabricated preseason order
- no automatic age-up of 2025–2026 teams
- permission to collect verified tournament evidence before the first reviewed ranking publication

## Page defaults

Until reviewed 2026–2027 rankings exist:

- Rankings: 2025–2026 Final
- Teams: 2025–2026 Final context
- Clubs: 2025–2026 Final context
- Team profiles: 2025–2026 Final context
- Club profiles: 2025–2026 Final context
- Tournament history: 2025–2026 completed season

All supported pages accept stable `?season=2025-2026` or `?season=2026-2027` routes. Existing links without a season parameter remain valid and resolve to the page default.

## Protected competitive data

Release 7.55.1 does not change:

- rank order or WPI values
- team or club identities
- scores or placements
- tournament pathways or journeys
- logos or websites
- JO archive results
