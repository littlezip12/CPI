# WPI Master Handoff — 7.58.10 Pilot Launch Prep & Admin Safety

**Date:** 2026-08-14  
**Purpose:** Continuation record for the next ChatGPT thread.  
**Attach with:** the latest pushed GitHub repository ZIP after 7.58.10 is installed, validated, committed and pushed.

## Current release state
- Baseline used to build this release: pushed WPI 7.58.9 ZIP `CPI-main - 2026-08-14T214218.124.zip`.
- Release being delivered: **WPI 7.58.10 — Pilot Launch Prep & Admin Safety**.
- 7.58.10 is **not authoritative until the user installs, applies the Supabase migration, runs the release gates, pushes, and live-validates**.
- No Edge Function redeploy and no new secrets.

## Product architecture that must not regress
- Public WPI + WPI Live remain one identity ecosystem.
- Club → stable Teams; switching never copies or migrates team data.
- Team profile, roster versions/default starters, access, GroupMe, games, archive and stats remain team-scoped.
- Following is separate read-only visibility; it never grants permanent scoring/admin rights. Game-scoped scorer handoff remains separate.
- Manual opponent labels are preserved. Ambiguous identities are never guessed.
- A later official tournament matchup must reconcile to the existing manual canonical game when unambiguous, never create a completed-manual + blank-official duplicate.
- Public rankings remain editorial/manual; Live results do not auto-rewrite rankings.

## Completed 7.58.x line
### 7.58.0 — Club Workspace Foundation
Club hierarchy, stable IDs, Lamorinda workspace, All Teams. Migration `202608110003_club_workspace_foundation.sql`.

### 7.58.1 — Owner Dashboard Refactor
Cleaner Team Profile/Readiness/Game-Day Hub; setup grouped and collapsible. No migration.

### 7.58.2 — Multi-Team Profiles & Rosters
Team-scoped profiles, season roster auto-load, roster versioning, historical roster preservation, default starters. Migration `202608110004_multi_team_profiles_rosters.sql`.

### 7.58.3 — Multi-Team Access & Following
Separate team membership vs read-only Following. Migration `202608120001_multi_team_access_following.sql`.

### 7.58.4 — Event Archive & Game Recaps
Tournament/Scrimmage Weekend parent series, permanent recaps, structured stats/timeline, explicit merge, Start-game/navigation flow fixes. Migration `202608130001_event_archive_game_recaps.sql`; recap correction later within 7.58.6.

### 7.58.5 — Tournament Feed → Game-Day Validation
Squad-safe official matching, manual-game reconciliation protections, no fabricated current-season schedule. No migration.

### 7.58.6 — Club-Level Pilot Hardening + pilot corrections
Game-scoped local recovery storage for concurrent games; recap RPC fix; scalable Following search/filter; unified Supporter team viewing context across feed/archive; explicit free-text unlisted opponents; follower archive read access. Migrations `202608130002_recap_following_pilot_ux_correction.sql` and `202608130003_supporter_view_context_manual_opponent.sql`.

Real-world proof completed during 7.58.6: a real Lamorinda 12U Boys team was added alongside 14U Boys; cross-team roster/profile/access/game/archive isolation passed.

### 7.58.7 — Club Pilot Validation & Observability
Owner All Teams evidence panel for multi-team, concurrent games, handoffs, GroupMe routes, Following isolation, multi-game events, official feed, unlisted opponents. Migration `202608130004_club_pilot_validation_observability.sql`. Evidence observed in live use included 2 active teams, concurrent games, 4 scorer handoffs, 2/2 GroupMe routes, Following separation, multi-game event. Offline test was later intentionally deferred.

### 7.58.8 — Club-Branded Game Experience
Lamorinda navy/blue/gold themed scoring-page layer while preserving scoring layout/engine. Theme framework is intentionally extensible to other clubs later. No migration.

### 7.58.9 — Club Operations & Scale Polish
Search/filter All Teams, People & Access overview, unlisted-opponent review queue, easier Add Team naming, offline proof changed to Deferred/resilience, official feed called External dependency. Migration `202608140001_club_operations_scale_polish.sql`.

### 7.58.10 — Pilot Launch Prep & Admin Safety
- Five-part Team Launch checklist adds **Default starters** to Profile/Roster/Scorer/GroupMe.
- All Teams reads club-wide launch readiness and shows explicit readiness chips.
- People & Access keeps actual role changes inside a team but provides direct Manage Access shortcuts.
- Unlisted Opponent queue gets explicit **Map to WPI…** action with searchable WPI team/club dialog. The mapping RPC only links canonical IDs; raw opponent text is preserved and the action is audited in game state.
- Game-Day Hub gets visible current Team + Season lock context.
- Scheduled dates outside the current competitive-season years are rejected before save.
- Duplicate-game preflight now recognizes canonical opponent identity/name, event identity, and a broader time window; user must explicitly override a likely duplicate.
- Migration: `202608140002_pilot_launch_admin_safety.sql`.

