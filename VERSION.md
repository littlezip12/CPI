# WPI 7.55.7 — Team Roster and Submit-Play Flow

- Fixes **Add player** so a new editable roster row is inserted, scrolled into view, and focused immediately.
- Reframes the roster as the active team’s information. The pilot defaults to **Lamorinda A 14U Boys**, while the heading follows whichever team is selected.
- Uses one **Submit play** button. A submitted play records immediately with no second confirmation.
- Resets play, player, assist, and optional note after submission while preserving quarter and time remaining.
- Keeps Goal as the only play with an optional assist; Unassisted remains the default.
- Keeps one **End quarter** button. It records the current score at 0:00, advances the quarter state, and immediately requires the next-quarter starting lineup before scoring resumes.
- Preserves exact age-aware lineup rules and the reusable previous-game Q1 lineup.
- Leaves GroupMe delivery in mock mode until the secure Supabase backend and bot connection are activated.
- Keeps all 724 final rankings, 182 clubs, season snapshots, tournament scores, placements, identities, logos, websites, and journeys unchanged.
