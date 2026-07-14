# Release 7.37.9 — Tournament Results Team Name Hardening

## Scope

Small tournament-results hotfix.

## Changes

- Strip winner/loser advancement prefixes from team names in tournament filters and cards.
- Strip pool/placement slot prefixes like `M1(1stf) -` and `N2(2ndf) -`.
- Continue stripping seed/pool prefixes like `B1-`, `C2-`, and `1st A-`.
- Render cleaned team names in game cards and selected-team journey views.
- Refresh tournament results page cache-busting to `7.37.9`.

## Not changed

- CPI rankings
- CPI scores
- Club/team data
- JO Tournament Journey routing
- Stories
- Logos
- Regions
- Model logic
