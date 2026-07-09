# Release 7.3 — Rankings Redesign

## Scope

Release 7.3 begins the rankings page redesign without changing the ranking data model or homepage structure.

This release focuses on presentation and interaction only:

- Hero header for rankings context
- Sticky filters
- Search by team, club, group, or region
- Featured top ranking cards
- Rich ranking rows with logo, club, group, CPI, movement, latest tournament, best win, and tracked games
- Mobile-first card layout
- Improved movement indicators
- Methodology framing for progression, strength of schedule, bracket context, and human review

## Ranking Philosophy Preserved

CPI estimates team strength, not accomplishment totals. Division results are treated as context, not as statewide rank by themselves. A lower-division champion may still rank behind teams from stronger divisions when the broader tournament path and opponent quality support it.

## Files Added or Changed

- `rankings.html`
- `css/rankings-v7-3.css`
- `js/rankings-v7-3.js`
- `docs/RELEASE_7_3_RANKINGS_REDESIGN.md`

## Testing Checklist

1. Open `rankings.html` locally.
2. Confirm the universal CPI header appears once.
3. Confirm the rankings hero appears below the header.
4. Confirm search filters by team and club.
5. Confirm the group filter works.
6. Confirm mobile layout stacks ranking rows cleanly.
7. Confirm team links still point to `team.html?team=...`.
8. Confirm logos load or fall back gracefully.
9. Confirm homepage remains unchanged.


## 7.3 v3 footer cleanup

- Removed the legacy site-shell script from `rankings.html` so it no longer injects the old footer below the homepage-style footer.
- Removed the unused site-shell stylesheet dependency from `rankings.html`.
- Kept the homepage-style header and footer as the only page shell.
