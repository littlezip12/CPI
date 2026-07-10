# Release 7.7 — Data & Identity Cleanup

## Objective

Normalize club identity metadata so Rankings, Clubs, Club Profile, and Team Profile pages use more consistent club regions, logos, colors, and runtime data.

## Scope

- Normalized club regions across runtime data.
- Propagated club-level logo/color/website/region metadata down into ranking/team records.
- Synchronized `rankings.json`, `clubs.json`, `club-registry.json`, `club-registry.csv`, `logo_map.csv`, and `data.js`.
- Added an `identityStatus` flag for future cleanup.
- Preserved homepage, rankings UI, clubs UI, and team-page UI.

## Notes

This release intentionally avoids UI redesign. Some ambiguous clubs remain marked `Region TBD` or `Out of State / Needs Review` so they can be reviewed manually instead of guessed.

## Data Summary

- Clubs tracked: 79
- Clubs with normalized region values: 69
- Clubs still needing identity review: 49

## Suggested QA

Check these pages after install:

- `/`
- `/rankings.html`
- `/clubs.html`
- `/club.html?club=la-jolla-united`
- `/club.html?club=alameda`
- `/team.html?team=alameda-a`
- `/team.html?team=sd-dons-a`

Confirm filters still work and club/team pages continue inheriting club colors.
