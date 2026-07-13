# CPI Release 7.26 — Club Page Cleanup + Club Directory Polish

## Purpose

Release 7.26 cleans up the club-facing pages after the region normalization work in 7.25. The goal is to make the clubs area feel more credible, easier to scan, and more clearly club-level rather than mixing in unexplained team movement or isolated team results.

## Scope

- Polish the `clubs.html` directory experience.
- Replace the prior rising-clubs/movement panel with a regional footprint panel.
- Add clickable region chips to the club directory.
- Keep Top 25 default behavior while improving the View More experience.
- Improve club card spacing, logo sizing, region display, and best-ranked-team context.
- Redesign the individual club profile hero to emphasize club-level metrics.
- Keep team-specific wins and movement off club profile pages.
- Preserve rankings, CPI scores, team ordering, logos, regions, routing, and model logic.

## Files Added

- `css/club-directory-v7-26.css`
- `js/club-intelligence-v7-26.js`
- `docs/RELEASE_7_26_CLUB_PAGE_DIRECTORY_POLISH.md`

## Files Updated

- `clubs.html`
- `club.html`
- `VERSION.md`

## Notes

The club profile pages now focus on:

- ranked teams
- best rank
- average CPI
- Top 25 teams
- best ranked team with age/gender context
- age-group footprint
- gender coverage
- ranked team portfolio

Movement and best wins remain team-level concepts and should live on team pages unless a true club-level calculation is introduced later.
