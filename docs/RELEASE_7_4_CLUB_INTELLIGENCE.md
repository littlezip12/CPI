# Release 7.4 — Club Intelligence

## Objective

Turn CPI's club experience into a richer club-intelligence layer without changing homepage structure or ranking data.

## Scope

- Redesign `clubs.html` as a club intelligence directory.
- Redesign `club.html` as a club profile view.
- Align both pages with the homepage header and footer.
- Use the existing `window.CPI_CLUBS` and `window.CPI_RANKINGS` data sources.
- Preserve current ranking methodology and data.

## Included features

- Club intelligence hero and summary metrics.
- Top club signals panel.
- Rising clubs panel.
- Searchable and filterable club directory.
- Region filter.
- Ranked-only filter.
- Club cards showing ranked teams, average CPI, top-25 count, best rank, movement, and group footprint.
- Club profile page with ranked team portfolio, top team, average CPI, best rank, movement, and best-win context.
- Mobile-first responsive layout.

## Files changed

- `clubs.html`
- `club.html`
- `css/club-intelligence-v7-4.css`
- `js/club-intelligence-v7-4.js`
- `docs/RELEASE_7_4_CLUB_INTELLIGENCE.md`

## Not changed

- Homepage structure
- Rankings data
- Ranking algorithm
- Team pages
- Tournament pages

## QA checklist

- Visit `/clubs.html`.
- Confirm homepage-style header appears once.
- Confirm homepage-style footer appears once.
- Confirm club cards load.
- Search by club name and region.
- Use region filter.
- Toggle ranked-only filter.
- Click a club card and confirm `club.html?club=<slug>` loads.
- Confirm club profile metrics and ranked team rows render.
- Confirm mobile layout stacks cleanly.
- Confirm `/` and `/rankings.html` are unchanged.
