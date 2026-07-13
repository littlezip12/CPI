# CPI Release 7.27 — Rankings Page Polish + Top 25 UX

## Purpose

Release 7.27 improves the rankings page presentation without changing ranking data, CPI scores, team order, aliases, logo assets, regions, routing, or model logic.

## Changes

- Replaces the older rankings hero treatment with a cleaner CPI rankings masthead.
- Adds a compact data-status strip for selected group count, Top 25 first-view behavior, Pre-JO snapshot status, and alias-cleanup status.
- Reworks the ranking board toolbar with clearer selected-group messaging and tighter search/dropdown controls.
- Adds a data-backed top-three podium panel for the selected age/gender group.
- Keeps Top 25 default behavior.
- Keeps View Next 25, Show All, and Back to Top 25 behavior.
- Refines ranking rows for readability:
  - larger standalone logos
  - clearer rank/team hierarchy
  - club links in row metadata
  - tighter CPI/movement/latest/evidence columns
  - simplified mobile layout
- Adds dedicated rankings polish CSS and a new 7.27 rankings renderer.

## Files changed

- `rankings.html`
- `css/rankings-polish-v7-27.css`
- `js/rankings-v7-27.js`
- `VERSION.md`
- `docs/RELEASE_7_27_RANKINGS_PAGE_POLISH.md`

## Files intentionally not changed

- Ranking data
- CPI scores
- Team order
- Club/region assignments
- Logo assets
- Team pages
- Club pages
- Homepage
- Post-JO pipeline files

## QA checklist

Test locally with:

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI
python3 -m http.server 8000
```

Review:

- `/rankings.html?group=12u-boys`
- `/rankings.html?group=14u-girls`
- `/rankings.html?group=16u-boys`
- `/rankings.html?group=18u-girls`

Confirm:

- Top 25 displays by default.
- View Next 25 expands correctly.
- Show All expands full selected group.
- Back to Top 25 resets and scrolls back to the board.
- Age/gender pills update the selected group and URL.
- Search works by team, club, region, or tournament.
- Top-three podium is hidden during search and visible when search is cleared.
- Team links open team pages.
- Club names in ranking rows open club pages.
- Logos render without boxed frames.
- Mobile layout stays readable.
