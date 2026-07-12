# CPI Release 7.21 — Logo Completion + Quality Pass

## Summary

Release 7.21 completes the logo layer across the active CPI site. The goal is to stop the site from feeling unfinished because of broken, inconsistent, or low-quality club/team logos.

## What changed

- Created/confirmed a canonical `assets/logos/canonical/<club-slug>.webp` asset for every active CPI club/ranked-team club slug.
- Updated club, team, ranking, homepage, and generated club data to point at canonical WebP logos.
- Converted additional repo-provided real logo files into canonical assets where available.
- Replaced remaining ugly placeholder SVG usage with polished CPI club badges.
- Added a logo-quality audit showing which clubs still need official source artwork later.
- Fixed case-sensitive logo path problems by moving display data to canonical paths.
- Rebuilt the Mission logo on a dark tile so the white wordmark no longer disappears on white cards.

## What did not change

- No ranking order changes.
- No CPI score changes.
- No tournament model changes.
- No page routing changes.

## Important note

Some clubs still do not have official source artwork in the repository. For those, CPI now uses a consistent branded club badge instead of the previous placeholder-style SVGs. These are flagged in `data/logo-quality-audit-7-21.json` with `officialSourceNeeded: true`.

## QA checklist

Check these pages locally after installing:

- `index.html`
- `rankings.html?group=12u-boys`
- `rankings.html?group=14u-girls`
- `team.html?team=mission-a-12u-boys`
- `team.html?team=aetos-18u-boys`
- `team.html?team=la-premier-14u-boys`
- `team.html?team=san-diego-shores-14u-girls`
- `club.html?club=mission`
- `club.html?club=aetos`
- `club.html?club=la-premier`
- `club.html?club=shore-aquatics`
- `clubs.html`

Confirm that logos render as clean square WebP assets and that no broken image icon appears.
