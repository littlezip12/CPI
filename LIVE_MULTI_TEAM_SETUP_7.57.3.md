# WPI Live 7.57.3 — Multi-Team & Team Switching Setup

Built on the hosted-validated WPI 7.57.2 Team Access & Admin Invitations baseline.

## What changes
- A signed-in account can see every WPI Live team it is authorized to access.
- The dashboard header contains a Team workspace switcher.
- Team selection persists on the device and is also carried explicitly into dashboard-created/opened games.
- Accepting a team invitation selects the newly joined team automatically.
- An existing Team Owner can create an additional team workspace with its own roster, access, GroupMe destination, games and history.
- Switching teams reloads the workspace rather than reusing in-memory team state.

## Supabase
Run this migration in the SQL Editor after the 7.57.2 migration:

`supabase/migrations/202608080003_multi_team_switching.sql`

Expected result: **Success. No rows returned.**

There are **no new secrets** and **No Edge Function redeploy** is required for 7.57.3.
Do not change `groupme-post`, `roster-extract`, `OPENAI_API_KEY`, or GroupMe secrets.

## Server-side boundaries
- `live_list_user_teams()` returns only memberships for `auth.uid()`.
- `live_team_workspace(team_id)` rejects a team that the signed-in account does not belong to.
- `live_create_additional_team(...)` requires the caller to already be a Team Owner.
- Each team retains independent roster, access, destination, games and history.

## Hosted acceptance
1. Sign in and confirm the current team appears in the Team workspace selector.
2. If the account belongs to multiple teams, switch teams and confirm the header, roster, Team Access, GroupMe and history all change to that team's data.
3. Switch back and confirm the original team's data returns unchanged.
4. Open an existing game from each team and confirm the correct team/game loads.
5. Start a new game from each team and confirm the correct team name and roster preload.
6. Accept a new team invitation and confirm WPI lands in the newly accepted team.
7. Team Owner only: create another real team when needed and confirm it becomes a separate selectable workspace.
8. Run a short scoring regression: normal play, GroupMe delivery, scorer transfer, Final Whistle and Game Summary.

Do not create a disposable production team solely for testing unless you intend to keep that team workspace; team deletion is intentionally not part of 7.57.3.
