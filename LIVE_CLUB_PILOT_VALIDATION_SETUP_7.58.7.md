# WPI Live 7.58.7 — Club Pilot Validation Setup

## What the database change does

`public.live_club_pilot_validation_v1(uuid)` is an authenticated Owner/Admin-only, `SECURITY DEFINER`, read-only diagnostic RPC.

It derives evidence from existing canonical records. It does not create or modify teams, memberships, follows, games, scorer sessions, GroupMe routes, deliveries, events, series or recaps.

## Evidence model

### Derived automatically

- **Multiple real teams** — two or more active teams under the club.
- **Concurrent team games** — overlapping `started_at` → `ended_at` windows across different club teams.
- **Scorer handoff** — accepted handoff actions in `live_game_scorer_audit`.
- **Per-team GroupMe routing** — active/tested destinations and zero game-to-destination cross-team mismatches.
- **Following isolation guard** — no Follow row overlaps permanent membership for the same team.
- **Multi-game weekend** — a Tournament/Scrimmage Weekend containing at least two completed games.
- **Official tournament linkage** — canonical Live games that carry official tournament event + game IDs.
- **Unlisted opponents** — manual games whose raw opponent name remains intentionally unmatched to a WPI club/team identity.

### Intentionally not auto-proven

**Offline → reconnect** remains a manual device test. Game-scoped local storage is already regression-protected, but a database query cannot prove a real phone lost network access, continued scoring, reconnected and synchronized correctly.

## 7.59.0 guardrail

The RPC returns evidence states such as `observed`, `guarded`, `pending`, `manual`, `external`, and `attention`. It intentionally has no automatic `ready` state and does not declare the Club Pilot Ready milestone.
