# CPI 7.41.0

Normalized Tournament Data Foundation.

- Registers five tournament products and 48 source divisions in one authoritative source registry.
- Enables automated raw and normalized snapshots for all 23 Junior Olympics Weekend 1 and Weekend 2 divisions.
- Stores tournament seeds separately from clean team identities.
- Distinguishes real teams, bracket references, resolved advancement labels, and placeholders.
- Produces stable game IDs, source-row traceability, scores, outcomes, advancement destinations, and canonical team/club IDs.
- Adds blocking and review-level tournament QA to `./release-check`.
- Includes a banked 192-game 14U Girls Championship bootstrap snapshot.
- Adds a six-hour GitHub Actions sync that commits only when source-sheet content changes.

The public JO tools remain on their working live-sheet polling implementation while the normalized evidence bank is established underneath them.
