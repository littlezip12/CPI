# WPI Live 7.58.3 — Multi-Team Access & Following

7.58.3 separates **team membership/permission** from **Following**.

## Non-negotiable access rule

`live_team_members` remains the only permanent team relationship that grants operational permissions.

Following is stored separately in:

`live_team_follows(user_id, team_id, created_at)`

A follow row never creates or modifies `live_team_members` and therefore never grants:
- scoring
- roster editing
- Team Access management
- GroupMe setup/management
- admin authority
- scorer assignment/control

## Pilot eligibility

Following is intentionally narrow in 7.58.3:
- target team must be an active Lamorinda team
- caller must have a permanent `viewer` (Supporter) or `scorer` membership on another active Lamorinda team
- Owners/Admins continue using their operational club/team workspace rather than Following
- following a team where the caller is already a member is unnecessary; any stale follow row is removed

The database validates these rules. The browser does not get to broaden them.

## Read-only game visibility

`live_can_view_game(game_id)` is a new read helper that allows either:
- existing game read authority, or
- a valid Follow relationship for the game's team

Only read policies for team/game content are widened:
- `live_teams`
- `live_games`
- `live_lineups`
- `live_events`
- `live_game_recaps`

Existing scorer-session/audit and write helpers remain unchanged.

## Following RPCs

### `live_set_team_follow_v1`
Creates/removes only `live_team_follows` rows after validating Lamorinda + Supporter/Scorer eligibility.

### `live_following_overview_v1`
Returns:
- eligible Lamorinda teams
- membership/follow state
- compact read-only game feed for followed teams

It intentionally excludes GroupMe and scorer-control data.

### `live_list_team_followers_v1`
Owner/Admin-only visibility into who follows the selected team. This is presented separately from Team Access membership.

### `live_team_workspace_v4`
- permanent member → returns the full existing V3 team workspace
- valid follower → returns a Supporter-shaped read-only workspace with `relationship='following'` and `followingOnly=true`

It does not create membership or roster records.

## Browser behavior

Supporter:
- own team games plus followed-team live/upcoming/final games
- followed games open read-only

Scorer:
- own assigned/claimable scoring work remains primary
- followed games appear in a separate **Following · read only** group

Owner/Admin:
- Team Access continues to show members/roles
- a separate **Following this team** section shows followers

## Private surfaces on followed teams

For a `followingOnly` workspace, the browser deliberately suppresses:
- GroupMe destination/configuration
- GroupMe delivery summary/status/audit
- scorer-control capability
- delivery subscriptions

Database write policies remain the ultimate enforcement layer.

## Infrastructure

Required migration:

`202608120001_multi_team_access_following.sql`

No Edge Function redeploy and no new secret.
