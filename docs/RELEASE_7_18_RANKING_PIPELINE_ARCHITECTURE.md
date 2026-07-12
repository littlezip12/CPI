# Release 7.18 — Ranking Pipeline Architecture

## Objective

Prepare CPI for post-Junior Olympics recalibration and next-season tournament-by-tournament ranking updates without changing the current public rankings.

This release creates the architecture layer for how future tournament data should be stored, reviewed, weighted, and converted into ranking updates.

## What changed

Added:

- ranking pipeline architecture documentation
- post-JO recalibration workflow
- ranking model specification
- tournament registry schema
- game evidence schema
- team alias registry schema
- ranking snapshot schema
- review packet schema
- model weighting configuration
- templates for future data intake

## What did not change

No changes were made to:

- rankings
- CPI scores
- ranking order
- team pages
- club pages
- rankings page
- homepage
- logo system
- routing

## Why this matters

CPI was built late in the season using historical tournament data in bulk. Starting next season, the goal is to update rankings after each major milestone:

- early fall tournaments
- Holiday Cup / KAP7 / Turbo / major invite weekends
- Futures Super Finals
- US Club Championships
- JO Qualifiers
- Junior Olympics

This release defines the data architecture needed to do that in a repeatable way.

## Release artifacts

- `docs/CPI_RANKING_PIPELINE_ARCHITECTURE.md`
- `docs/CPI_RANKING_MODEL_SPEC_7_18.md`
- `docs/CPI_POST_JO_RECALIBRATION_WORKFLOW.md`
- `data/ranking-pipeline/README.md`
- `data/ranking-pipeline/model-weighting-7-18.json`
- `data/ranking-pipeline/schemas/*.schema.json`
- `data/ranking-pipeline/templates/*.json`

## Validation approach

This release is documentation/data-schema only. Validation should confirm files were installed in the correct folders and that the site still loads unchanged.

