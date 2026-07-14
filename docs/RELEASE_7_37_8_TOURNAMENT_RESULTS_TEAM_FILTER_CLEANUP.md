# CPI Release 7.37.8 — Tournament Results Team Filter Cleanup

## Purpose

Clean up tournament result page team selectors after live sheet parsing exposed pool, seed, and placement labels as selectable teams.

## Changes

- Strip prefixes such as `B1-`, `C2-`, `1st A-`, `1sta -`, and `(1st J) -` before displaying teams.
- Treat pure numbers and placement-only references as non-team values.
- Scope the team dropdown to the selected age/division.
- Keep all game/result rows available in the full results list.
- Refresh result page script references to avoid cached v7.37.7 behavior.

## Not Changed

- CPI rankings
- CPI scores
- team rankings data
- club data
- regions
- logos
- JO Girls Tournament Journey logic
- model logic
