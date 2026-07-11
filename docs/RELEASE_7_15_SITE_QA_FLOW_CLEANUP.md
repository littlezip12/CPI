# Release 7.15 — Site QA, Flow, and Navigation Cleanup

Release 7.15 is a reliability and site-flow pass before the logo normalization and profile redesign work.

## Scope

This release focuses on making the current site easier to navigate and safer to build on.

### Included

- Repaired malformed homepage markup introduced during prior ranking-selector work.
- Preserved the homepage order: Header, Hero, Top Stories, At a Glance, Newsletter, Footer.
- Restored the three-slide hero, Top Stories grid, and At a Glance grid as separate sections.
- Expanded the homepage ranking selector to all live Pre-JO age/gender groups.
- Updated primary footer age-group links to include all live groups.
- Updated group hub buttons so each group page links to its own rankings view.
- Updated universal site-shell quick links to point directly to the live ranking groups.
- Fixed case-sensitive logo paths in static club pages for LAWPC, OCWPC, and Pride.
- Added a site-flow QA ledger.

### Not included

- No ranking order changes.
- No CPI score changes.
- No logo normalization pipeline yet.
- No team/club profile redesign yet.
- No JO tournament viewer yet.

## Verification checklist

Open these pages after installing:

- `/`
- `/rankings.html?group=12u-boys`
- `/rankings.html?group=12u-girls`
- `/rankings.html?group=14u-boys`
- `/rankings.html?group=14u-girls`
- `/rankings.html?group=16u-boys`
- `/rankings.html?group=16u-girls`
- `/rankings.html?group=18u-boys`
- `/rankings.html?group=18u-girls`
- `/12u-boys.html`
- `/14u-girls.html`
- `/clubs.html`
- `/club.html?club=mission`
- `/team.html?team=mission-a-12u-boys`
- `/methodology.html`
- `/tournaments.html`

## Next recommended releases

- 7.16 — Logo cleanup and asset normalization.
- 7.17 — Team/club profile UI refinement using the preferred visual direction.
- 7.18 — Ranking pipeline architecture for next season and post-JO recalibration readiness.
