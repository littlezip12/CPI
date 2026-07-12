# CPI Release 7.22 — Page Polish + Public Readiness Pass

## Purpose

Release 7.22 makes the current CPI site feel more consistent and ready for external review without changing any ranking data or model logic.

This release follows the 7.21 logo completion pass and focuses on page-level fit and finish across the primary user paths:

1. Homepage
2. Rankings
3. Clubs directory
4. Team profiles
5. Club profiles
6. Tournaments
7. Methodology
8. Age/gender group hubs

## What changed

### Global polish

- Added a shared page-polish stylesheet: `css/page-polish-v7-22.css`.
- Added a small page-polish helper script: `js/page-polish-v7-22.js`.
- Improved active navigation behavior across dynamic pages.
- Added header scroll state behavior for the V8 shell.
- Added lazy-loading / async-decoding hardening for images.
- Standardized external-link handling.
- Improved focus states for keyboard navigation.

### Header and navigation

- Improved sticky header shadow/backdrop behavior.
- Kept primary navigation visible on smaller screens using horizontal scrolling instead of fully hiding the nav.
- Improved mobile header wrapping and search-button behavior.
- Standardized active nav states across top-level pages.

### Homepage

- Tightened hero sizing and responsive behavior.
- Improved story-card, glance-card, and newsletter card consistency.
- Improved mobile stacking and row behavior.
- Updated trending club links to route through the dynamic club profile page.

### Rankings page

- Tightened hero, toolbar, and ranking-row spacing.
- Improved ranking row readability and hover behavior.
- Improved mobile ranking card layout.
- Improved team logo display consistency.

### Clubs and profiles

- Improved club directory card polish.
- Improved profile tab behavior.
- Improved team/club logo handling across cards, rails, and profile headers.
- Improved mobile behavior for team side rails and profile tabs.

### Tournaments and Methodology

- Rebuilt both pages onto the newer CPI V8 shell.
- Added more finished public-facing methodology copy.
- Preserved tournament card population from existing tournament data.

### Supporting routes

- Added the page polish stylesheet and helper script to age/gender group hub pages.
- Updated `js/smart-club-cards.js` so club links point to the dynamic profile route.

## What did not change

- No ranking order changes.
- No CPI score changes.
- No ranking model logic changes.
- No post-JO pipeline logic changes.
- No team identity or alias changes.
- No logo asset changes beyond display treatment.

## QA checklist

Test these pages locally before pushing:

- `index.html`
- `rankings.html?group=12u-boys`
- `rankings.html?group=14u-girls`
- `clubs.html`
- `club.html?club=mission`
- `club.html?club=lamorinda`
- `club.html?club=newport-beach`
- `team.html?team=mission-a-12u-boys`
- `team.html?team=vanguard-12u-boys`
- `team.html?team=la-premier-14u-boys`
- `tournaments.html`
- `methodology.html`
- `12u-boys.html`

Validate:

- Header appears at the top on refresh.
- Mobile nav remains usable.
- Rankings selector still works.
- Ranking search still works.
- Team links open team profiles.
- Club links open club profiles.
- Logos do not stretch.
- Tournaments render cards.
- Methodology page no longer looks like an older site template.


## v2 Logo Frame Removal Update

- Removed heavy rounded-card logo frames across homepage, rankings, clubs, team profiles, and club profiles.
- Enlarged logo display footprints now that logos are standalone marks.
- Added normalized transparent-background canonical logo assets where source images had edge-connected white backgrounds.
- Preserved fallback initials/badges for missing logos only.
