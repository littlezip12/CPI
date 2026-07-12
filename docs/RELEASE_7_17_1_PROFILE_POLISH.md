# Release 7.17.1 — Profile UI Polish / Bug Cleanup

## Objective

Tighten the team and club profile experience after the 7.17 redesign without changing rankings, CPI scores, ranking model logic, homepage structure, or rankings page behavior.

## Changes

### Team profiles

- Added cache-safe 7.17.1 profile CSS and JS files.
- Improved team URL matching for legacy slugs and age/gender-aware slugs.
- Improved team profile not-found messaging so bad URLs do not fail silently.
- Tightened hero typography for long team names.
- Improved responsive behavior for KPI cards, profile tabs, sidebar rows, and same-age-group cards.
- Reduced risk of logo overflow and inconsistent logo sizing.
- Added more robust profile layout spacing and mobile behavior.

### Club profiles

- Added cache-safe 7.17.1 club profile CSS and JS files.
- Replaced fallback-to-first-club behavior with a real club not-found state.
- Improved club hero typography and mobile responsiveness.
- Improved club portfolio rows on smaller screens.
- Tightened logo rendering in club hero, club cards, and club tables.
- Improved official website link visibility inside branded club heroes.

## Not changed

- No ranking order changes.
- No CPI score changes.
- No ranking model changes.
- No homepage changes.
- No rankings page changes.
- No club/team data changes.
- No logo pipeline changes.

## Files changed

- `team.html`
- `club.html`
- `VERSION.md`
- `css/team-profile-v7-17-1.css`
- `css/club-intelligence-v7-17-1.css`
- `js/team-profile-v7-17-1.js`
- `js/club-intelligence-v7-17-1.js`
- `docs/RELEASE_7_17_1_PROFILE_POLISH.md`

## Test checklist

- `team.html?team=vanguard`
- `team.html?team=vanguard-12u-boys`
- `team.html?team=newport-beach-18u-boys`
- `team.html?team=lamorinda-a-14u-girls`
- `club.html?club=mission`
- `club.html?club=lamorinda`
- `club.html?club=newport-beach`
- `rankings.html?group=12u-boys`
- mobile team profile layout
- mobile club profile layout
