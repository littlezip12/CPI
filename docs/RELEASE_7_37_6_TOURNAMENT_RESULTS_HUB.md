# Release 7.37.6 — Tournament Results Hub + USAWP Logo

## Summary
This release updates the CPI tournaments hub and starts the reusable tournament-results layer.

## Changes
- Uses the user-provided USA Water Polo logo on the JO Girls & Coed tournament banner.
- Adds `tournaments/quicksilver-cup/` as a searchable tournament results page.
- Adds staged pages for:
  - `tournaments/boys-superfinals/`
  - `tournaments/girls-club-championships/`
- Adds shared tournament results files:
  - `tournaments/results.css`
  - `tournaments/results-app.js`
- Keeps the JO Tournament Journey under `tournaments/jo-girls/`.
- Restores `tournaments/jo-girls/app.js` and the 14U Girls fallback CSV.

## Data note
Quiksilver has known source gids and a CPI fallback evidence file. Boys Futures Super Finals and Girls US Club Championships still require public source sheet URLs/gids before their pages can show every game and score.
