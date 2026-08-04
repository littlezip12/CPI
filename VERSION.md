# WPI 7.55.8 — Reusable Sandbox Reset

- Adds a clearly labeled **Reset test game** control before, during, and after a sandbox game.
- Returns the scorer to a clean pregame state so the complete workflow can be tested repeatedly.
- Clears the current score, quarter, clock, plays, timeline, recap, and mock GroupMe message log.
- Preserves the selected team, game setup defaults, team roster, cap numbers, and saved default starting lineup.
- Resets the game clock to the configured quarter length.
- Keeps all live-scoring workflow, age-aware lineup, submit-play, quarter-transition, ranking, tournament, and identity protections unchanged.
