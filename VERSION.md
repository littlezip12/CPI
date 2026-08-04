# WPI 7.55.6 — Age-Aware Lineups and Quarter Flow

- Enforces the exact starting lineup for each age group: **10U/12U = one goalie plus five field players (six total)**; **14U/16U/18U = one goalie plus six field players (seven total)**.
- Adds an age-group selector for manual scrimmages; scheduled tournament games can supply the same value when connected.
- Separates the starting goalie from field-player selection and disables lineup submission until the exact valid lineup is selected.
- Saves the Q1 starting lineup as the team default and preselects it for the next sandbox game; each new quarter still begins with the previous quarter's lineup.
- Replaces the start-next-quarter control with **End quarter**. Ending a quarter records the quarter-end event, moves the game into a between-quarters state, resets the next-quarter clock after lineup selection, and opens the next starter selection.
- Keeps the active scorer in a direct-submit workflow: pressing Submit records the event immediately, updates the score/timeline/message preview, and returns focus to the clock. No second confirmation is used.
- Mistakes remain reversible through the immediate Undo control and score correction tools.
- Leaves GroupMe delivery in mock mode until Supabase authentication, shared storage, and the server-side bot secret are connected.
- Keeps all 724 final rankings, 182 clubs, multi-season snapshots, tournament scores, placements, identities, logos, websites, and journeys unchanged.
