# WPI 7.58.2 — Multi-Team Profiles & Rosters Handoff

## Baseline

Built cumulatively from the pushed and live-site-validated **WPI 7.58.1 — Owner Dashboard Refactor** repository ZIP.

## Scope delivered

- Team Profile metadata is fully scoped to the selected stable `team_id`.
- Team profile includes name, workspace label, age group, gender, squad/division, and explicit competitive season.
- Workspace loading is season-aware through `live_team_workspace_v3`.
- The selected team's latest active roster for its current season auto-loads.
- Every confirmed roster save creates a new preserved version instead of mutating the existing roster in place.
- Historical games keep their original `roster_id` and therefore their original roster association.
- Roster version history is visible in Game Day Setup.
- Default starters can be set per team/current roster with age-aware starter validation.
- Default starters remap safely across roster versions via stable `client_player_id`; incomplete mappings are cleared instead of guessed.
- Club → Teams context and Owner Dashboard hierarchy remain intact.
- No Following model is introduced early; that remains 7.58.3 scope.

## Database

New migration:

`supabase/migrations/202608110004_multi_team_profiles_rosters.sql`

Adds roster version metadata, one-active-roster-per-team-season enforcement, and RPCs:

- `live_team_workspace_v3`
- `live_update_team_profile_v1`
- `live_list_team_roster_versions_v1`
- `live_save_roster_version_v1`
- `live_set_default_lineup_v1`

The migration is additive/preservational: no roster/game/history deletes or truncates.

## Protected foundations

The following validated foundations remain unchanged:

- `js/live-backend-v7-56-8.js`
- `js/live-game-v7-57-22.js`
- `js/live-team-context-v7-58-0.js`
- 7.58.1 dashboard assets remain preserved as prior-release artifacts
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- `202608110003_club_workspace_foundation.sql`

## Validation

Focused 7.58.2 gate passes:
- protected 7.57.22 pilot regression
- 7.58.0 Club Workspace foundation regression
- 7.58.2 Multi-Team Profiles & Rosters static integrity
- 7.57.3 team-context behavior
- 7.58.0 club-context behavior
- 7.58.2 profile/roster/default-lineup behavior
- JavaScript syntax checks

The full repository gate was completed in contiguous segments because the execution environment limits individual long-running commands. Every segment passed through `CPI release check passed.` Gate-generated tournament/QA files were restored to the pushed 7.58.1 baseline afterward, and the focused 7.58.2 gate was rerun successfully.

## Infrastructure

- One Supabase migration required.
- No Edge Function redeploy.
- No new secret.

## Next roadmap release

**7.58.3 — Multi-Team Access & Following**

Primary scope:
- team-specific membership/permissions remain isolated
- Following becomes a separate relationship from membership
- initial following discovery is Lamorinda-only
- Supporter/Scorer can follow additional Lamorinda teams without receiving operational permissions
