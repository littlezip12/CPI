# CPI 7.52.3 — Water Polo Index Universal Shell

This release applies the approved Water Polo Index brand header and footer across the entire repository.

## Scope

- Adds cropped WPI header and footer logo assets.
- Loads the shared WPI shell on every HTML page.
- Supports root, one-level, and nested application paths.
- Replaces visible legacy headers and footers with the shared shell.
- Updates formal page-title branding to Water Polo Index.
- Updates the club-page generator so future builds stay consistent.
- Preserves ranking data, tournament data, routes, and application behavior.

## Validation

Run `./release-check` after applying the patch. Do not commit or push unless the final line is:

`CPI release check passed.`
