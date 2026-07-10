# Release 7.5 — Team Pages Foundation

## Objective

Create dynamic CPI team profile pages that turn each ranked team into a branded, navigable profile.

## Scope

- Replace the legacy `team.html` shell with a modern team profile route.
- Preserve existing ranking data and team URLs.
- Use homepage-style header/footer.
- Dynamically inherit club/team colors, logo, region, and ranking data.
- Keep this as a targeted release without changing homepage, rankings, clubs, or data files.

## Files Added / Updated

- `team.html`
- `team-profile.html`
- `css/team-profile-v7-5.css`
- `js/team-profile-v7-5.js`

## Features

- Team hero with club branding.
- Current rank and CPI snapshot.
- Movement and latest tournament context.
- Best win signal.
- Club identity card.
- Other ranked teams from the same club.
- Nearby teams in the same group.
- Future-ready section for trend charts, story mentions, historical movement, and recent tournament history.

## Notes

This release establishes the dynamic page architecture. It does not change ranking logic or underlying team data.

## 7.5.1 targeted refinement

- Replaced movement text emphasis with directional arrows plus compact numeric movement.
- Fixed team color application so club/team primary and secondary colors override the default page variables.


## 7.5 v3 cleanup

- Enlarged and clarified movement arrow treatment on team snapshot cards.
- Preserved dynamic club color handling from v2.


## 7.5 v4 cleanup

- Simplified movement indicator to a larger red/green directional arrow without the circular icon treatment.
- Preserved club color-driven team profile styling from prior 7.5 updates.


## v5 movement indicator cleanup

- Replaced small triangle movement icons with larger arrow glyphs.
- Forced directional movement color on the full indicator, including icon and number.
- Increased movement indicator scale while preserving supporting text.


## v6 movement indicator cleanup

- Fixed inherited snapshot span styling that was shrinking the movement arrow and number.
- Matched movement arrow/number scale to the neighboring snapshot metrics.
- Preserved red/green/neutral directional coloring.
