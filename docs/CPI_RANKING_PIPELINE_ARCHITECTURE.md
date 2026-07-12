# CPI Ranking Pipeline Architecture

## Purpose

CPI needs to move from one-time ranking builds to a repeatable ranking pipeline.

The long-term goal is:

> Tournament results arrive → results are normalized → aliases are resolved → games become evidence → rankings update → review packet is generated → release is published.

## Core pipeline stages

### 1. Source intake

Accept tournament data from:

- CSV exports
- Excel exports converted to CSV
- published Google Sheets
- structured JSON
- manually cleaned spreadsheets

Each source should be registered in the tournament registry before it is used for ranking.

### 2. Tournament registry

Every tournament should have a registry entry with:

- tournament name
- season
- start date and end date
- source files or source URLs
- age/gender groups included
- division/tier labels
- ranking weight
- source reliability
- notes

### 3. Game evidence normalization

Every parsed game should become a normalized record:

- game ID
- tournament ID
- date
- age group
- gender
- division
- division tier
- round / placement context
- team A
- team B
- score A
- score B
- winner
- raw source value
- canonical team IDs
- confidence score

### 4. Team alias resolution

Alias resolution must happen before ranking.

Examples:

- `San Clemente A` and `San Clemente Black` may be the same team in one age/gender group.
- `Lamorinda B` and `Lamorinda Gold` may be the same team in one age/gender group.
- `Lamorinda A` is not the same as `Lamorinda B / Gold`.
- `CC United A` and `CC United Black` may need age-specific treatment.

Alias rules must be scoped by age/gender whenever possible.

### 5. Ranking model

The ranking model should combine:

- head-to-head results
- major-event placement
- common opponents
- strength of schedule
- division tier
- recency
- game volume
- close losses
- blowout context
- team-depth hierarchy
- manual review flags

### 6. Review packet generation

Every ranking release should produce a review packet with:

- top 25 by group
- major-event finish
- JO Qualifier finish
- game count
- best wins
- notable losses
- D2/D3 teams in high ranking bands
- B/C teams in high ranking bands
- low-game teams in top 25
- duplicate/alias warnings
- teams newly added
- teams removed

### 7. Ranking snapshots

Every public ranking release should be saved as a snapshot:

- `pre-jo-2026`
- `post-jo-2026`
- `ec-cup-2027`
- `kap7-2027`
- `futures-2027`

Snapshots allow CPI to show movement, compare model accuracy, and understand how teams changed over time.

## Recommended future folders

```text
data/ranking-pipeline/
  model-weighting-7-18.json
  schemas/
  templates/
  snapshots/
  source-registry/
  review-packets/
```

This release creates the scaffolding; future releases can add executable parsing and ranking scripts.

