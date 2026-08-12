# WPI 7.58.1 — Owner Dashboard Refactor Handoff

## Baseline

Built cumulatively from the pushed and hosted-validated **WPI 7.58.0 — Club Workspace Foundation** repository ZIP.

## Scope delivered

- Team Profile moved to the top of the Owner/Admin team workspace.
- Guided Team Launch retired from the persistent dashboard.
- Compact Team Readiness retains the same underlying readiness checks.
- Game-Day Hub is the single game queue; “Games on Deck” is retired as a separate product concept.
- Roster, Team Access, and GroupMe are grouped under collapsed **Game Day Setup**.
- Readiness links and mobile/desktop workspace navigation automatically reveal collapsed setup when appropriate.
- Existing All Lamorinda Teams club workspace remains intact.
- Supporter/Scorer role shaping remains intact.

## Backend / data

- No Supabase migration.
- No Edge Function redeploy.
- No new secrets.
- 7.58.0 Club → Teams migration unchanged.
- Stable `team_id` isolation unchanged.
- Protected 7.57.22 scoring/reopen/re-final/offline/Supporter recovery behavior unchanged.

## Validation

Focused 7.58.1 gate passes:
- protected 7.57.22 pilot regression
- 7.58.0 Club Workspace foundation regression
- 7.58.1 dashboard hierarchy/static integrity
- 7.57.3 team context behavior
- 7.58.0 club context behavior
- JavaScript syntax checks

The full repository gate was also completed in contiguous segments because the execution environment limits individual long-running commands; all segments passed through `CPI release check passed.`

## Next roadmap release

**7.58.2 — Multi-Team Profiles & Rosters**

Primary scope:
- every team gets its own complete metadata
- latest roster auto-loads for selected team
- season-aware/versioned rosters
- default lineup per team
- team switching updates profile/roster/lineup/history without cross-team leakage
