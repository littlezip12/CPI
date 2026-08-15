# WPI 7.60.2 — Team Directory & Identity Management Handoff

## Baseline

Built cumulatively from the authoritative pushed **WPI 7.60.1 — Self-Service Club Onboarding** ZIP `CPI-main - 2026-08-14T231959.284.zip`.

## Purpose

7.60.2 connects private WPI Live team workspaces to the public WPI identity registry at multi-club scale while preserving the core rule: **identity is explicit, auditable, and never silently guessed or merged**.

## Delivered

- New canonical Live team-identity directory generated from the existing WPI identity registry.
- 182 canonical clubs, 724 public season-specific team identities, and 724 stable team families represented.
- Stable family identity model: club + age + gender/group + squad/level.
- New private `live-team-identity.html` Owner/Admin workspace.
- Explicit team-family linking with same-club, age, gender/group, and squad validation.
- No automatic assignment of a current-season exact public team ID from prior-season public data.
- Club-scoped identity aliases with explicit add/remove actions and audit history.
- Unresolved/manual opponent review integrated into the same identity workflow.
- Existing `live_resolve_manual_opponent_v1` signature preserved for dashboard compatibility; explicit resolution now also persists a reusable alias.
- Future Add Game opponent resolution checks reviewed saved aliases before broad static WPI heuristics.
- Raw historical opponent labels remain unchanged after mapping.
- 7.60.1 self-service onboarding and 7.60.0 branding platform preserved.

## Protected foundation

The focused 7.60.2 gate hash-checks and preserves the protected WPI Live foundation, including:

- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `js/live-game-v7-58-6.js`
- `js/live-game-storage-v7-58-6.js`
- `css/live-game-v7-58-4.css`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- `config/live-club-theme-overrides.json`
- `js/live-club-theme-v7-60-0.js`
- `js/live-club-theme-registry-v7-60-0.js`
- `js/live-club-onboarding-v7-60-1.js`
- `js/live-login-v7-60-1.js`

No scorer authority, handoff/recovery, roster versioning, GroupMe exactly-once delivery, recap/archive, or scoring-layout behavior is intentionally changed.

## Migration

`supabase/migrations/202608140004_team_directory_identity_management.sql`

No Edge Function redeploy and no new secret.

## Validation state

- 7.60.2 focused gate passes.
- Complete repository gate passes through `CPI release check passed.` when run in contiguous sections (monolithic execution exceeds the tool time window).
- Legacy release-version allowlists were extended only where required to accept 7.60.2.
- Generated tournament/QA artifacts were restored to the authoritative pushed 7.60.1 baseline before packaging.
- Clean-install validation passed against the exact pushed 7.60.1 ZIP: baseline extract → 7.60.2 patch → focused gate.
- Current-season official tournament schedule remains intentionally 0 events / 0 games pending a real external source.

## Roadmap after 7.60.2

### 7.60.3 — Public / Supporter Experience at Scale

Expand Following beyond the Lamorinda pilot into cross-club team discovery, followed-team organization, and a personalized game feed while keeping Following completely separate from operational membership and scorer authority.

### Later 7.60.x

- Activate reviewed branded scoring themes for additional real clubs.
- Onboard and validate a second real club end-to-end.
- Use the new identity system to reconcile new/unlisted clubs and teams without duplicate canonical identities.
- Add scalable notification foundations after cross-club Following is stable.
- Validate the first real 2026–2027 official tournament feed when an external source becomes available.
