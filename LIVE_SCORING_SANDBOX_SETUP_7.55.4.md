# WPI 7.55.4 Live Scoring Sandbox

## Entry point

Open the private gateway:

`https://littlezip12.github.io/CPI/live-login.html`

The pilot remains hidden from public WPI navigation and carries `noindex` protection.

## Current access mode

The repository is still configured for local demo mode. Select **Continue to local sandbox**. The same gateway will support team email/password sign-in and account creation after Supabase is connected.

## Compact scoring workflow

1. Create or confirm the manual scrimmage.
2. Update the reusable team roster and cap numbers.
3. Select up to seven starters and start the game.
4. During play, enter:
   - Quarter
   - One time-remaining field (`6:45` or fast entry `645`)
   - Event dropdown
   - Player dropdown
   - Assist dropdown only for goals; choose **Unassisted** when applicable
   - Optional note
5. Review the exact GroupMe-format preview.
6. Select **Submit update**.

The quarter and time remain available after submission. Event, player, assist, and note reset for the next entry.

## Quarter lineups

Select the desired quarter and use **Set Q# starters**. The prior quarter lineup is preselected so only substitutions need to change.

## Roster during play

Game setup and roster are hidden automatically after the first quarter begins. Use **Edit setup or roster** only when a correction is necessary, then return to the live console.

## GroupMe status

Delivery remains in mock mode. The page displays the exact message before submission and keeps a message log afterward. The secure GroupMe bot connection will be activated only after the team-owned Supabase project is configured. Never place GroupMe bot IDs, Supabase service-role keys, or passwords in GitHub or `config/live-sandbox.js`.

## Isolation

Sandbox games never alter rankings, tournament archives, official results, club/team profiles, or the immutable 2025–2026 season snapshot.
