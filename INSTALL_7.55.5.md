# Install WPI 7.55.5 — One-Hand Live Scoring Workflow

Apply this cumulative patch to the pushed WPI 7.55.4 repository, run `./release-check`, and commit only when the final line is exactly `CPI release check passed.`

## Live-scoring behavior

The private sandbox remains at `live-login.html` and `live-sandbox.html`. During an active game, the page reduces itself to the sticky scoreboard and the guided scorer. Setup, roster, corrections, message history, and the full timeline remain available behind compact controls.

GroupMe remains preview-only until the secure Supabase and server-side bot connection is activated.