## Current Lamorinda pilot state
- Club: Lamorinda Water Polo.
- Real operating teams now include 14U Boys A and 12U Boys.
- Cross-team isolation has passed.
- Supporter multi-team following/feed/archive corrections are validated.
- Game recaps load structured stats after the 7.58.6 correction.
- Lamorinda scoring page uses a club-specific visual theme.
- GroupMe routes have been observed/tested for both pilot teams in the 7.58.7 evidence panel.
- Offline → reconnect test is intentionally **Deferred / resilience**, not a pilot blocker. Most target venues have adequate Wi-Fi/service; underlying recovery protections remain.
- First real 2026–2027 official tournament schedule ingestion remains **External dependency**. Do not fabricate schedule data just to turn a gate green.

## Protected scoring/reliability foundation
Preserve Supabase Auth/RLS, persistent sessions, one active scorer/game, scorer assignment, six-digit/QR handoff, Guest Scorer, previous scorer read-only, Owner/Admin takeover, game-scoped Supporter handoff, roster persistence, lineups, periods/OT/shootout, structured events/corrections, GroupMe exactly-once/retry/audit, Final Whistle ordering/full recap, Final→Reopen→Final recovery, permanent analytics, and game-scoped local recovery storage.

Avoid casual rewrites of `js/live-backend-v7-56-8.js`, `js/live-sandbox-v7-56-15.js`, protected game/scorer files, `supabase/functions/groupme-post/index.ts`, or `supabase/functions/roster-extract/index.ts`.

## Roadmap after 7.58.10
### 7.59.0 — Lamorinda Club Pilot Ready
This should be a stabilization/milestone release, **not a feature dump**. Once 7.58.10 validates live:
- freeze validated Club→Teams architecture;
- run complete release/regression gate;
- formalize pilot production/setup docs and Owner/Scorer/Supporter workflows;
- verify 12U + 14U coexistence, access/following, GroupMe isolation, archives/recaps, scorer recovery;
- record offline test as intentionally deferred resilience;
- record official tournament feed as an external validation dependency until a real 2026–2027 source exists;
- call the **manual-game Lamorinda pilot ready** if no critical issue remains.

When the first real current-season official schedule is published, validate feed → Game-Day Hub → manual fallback reconciliation separately.

### 7.60.0 — Club Branding Platform
Generalize the Lamorinda game theme into configurable club colors/logo/visual tokens so other clubs automatically receive their own branded scoring experience.

### 7.60.1 — Self-Service Club Onboarding
Create club → add teams → Owner → colors/logo → roster → access → GroupMe → launch readiness, without engineering intervention.

### 7.60.2 — WPI Team Directory & Identity Management
Turn aliases, unlisted opponent review, canonical club/team resolution, and identity audit into a platform-level workflow.

### 7.60.3+ — Public/Supporter Experience at Scale
Cross-club Following, personalized game feed, notifications, tournament following, richer public Live/recap surfaces.

## Operational workflow/preferences
- User prefers downloadable patch ZIP + full repository ZIP.
- Give exact macOS Terminal commands.
- For SQL: Terminal opens migration in TextEdit → Copy All → Supabase SQL Editor → New query → Paste → Run. Clipboard-only SQL workflows have been unreliable.
- Explicitly label Terminal vs Supabase vs live-site steps.
- If focused and full gate pass, user can commit/push in GitHub Desktop.
- If GitHub shows conflicts/Force Push, stop and inspect. Repeated conflicts have been gate-generated `data/tournaments/...` files; do not assume until exact conflicted files are checked.
- Full `./release-check` can regenerate tournament/QA artifacts; restore gate-generated artifacts to pushed baseline before packaging when they are not intentional release changes.

## Next-chat starter prompt
“Continue WPI from the attached master handoff and latest pushed GitHub ZIP. Treat the pushed ZIP as authoritative. 7.58.10 Pilot Launch Prep & Admin Safety should be validated first if not already confirmed. Then prepare 7.59.0 as a stabilization/milestone release rather than adding a new feature family. Preserve the protected scoring/GroupMe/recovery architecture, stable team isolation, separate Following permissions, raw identity labels, tournament reconciliation, and Lamorinda club theme.”
