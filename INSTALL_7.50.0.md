# CPI 7.50.0 — Unified Light Tournament Experience

Merge the patch at the root of the existing CPI repository. Do not place the extracted patch inside `tournaments/`.

## Install

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
ditto -x -k "$HOME/Downloads/CPI-7.50.0-UNIFIED-LIGHT-TOURNAMENT-EXPERIENCE-PATCH.zip" .
chmod +x release-check scripts/test-tournament-ui-v7-50.js scripts/validate-tournament-ui-v7-50.py
./release-check
```

## Release scope

- Light responsive redesign for Boys and Girls/Coed Junior Olympics pages.
- Unified tournament landing page.
- Dynamic division/team/schedule metrics.
- Existing data sources, fallback schedules, team pathways, share links, scores, stage labels, and ranking protections remain unchanged.
