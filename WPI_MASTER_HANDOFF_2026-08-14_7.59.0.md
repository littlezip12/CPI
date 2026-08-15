# WPI 7.59.0 — Lamorinda Club Pilot Ready Handoff

**Date:** 2026-08-14
**Authoritative baseline used:** pushed WPI 7.58.10 ZIP supplied by the user (`CPI-main - 2026-08-14T221302.124.zip`).

## Milestone
7.59.0 closes the 7.58.x Club Workspace / multi-team pilot build line and marks the **manual-game Lamorinda club pilot ready**. It is a stabilization release, not a feature expansion.

## What is frozen/preserved
- Club → Teams with stable team IDs and team-isolated roster/games/access/GroupMe/stats/history.
- Separate read-only Following.
- One active scorer/game, scorer assignment, six-digit/QR handoff, Supporter handoff, Guest Scorer, Owner/Admin recovery and previous-scorer read-only behavior.
- Roster versioning/default starters, periods/OT/shootout, structured events/corrections and analytics.
- GroupMe exactly-once/retry/audit and Final Whistle sequencing.
- Final → Reopen → Final recovery.
- Team-aware archive/recaps and manual-vs-official reconciliation protections.
- Manual opponent names preserved raw; explicit Owner mapping only; no identity guessing.
- Lamorinda blue/gold game theme.
- 7.58.10 launch-readiness, team/season and duplicate-game safety rails.

## 7.59.0 changes
- Release/milestone metadata and machine-readable `data/live/lamorinda-pilot-status.json`.
- Owner All Teams pilot panel now displays the 7.59.0 manual-game pilot-ready milestone.
- Production runbook plus formal Owner/Scorer/Supporter workflows.
- New milestone regression gate that hashes protected scoring/backend/Edge Function files and verifies no 7.59.0 Supabase migration was introduced.
- New `release-check-clean` wrapper runs the full repository gate but restores gate-generated tournament/QA files afterward, preventing the recurring validation-only Git conflict noise without discarding any pre-check state.
- Current release allowlists and tournament schedule index release marker advanced to 7.59.0.

## Deferred / external
- Offline → reconnect remains deferred resilience work, not a pilot blocker.
- First real 2026–2027 official tournament schedule remains an external dependency; validate it when published and do not fabricate schedule data.

## Database/functions
No Supabase migration. No Edge Function redeploy. No new secrets.

## Roadmap
### 7.60.0 — Club Branding Platform
Generalize Lamorinda game styling into configurable per-club colors/logo/theme tokens while preserving the scoring layout.

### 7.60.1 — Self-Service Club Onboarding
Create club → add teams → assign Owner → colors/logo → roster → access → GroupMe → launch readiness without engineering intervention.

### 7.60.2 — WPI Team Directory & Identity Management
Platform-level aliases, unlisted-opponent review, canonical club/team resolution and identity audit.

### 7.60.3+ — Public / Supporter Experience at Scale
Cross-club Following, personalized game feed, notifications, tournament following and richer public Live/recap surfaces.

## Operational workflow
- Deliver patch ZIP + full repository ZIP.
- User installs from macOS Terminal, runs focused gate then full `./release-check`.
- SQL migrations (when present) are opened in TextEdit, copied into Supabase SQL Editor and run manually. 7.59.0 has none.
- User commits/pushes in GitHub Desktop. Never Force Push without inspecting exact conflicts first.
- Full release gate can regenerate `data/tournaments/...` and QA artifacts; restore those to the authoritative pushed baseline when they are not intentional release changes.
