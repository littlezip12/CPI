# CPI 7.50.7 — JO Assigned Route Label Resolution

## Problem

The official Google Sheet can replace a clean route token with a route token plus the assigned team name. In the 14U Girls Championship example, Games 82 and 98 contained participant text such as:

- `pt_P1-DIABLO ALLIANCE A`
- `pt_P2-LAMORINDA A`

Schedule search found those games because the team name was visible in the raw participant cell. The selected-team journey did not include them because the route parser required the entire cell to be only `pt_P1` or `pt_P1-`.

The result was contradictory UI: Diablo Alliance A appeared 2–0 and tournament-complete while Games 82 and 98 were visible in search.

## Resolution

- Parse the structured route token at the start of a participant cell even when Google appends an assigned team name.
- Resolve the selected team through the clean route identity rather than treating the full raw cell as a new team identity.
- Apply the same handling to pool slots, pool placements, and group placements.
- Preserve the existing 7.50.6 behavior that merges live scores with verified winner/loser routing metadata.
- Apply the fix to both Boys and Girls JO viewers.

## Expected Diablo Alliance A journey

- Game 2: completed win
- Game 26: completed win
- Game 82: next game, Sunday at 11:10 AM, UC Irvine 2
- Game 98: later scheduled pool game, Sunday at 2:30 PM, UC Irvine 2

The next-game panel should show Game 82, and the team journey should contain both Games 82 and 98. The schedule search and selected-team views should now agree.

## Guardrails

This release does not modify rankings, normalized tournament data, logos, GitHub workflows, or automated ranking publication controls.
