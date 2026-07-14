# JO Girls Tournament Journey v5.3.0

Targeted production recovery and site expansion release.

## What changed

- Adds a more resilient live Google Sheets loader.
- Tries CSV export first, then Google Visualization JSONP by both gid and sheet name.
- Keeps the existing 14U Girls Championship embedded fallback.
- Adds current and legacy gid aliases where known.
- Adds full division schedule search below the selector.
- Adds team-share URLs using `?division=<division-id>&team=<team-name>`.
- Adds a Share team/division link button.
- Preserves team-first tournament journey, next-game cards, win/loss paths, possible opponents, and relevant bracket games.

## Known fallback limitation

The repo currently contains only one embedded offline fallback CSV/data source:

- `2026_NJO_Public_Sched_S1 - 14U_F_Champ.csv`

All other divisions rely on live Google Sheets and browser cache until their CSV fallbacks are provided.

## Publish

Replace the repo files with this package, then:

```bash
git add .
git commit -m "Release v5.3 live data recovery and team links"
git push
```

After GitHub Pages deploys, hard refresh the live site.
