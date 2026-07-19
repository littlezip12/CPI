# CPI 7.50.8

JO all-division route continuity and verified schedule coverage.

- Resolves explicit live route assignments such as `pt_P1-LAMORINDA A`, `W26-LAMORINDA A`, `1st pt_P-LAMORINDA A`, and `1stB-LAMORINDA A` directly to the clean team identity.
- Uses those explicit assignments even when the completed source game has a blank winner or loser destination.
- Propagates one confirmed route-slot assignment to every future game using the same slot.
- Applies the route resolver to every Girls, Coed, and Boys JO age and division.
- Supports fourth/fifth-place routes, multi-letter pools, annotated pool slots, group seeds without parentheses, and `W#U1/U4`-style pool-matchup paths used elsewhere in the official brackets.
- Loads all 11 Girls/Coed verified repository schedules before waiting on Google, while retaining the existing 12-division Boys embedded fallback coverage.
- Preserves 12U Girls lettered games such as `135A`, `147A`, and `152A`.
- Keeps live scores, browser cache, verified repository snapshots, and all ranking-publication safeguards intact.
- Leaves rankings, normalized tournament datasets, logos, workflows, and generated operational outputs unchanged.
