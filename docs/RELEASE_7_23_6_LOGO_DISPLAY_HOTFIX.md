# CPI Release 7.23.6 — Logo Display Hotfix

## Purpose

Fix a logo rendering issue after the official/screenshot logo batches.

The canonical logo files are present in `assets/logos/canonical/`, but browser caching and a missing shared fallback asset can make pages appear as if logos are not loading.

## Changes

- Adds cache-busting query strings to local CSS and JavaScript references across HTML pages.
- Adds `js/logo-display-v7-23-6.js` to harden logo rendering after dynamic page content is inserted.
- Adds `assets/logos/cpi-logo-fallback.svg`.
- Keeps the full canonical logo library.
- Preserves all official/screenshot logo updates through 7.23.5.
- Adds `data/logo-display-audit-7-23-6.json`.

## Not changed

- Rankings
- CPI scores
- Ranking model logic
- Team/club slugs
- Page routing
- Post-JO pipeline files

## QA

Run locally:

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI
python3 -m http.server 8000
```

Check:

- `/`
- `/rankings.html?group=12u-boys`
- `/rankings.html?group=14u-girls`
- `/clubs.html`
- `/team.html?team=mission-a-12u-boys`
- `/team.html?team=del-mar-12u-girls`
- `/team.html?team=vanguard-12u-boys`
- `/club.html?club=del-mar`
