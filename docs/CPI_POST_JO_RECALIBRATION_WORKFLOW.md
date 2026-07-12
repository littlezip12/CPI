# CPI Post-JO Recalibration Workflow

## Goal

Use Junior Olympics results to update every age/gender ranking while preserving full-season context.

## Step 1 — Collect JO source data

For each age/gender group, collect:

- Championship / D1 results
- Classic / D2 results
- Invitational / D3 results where available
- all group/pool games
- crossover games
- placement games
- final standings

Preferred formats:

1. CSV / Excel
2. Google Sheet published CSV
3. HTML table
4. PDF only if necessary
5. Screenshots only as a last resort

## Step 2 — Normalize JO games

Convert every JO game into the game evidence schema.

Important fields:

- tournament ID = `jo-2026`
- age group
- gender
- division
- division tier
- date
- round
- team A
- team B
- score A
- score B
- placement context

## Step 3 — Resolve aliases

Before ranking, run the team alias registry.

Manual review needed for:

- A / Black / Blue naming
- B / Gold / White naming
- clubs with multiple teams in same division
- age-specific alias differences

## Step 4 — Compare Pre-JO CPI to JO finish

For every team:

- Pre-JO CPI rank
- JO division
- JO finish
- JO record
- best JO win
- worst JO loss
- movement expectation

## Step 5 — Identify model validation outcomes

Create lists:

- CPI hits: teams that finished near predicted strength
- CPI misses: teams that over/underperformed significantly
- overrated teams
- underrated teams
- low-evidence teams validated by JO
- strong Pre-JO teams that underperformed JO
- D2/D3 teams that proved D1-level strength

## Step 6 — Recalculate rankings

Use JO as the strongest current-season event, while preserving:

- full-season body of work
- major-event context
- qualifier context
- division tier
- strength of schedule
- head-to-head
- common opponents
- team-depth guardrails

## Step 7 — Generate review packet

For every age/gender group, generate:

- top 25 review
- full ranking list
- JO finish comparison
- major movement list
- B/C team review
- D2/D3 upper-band review
- low-game top-25 review
- alias warnings

## Step 8 — Publish Post-JO rankings

Recommended release name:

```text
8.0 — Post-JO Rankings Recalibration
```

The release should update:

- rankings.json
- data.js
- group pages
- team profile pages
- ranking snapshot files
- review docs

## Step 9 — Preserve snapshots

Save both:

- Pre-JO rankings
- Post-JO rankings

This allows CPI to show actual model movement and compare ranking accuracy over time.

