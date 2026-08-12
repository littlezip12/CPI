# WPI Live 7.58.2 — Multi-Team Profiles & Rosters

7.58.2 builds on the validated Club → Teams hierarchy by making profile, roster, and default-lineup state fully team- and season-aware.

## Core identity rule

Switching teams never copies or migrates records. The selector changes context only.

- stable `live_teams.id` remains the team identity
- profile metadata updates only the selected team
- rosters remain attached to their team
- roster versions remain attached to their competitive season
- historical games keep their original `roster_id`
- default starters belong to the selected team and its current roster

## Team Profile

Owner/Admin can edit:
- team name
- workspace/display label
- age group
- gender
- squad/division

Competitive season remains explicit in the workspace and is not casually rewritten through the profile editor.

Profile updates use `live_update_team_profile_v1` rather than direct browser table mutation.

## Season-aware roster workspace

`live_team_workspace_v3` resolves the selected team's active roster only when:

- `roster.team_id = selected team_id`
- `roster.competitive_season = selected_team.competitive_season`
- `roster.active = true`

If a current-season roster does not yet exist, the workspace creates one for that team/season without touching old-season rosters.

## Preserved roster versions

`live_rosters` adds:
- `version_number`
- `source_roster_id`
- `activated_at`
- `retired_at`

Every confirmed dashboard roster save uses `live_save_roster_version_v1`:

1. verifies Owner/Admin authority
2. checks that the browser's expected roster is still current
3. creates a new roster version
4. creates fresh player rows using stable `client_player_id`
5. retires the previous roster without deleting it
6. activates the new version
7. preserves historical game references to the old roster

A partial unique index enforces one active roster per team/competitive season.

## Default starters

`live_set_default_lineup_v1` is team- and roster-scoped.

- 10U/12U: 6 starters total = 1 goalie + 5 field players
- 14U/16U/18U: 7 starters total = 1 goalie + 6 field players
- every selected player must belong to the current active roster
- goalie must be one of the selected starters

When a new roster version is saved, WPI remaps the existing default lineup through stable `client_player_id` only when every prior starter and goalie still maps cleanly. Otherwise, it clears the default lineup rather than silently guessing.

## Historical integrity

This migration does not delete or truncate rosters, players, games, or game history. Old roster versions remain available so completed games keep the roster state they were played with.

## Infrastructure

Required migration:

`202608110004_multi_team_profiles_rosters.sql`

No Edge Function redeploy and no new secret.
