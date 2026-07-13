# CPI Release 7.33 — Data QA Dashboard + Audit Workflow

## Purpose

Release 7.33 adds a lightweight internal QA dashboard at:

```text
rankings-qa.html
```

The goal is to make the manual data audit easier before future alias/ranking cleanup releases.

## What changed

- Replaced the old single-age baseline QA page with a sitewide data QA dashboard.
- Added filters for age group, issue type, and search.
- Added review rows for:
  - same club / same age group depth checks
  - possible alias / duplicate-name issues
  - Quiksilver evidence rows
  - ranking review flags
  - missing logo path gaps
  - missing region gaps
- Added direct links to existing QA CSV files.
- Added dashboard summary JSON.

## Files added or updated

```text
rankings-qa.html
css/data-qa-dashboard-v7-33.css
js/data-qa-dashboard-v7-33.js
data/qa/data-qa-dashboard-summary-7-33.json
docs/RELEASE_7_33_DATA_QA_DASHBOARD.md
docs/CPI_DATA_QA_DASHBOARD_7_33.md
VERSION.md
```

## No ranking changes

This release does not change:

```text
rankings
CPI scores
team order
team names
team slugs
aliases
regions
logos
page routing
model logic
```

## Review workflow

1. Open `rankings-qa.html`.
2. Filter by age group.
3. Review flagged rows.
4. Record approved changes in `data/qa/team-alias-fixes-template-7-31.csv`.
5. Apply approved changes in a later data cleanup release.
