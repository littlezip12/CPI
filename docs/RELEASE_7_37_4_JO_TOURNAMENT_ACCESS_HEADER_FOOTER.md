# Release 7.37.4 — JO Tournament Access + Integrated Header/Footer

## Summary

This release improves the public tournament experience after the JO Girls Tournament Journey integration.

## Changes

- Replaced the generic tournaments intro with a focused **Weekend 1 Junior Olympics** banner.
- Promoted the JO Girls/Coed Tournament Journey as the primary action on `tournaments.html`.
- Added a clearer supporting tournament card layout.
- Added the CPI header and footer to `tournaments/jo-girls/index.html`.
- Kept the JO tool self-contained under `tournaments/jo-girls/`.
- Preserved all CPI ranking data, scores, clubs, stories, logos, and model logic.

## Test URLs

- `/tournaments.html`
- `/tournaments/jo-girls/`
- `/jo-girls.html`
- `/`

## Notes

The JO Tournament Journey still uses its own embedded tool styling, but now carries the CPI navigation and footer so users can return to the main site easily.
