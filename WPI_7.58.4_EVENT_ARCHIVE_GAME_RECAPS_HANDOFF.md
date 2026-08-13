# WPI 7.58.4 — Event Archive & Game Recaps Handoff

## Baseline

Built cumulatively from the pushed and live-site-validated **WPI 7.58.3 — Multi-Team Access & Following** repository ZIP.

## Scope delivered

- One Tournament / Scrimmage Weekend is the durable parent for multiple canonical game records.
- Friendly Game-Day creation can select an existing current-season Scrimmage Weekend or create one new weekend once.
- Archive event cards retain W-L-T and expand to individual games.
- Every completed game can open a permanent dedicated `live-game-recap.html` page.
- Recap pages use structured events, lineups, player stats, period score checkpoints, and approved/saved recap copy.
- Raw scorer resume snapshot state is not exposed through the recap RPC.
- Owners/Admins can explicitly merge duplicate event containers after review.
- Event merging moves existing game relationships; it never copies/replaces canonical games.
- Different official tournament identities cannot be silently collapsed.
- Merge actions are audited.
- Followers retain recap-safe read access without receiving membership or operational permissions.
- GroupMe delivery audit remains Owner/Admin-only.

## Database

New migration:

`supabase/migrations/202608130001_event_archive_game_recaps.sql`

Adds:
- `live_game_series_merge_audit`
- `live_merge_game_series_v1`
- `live_game_recap_detail_v1`
- `live_game_series_archive_v3`

The migration deliberately performs **no automatic historical event merge**.

## Protected foundations

Validated unchanged from the authoritative 7.58.3 baseline:
- `js/live-backend-v7-56-8.js`
- `js/live-game-v7-57-22.js`
- `js/live-team-context-v7-58-0.js`
- `js/live-team-profiles-rosters-v7-58-2.js`
- `js/live-team-following-v7-58-3.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- `202608110003_club_workspace_foundation.sql`
- `202608110004_multi_team_profiles_rosters.sql`
- `202608120001_multi_team_access_following.sql`

## Validation

Focused 7.58.4 gate passes:
- protected 7.57.22 pilot regression
- 7.58.0 Club Workspace regression
- 7.58.2 Multi-Team Profiles & Rosters regression
- 7.58.3 Following behavior regression
- 7.58.4 event/archive/recap static integrity
- dashboard and recap DOM integrity
- JavaScript syntax checks

The full repository gate was completed in contiguous segments because the execution environment limits individual long-running commands. Every segment passed through `CPI release check passed.` Gate-generated tournament/QA files were restored to the pushed 7.58.3 baseline afterward, and the focused 7.58.4 gate was rerun successfully.

## Infrastructure

- One Supabase migration required.
- No Edge Function redeploy.
- No new secret.

## Next roadmap release

**7.58.5 — Tournament Feed → Game-Day Validation**

Primary scope:
- validate real official 2026–2027 tournament schedule ingestion
- automatically populate Game-Day Hub
- reconcile a later official schedule with a manually-created canonical game
- prevent duplicate official/manual game records
- preserve completed Live scoring, events, scorer history, GroupMe delivery and recap data
- route ambiguous identity matches to Owner/Admin review rather than silent merge

## Game-flow correction before authority

Before 7.58.4 was declared authoritative, live testing found two UX issues and the same release candidate was corrected:
- Dashboard Start game now carries a one-time `launch=1` intent to `live-game.html`, which automatically opens Q1 starter confirmation once the validated readiness/scorer checks pass.
- The starter confirmation action reads **Confirm starters & begin** rather than presenting a second standalone Start game step.
- Dashboard navigation is available from pregame/live scoring and a dedicated **Back to dashboard** action is shown in the final summary.
- No Supabase/Edge Function change was required for this correction.
