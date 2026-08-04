# WPI 7.55.5 Live Scoring Sandbox

## Purpose

Release 7.55.5 reduces the active-game interface to a one-hand workflow suitable for a scorer using a phone during play. Rankings, official tournament results, profiles, and season snapshots remain isolated from sandbox data.

## Entry point

After GitHub Pages deploys, open:

`https://littlezip12.github.io/CPI/live-login.html`

Use **Continue to local sandbox** while the shared Supabase backend is not yet connected. The sign-in and account-creation controls are the permanent gateway for the connected version.

## Before the game

1. Create or select the scrimmage.
2. Confirm team, opponent, game date/time, venue, quarter length, and GroupMe destination.
3. Review the reusable team roster. Add or remove players and correct names or cap numbers as needed.
4. Select up to seven starters.
5. Start the game.

The setup and roster collapse after the game starts. Open **Game controls** when a correction is needed.

## One-hand scoring flow

The active game is intentionally limited to:

1. **Time remaining** — enter `6:45` or type `645`; WPI normalizes the value to `6:45`.
2. **Event** — choose from the grouped native dropdown.
3. **Player** — shown only for events that require a WPI player.
4. **Assist** — shown only for a goal; **Unassisted** is the default.
5. **Optional note** — hidden until requested.
6. **Submit update**.

Quarter and time remain after submission. Event, player, assist, and note reset, and the time field is selected for the next entry.

## Quarter workflow

Use **Start next quarter · set starters**. The previous quarter's lineup is preselected so only changes need to be made. Current-lineup edits and quarter corrections remain available under **Game controls**.

## During play

- The sticky scoreboard remains visible.
- The latest recorded event appears directly below it with an immediate **Undo** action.
- The exact parent-message format is available in the collapsed **GroupMe preview**.
- GroupMe delivery remains mock/preview-only until the secure Supabase and server-side bot connection is enabled.
- The GroupMe log and full timeline remain collapsed during play and available on demand.

## After the game

End the game from **Game controls**. WPI opens the timeline and retains:

- Team and player totals
- Score and event chronology
- Quarter lineups
- Mock GroupMe messages
- Editable parent recap
- Downloadable game log

All statistics remain unofficial and reflect only the events recorded by the scorer.

## Next connected release

The next backend phase will activate:

- Shared email/password accounts
- Team Owner, Admin, Scorer, and Viewer roles
- Shared rosters and games across devices
- Realtime event storage
- Server-side GroupMe delivery, retry status, and audit logs

Do not put Supabase service credentials or GroupMe bot secrets in GitHub, client JavaScript, or the browser configuration.
