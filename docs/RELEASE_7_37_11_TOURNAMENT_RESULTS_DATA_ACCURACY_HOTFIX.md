# Release 7.37.11 — Tournament Results Data Accuracy Hotfix

## Purpose

The tournament results tools were closer, but still allowed unresolved bracket/path labels to appear as team names. In Boys Super Finals, selecting `Alameda` also combined rows from 14U Boys D3 and 18U Boys D2 because the team results panel was not scoped tightly enough to the selected age/division.

## Changes

- Treat single-letter placeholder values such as `L` and `W` as non-teams.
- Treat unresolved winner/loser labels such as `W#31`, `L#30`, and pool-slot labels such as `M1(1stf)` as non-teams unless followed by an actual team name.
- Continue stripping labels when an actual team is present, for example:
  - `W#31 - Norcal` → `Norcal`
  - `L#30 - Rancho Tsunami` → `Rancho Tsunami`
  - `M1(1stf) - SBWPC` → `SBWPC`
- Scope the selected-team journey/results panel to the active age/division.
  - Example: selecting `Alameda` in `14U Boys D3` should no longer include `18U Boys D2` Alameda games.
- Refresh tournament result pages to load `results-app.js?v=7.37.11`.

## Not changed

- CPI rankings
- CPI scores
- ranking model logic
- club pages
- team pages
- JO Girls Tournament Journey routing
- source tab configuration

## Follow-up

If a specific tournament sheet still exposes incorrect team names, review the row format and add another parser guard only for that pattern.
