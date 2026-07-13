# CPI Release 7.24 — Core UI Simplification Pass

## Purpose

Release 7.24 removes confusing or fake-feeling content and simplifies the major CPI pages before additional ranking/data cleanup.

This release does not change ranking order, CPI scores, team data, logo files, ranking model logic, or post-JO pipeline files.

## Included

### Homepage

- Reworks the hero into credible CPI/product messaging instead of fake tournament/story headlines.
- Replaces generic article photos with club-logo/CPI-logo story cards.
- Removes the fake Upcoming Tournaments card and replaces it with a data-status card.
- Keeps the current homepage structure, rankings picker, at-a-glance cards, newsletter, and footer.

### Rankings Page

- Removes the oversized right-side current-group hero card.
- Simplifies the headline and page flow.
- Adds age/gender pill navigation.
- Shows Top 25 by default.
- Adds View Next 25, Show All, and Back to Top 25 controls.
- Keeps search and age/gender selector.

### Clubs Page

- Simplifies the hero and removes the oversized club-count panel.
- Improves top-club and movement-signal spacing.
- Shows Top 25 clubs by default.
- Adds View Next 25, Show All, and Back to Top 25 controls.
- Keeps club search, region filter, and ranked-only filter.

### Club Profile Pages

- Removes club-level movement KPI.
- Removes Best Wins from club pages.
- Keeps team-specific movement and best-win context on team pages only.
- Refocuses club pages on club-level metrics: ranked teams, best rank, average CPI, age groups, top team, and footprint.

### Data QA

- Adds `data/qa/team-audit-notes.csv` as a structured place to track duplicate teams, bad aliases, missing logos, wrong regions, and ranking review notes.

## Files

- `index.html`
- `rankings.html`
- `clubs.html`
- `club.html`
- `css/page-simplification-v7-24.css`
- `js/rankings-v7-24.js`
- `js/club-intelligence-v7-24.js`
- `data/qa/team-audit-notes.csv`
- `docs/RELEASE_7_24_UI_SIMPLIFICATION.md`
- `VERSION.md`
