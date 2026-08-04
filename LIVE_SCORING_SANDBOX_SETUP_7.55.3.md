# WPI 7.55.3 Live Scoring Sandbox

## Entry URL

Use the dedicated gateway:

```text
https://littlezip12.github.io/CPI/live-login.html
```

The game console redirects unauthenticated users back to this page.

## Current demo flow

1. Open the login page.
2. Select **Continue to local sandbox**.
3. Choose a scheduled game when schedule data is connected, or choose **Manual scrimmage**.
4. Confirm the preloaded team and edit the saved roster/cap numbers.
5. Enter the opponent, date/time, venue, and quarter length for a scrimmage.
6. Select all Q1 starters together and begin the game.
7. For each later quarter, select the quarter and use **Set starters and start selected quarter**. The prior lineup is preselected.
8. Record actions using player, `MM:SS` time remaining, quarter, and optional note.
9. Review the exact GroupMe-format preview before recording.
10. End the game to generate unofficial analytics and an editable recap.

The setup and roster disappear after game start to keep the mobile console compact.

## Authentication status

The sign-in and create-account interface is production-shaped and already uses Supabase `signInWithPassword()` and `signUp()` when connected. In the current repository configuration, `mode` remains `demo`, so account actions explain that the secure backend is not connected and the separate local sandbox button remains available.

Do not add passwords, a GroupMe bot ID, a service-role key, or any other secret to GitHub. The next connected release will use the team-owned Supabase project and server-side GroupMe function.
