# WPI 7.58.3 — Multi-Team Access & Following Handoff

## Baseline

Built cumulatively from the pushed and live-site-validated **WPI 7.58.2 — Multi-Team Profiles & Rosters** repository ZIP.

## Scope delivered

- Team membership/permissions remain stable and team-specific in `live_team_members`.
- Following is a separate `live_team_follows` relationship.
- Pilot follow discovery is Lamorinda-only and server-enforced.
- Permanent Supporters (`viewer`) and Scorers can follow additional Lamorinda teams without being made members of those teams.
- Followed-team game visibility is read-only.
- Supporter dashboard combines own-team and followed-team live/upcoming/final visibility.
- Scorer dashboard keeps scoring work primary and shows followed games in a separate read-only group.
- Owner/Admin Team Access shows followers separately from members.
- Direct followed-game routes resolve through a read-only team workspace and never become remembered management-team context.
- GroupMe configuration/delivery audit and scorer-control surfaces are suppressed for followed-team workspaces.
- 7.58.0 Club → Teams and 7.58.2 profile/roster/default-lineup state remain isolated.

## Database

New migration:

`supabase/migrations/202608120001_multi_team_access_following.sql`

Adds:
- `live_team_follows`
- `live_is_team_follower`
- `live_can_view_game`
- `live_set_team_follow_v1`
- `live_following_overview_v1`
- `live_list_team_followers_v1`
- `live_team_workspace_v4`

Only read policies needed for follower game visibility are widened. Existing scoring, roster, access, GroupMe, scorer-session, and delivery write permissions remain membership/scorer-control based.

## Protected foundations

Validated unchanged:
- `js/live-backend-v7-56-8.js`
- `js/live-game-v7-57-22.js`
- `js/live-team-context-v7-58-0.js`
- `js/live-team-profiles-rosters-v7-58-2.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- `202608110003_club_workspace_foundation.sql`
- `202608110004_multi_team_profiles_rosters.sql`

## Validation

Focused 7.58.3 gate passes:
- protected 7.57.22 pilot regression
- 7.58.0 Club Workspace regression
- 7.58.2 Multi-Team Profiles & Rosters regression
- 7.58.3 membership/follow static integrity
- existing team-context behavior
- existing club-context behavior
- existing profile/roster/default-lineup behavior
- new Following JS behavior
- JavaScript syntax checks

The full repository gate was completed in contiguous segments because the execution environment limits individual long-running commands. Every segment passed through `CPI release check passed.` Gate-generated tournament/QA files were restored to the pushed 7.58.2 baseline afterward, and the focused 7.58.3 gate was rerun successfully.

## Infrastructure

- One Supabase migration required.
- No Edge Function redeploy.
- No new secret.

## Next roadmap release

**7.58.4 — Event Archive & Game Recaps**

Primary scope:
- one Scrimmage Weekend → multiple games
- one Tournament → multiple games
- expandable event/archive records and event W-L-T
- permanent dedicated Game Recap pages
- preserve/reconcile existing weekend records without silent bad merges
