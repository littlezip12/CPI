# WPI Live 7.59.0 — Lamorinda Club Pilot Runbook

## Pilot status
**Manual-game Lamorinda club pilot: READY.**

Validated/observed foundation includes multiple Lamorinda teams, cross-team isolation, read-only Following, game-scoped scorer authority/handoffs, per-team GroupMe routes, structured final recaps, team-aware Tournaments & Weekends, multi-game event evidence, manual-opponent identity review, launch readiness/admin safety and Lamorinda-branded scoring.

### Explicitly not blocking the manual-game pilot
- **Offline → reconnect:** deferred resilience test. The local recovery architecture remains protected, but a real-device disconnect/reconnect proving run is not required for pilot launch.
- **Official 2026–2027 tournament feed:** external dependency. Do not fabricate a schedule. Validate official feed → Game-Day Hub → manual fallback reconciliation when a real current-season source exists.

## Before the weekend
1. Owner opens **All Lamorinda Teams** and checks launch readiness for each active team.
2. Confirm roster and default starters.
3. Confirm permanent access/scorer coverage.
4. Confirm the team’s GroupMe destination is ACTIVE/tested.
5. Create manual Tournament/Friendly games only when no official schedule is available.
6. Confirm Team + Season and review duplicate-game warning before saving.

## At the pool
1. Scorer opens the canonical game and confirms starters.
2. Use the existing direct-action scoring controls; avoid browser-level duplication of the same game on multiple independent tabs.
3. Use handoff/claim for scorer changes. Owner/Admin takeover is emergency recovery, not the normal transfer path.
4. Use **Dashboard** to return to the team/club workspace without abandoning the game.

## Final / recovery
1. Final Whistle must persist the final state before the complete GroupMe recap is sent.
2. Confirm the final appears in Recent Finals and its Game Recap loads structured stats/events.
3. If Final was accidental, use Reopen when permitted. Score/event history must remain intact.
4. Never delete/recreate a completed game to fix a recap, scorer or identity issue.

## Identity review
- Unknown opponent names are valid manual labels.
- They remain raw until an Owner explicitly maps them to an existing WPI identity.
- Mapping adds a canonical link; it does not rewrite the originally entered game label.

## If something goes wrong
Capture: team, opponent, game ID, approximate time, account role, screenshot and what action immediately preceded the problem. Preserve the canonical game. Avoid force-changing database records or creating a second game unless the recovery procedure specifically calls for it.
