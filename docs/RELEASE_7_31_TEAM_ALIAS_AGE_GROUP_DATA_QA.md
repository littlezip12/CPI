# CPI Release 7.31 — Team Alias + Age Group Data QA

Status: targeted QA/reporting release.

## Purpose

7.31 creates structured review files for the remaining team/alias/data issues before any fixes are applied. It does **not** change rankings, CPI scores, team order, slugs, logos, regions, page layouts, or model logic.

## Files added

- `data/qa/team-alias-age-group-audit-7-31.csv`
- `data/qa/team-alias-age-group-audit-7-31.json`
- `data/qa/team-alias-fixes-template-7-31.csv`
- `data/qa/team-depth-review-7-31.csv`
- `data/qa/club-identity-consistency-review-7-31.csv`
- `data/qa/missing-official-logo-review-7-31.csv`
- `data/qa/quiksilver-evidence-review-7-31.csv`
- `data/qa/age-group-data-qa-summary-7-31.csv`
- `data/qa/age-group-data-qa-summary-7-31.json`

## Audit totals

- Ranked teams audited: **506**
- Active clubs audited: **143**
- Team fix/template rows: **404**
- Same-club depth review rows: **82**
- Quiksilver evidence review rows: **218**
- Clubs still needing official logo source review: **72**

## Intended workflow

1. Review `team-alias-fixes-template-7-31.csv`.
2. Fill in the decision/canonical columns for teams that should be merged, renamed, held separate, or re-clubbed.
3. Review `team-depth-review-7-31.csv` for A/B/C/color hierarchy issues.
4. Review `missing-official-logo-review-7-31.csv` for remaining logo gaps.
5. Use the reviewed files as input for 7.32, which should apply approved alias/data fixes.

## Non-goals

This release does not apply any fixes. It only identifies candidate issues and creates the working files for manual review.
