# CPI 7.45 — JO Live Results & Performance Readiness

## Purpose
Prepare CPI for the transition from schedule-only data to verified Junior Olympics results without breaking the automated release pipeline or changing rankings automatically.

## Capabilities
- Reconcile verified final-game counts with the normalized tournament bank.
- Calculate each team's JO record, goals for/against, and goal difference.
- Identify best wins and worst losses using CPI rank and JO seed context.
- Infer confirmed division placements only from completed placement games such as `1st`, `3rd`, `5th`, and `7th`.
- Compare official JO seed with confirmed division finish while keeping seed separate from team identity.
- Show division progress across all 23 JO divisions.
- Feed a dedicated performance tracker and the manual ranking-review workflow.

## Guardrails
- Scheduled, partial-score, and blank 0-0 games are excluded.
- Bracket labels such as `1st/2ndR` are not treated as placement games.
- Round-robin placement groups remain unresolved until a later standings rule is explicitly implemented.
- Tournament-only teams remain outside published rankings.
- No script writes to `rankings.json` or `data.js`.

## Next phase
CPI 7.46 should add the post-JO review packet and controlled ranking-decision workflow: expected finish, JO over/underperformance, reviewer decisions, snapshot comparison, and publish-ready change sets.
