# WPI 7.58.7 — Club Pilot Validation & Observability

## Purpose

7.58.7 does **not** declare WPI Club Pilot Ready. It adds an Owner/Admin observability panel to the **All Lamorinda Teams** workspace so the remaining real-world pilot gates are visible from canonical WPI Live records rather than tracked from memory.

The panel reports:

- number of active club teams
- roster/scorer readiness by team
- enabled + successfully tested GroupMe routes by team
- cross-team GroupMe destination mismatches (must remain zero)
- concurrent games observed across distinct club teams
- accepted scorer handoffs observed
- Follow/member overlap guard
- multi-game Tournament/Scrimmage Weekend evidence
- linked official schedule games
- unlisted/manual opponent names waiting for deliberate identity review
- offline → reconnect as a **manual real-device proof**

## Infrastructure

- Supabase migration required: `202608130004_club_pilot_validation_observability.sql`
- Migration is function-only / read-only observability; it does not rewrite team, roster, membership, game, scorer, delivery or archive records.
- No Edge Function redeploy.
- No new secret.

## Installation

Install the cumulative patch over the latest pushed 7.58.6 repository, run the focused release gate, apply the Supabase function migration, validate the Owner All Teams panel, then run the full release gate.

Do not call 7.59.0 ready simply because the panel exists. Real-device and external-source gates still have to be exercised.
