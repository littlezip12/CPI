# CPI 7.50.8 — JO All-Division Route Continuity

## Problem

The 14U route-label patch worked, but 12U, 16U, and 18U could still show “No upcoming game” when Google had already written the selected team into a future route cell. Some source games have blank winner/loser destinations, and non-14U Girls divisions did not have an embedded verified schedule to restore missing route metadata.

## Resolution

- Treat a recognized route token with an appended known team name as an authoritative participant assignment.
- Seed pool-slot and placement maps from those assignments.
- Carry the assignment to every future game using the same slot.
- Support direct W/L labels, pool slots, pool placements, compact group placements, fourth/fifth-place routes, annotated multi-letter pool slots, and all current Boys track families.
- Resolve `W#U1/U4`-style pool-matchup paths directly from completed source games, before Google rewrites the future participant cell.
- Preserve group/seed assignments such as `M4-OCWPC RED` even when the sheet omits parentheses around the overall seed.
- Load all 11 Girls/Coed official repository snapshots before live Google requests, while retaining the 12 embedded Boys schedules.
- Support lettered Girls game numbers used in the 12U bracket.

## Regression coverage

- Lamorinda A in 18U advances into Games 80 and 95 even when the preceding game’s winner destination is blank.
- A single `pt_P1-LAMORINDA A` label resolves every bare `pt_P1` game.
- Route parsers cover `pt`, `au`, `ag`, `bz`, `ni`, and `cu` tracks, multi-letter pools such as `AA`, and placement ranks through fifth.
- Pool-matchup routes such as `W#U1/U4` and `L#P2/P3` resolve from their completed source games.
- All 11 Girls/Coed repository snapshots and all 12 Boys embedded schedules are validated.
- 12U Girls Games 135A, 147A, and 152A are retained.
