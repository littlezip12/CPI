# WPI 7.64.7 — Champions Cup Qualifier Registry

WPI 7.64.7 builds the 2026 USA Water Polo Champions Cup qualification layer on the pushed WPI 7.64.6 baseline.

The release adds a public national qualifier tracker covering all 12 USA Water Polo zones while preserving WPI's verified-data rule: a zone is not treated as having a qualifier until USA Water Polo or the zone confirms it, and WPI does not invent schedules, opponents, venues, brackets, standings, allocations, or results.

The Pacific Zone is activated from its official calendar date of September 27, 2026. Lamorinda A 14U Boys is connected in the tracker to its existing WPI Live tournament series. Until official games are published, its qualifier record correctly remains 0–0–0 with 0 GF and 0 GA. When qualifier games are later finalized and explicitly public on WPI Live, the tracker can read the existing sanitized public tournament RPC and update Lamorinda’s W-L-T/GF/GA automatically without exposing private games or player data.

The 2026–2027 tournament season now begins with the verified Pacific Zone qualifier on September 27; the Evan Cousineau Memorial Cup remains the next announced club tournament on October 3–4.

No Supabase migration is required. No protected scorer/backend files are changed.

## Preserved 7.64.6 opponent-search foundation

Opponent suggestions continue to show team context directly in the primary label. Club teams render as **age + team name**, including **14U Stanford A**, **14U 680 A**, and **14U Davis B**. The club and gender remain visible as secondary context.

Search results remain ranked by the team creating the game before text-match strength, with age/division first and gender as secondary context. JV and Varsity context remains supported for future high-school workspace reactivation. High-school teams remain excluded from normal club opponent search during the current club-only operating mode.

Selecting a club suggestion still writes the established canonical team name into the opponent field so the existing identity-resolution and reconciliation path remains unchanged. Manual opponent entry remains available as the fallback.
