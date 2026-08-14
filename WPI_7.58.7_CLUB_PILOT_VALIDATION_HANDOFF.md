# WPI 7.58.7 — Club Pilot Validation & Observability Handoff

## Baseline

Built cumulatively from the pushed and validated WPI 7.58.6 baseline `CPI-main - 2026-08-13T193156.256.zip`.

## Scope

7.58.7 is a thin validation/observability release. It does not redesign WPI Live.

### New Owner All Teams panel

**Club Pilot proving run** shows:

- active teams
- tested GroupMe coverage
- concurrent cross-team game evidence
- multi-game event evidence
- individual pilot gates with state and details
- team route/readiness rows
- unlisted manual opponents retained for later identity review
- a recommended **Next proof** based on the first unresolved gate

### New database RPC

`live_club_pilot_validation_v1(target_club_id uuid)`

Owner/Admin only. Read-only. Canonical evidence only.

## Protected foundations

Unchanged:

- stable Club → Teams identities
- team-specific profiles/rosters/default starters
- team-specific access
- Following as a separate read-only relationship
- one active scorer per game
- handoff/Admin takeover/recovery
- game-scoped offline browser storage
- GroupMe exactly-once/retry/audit behavior
- Final Whistle / Reopen / Re-Final
- event archive and permanent recaps
- manual opponent raw-name preservation
- tournament canonical reconciliation / no-duplicate protections
- public rankings editorial/manual policy

No Edge Function redeployment and no new secret.

## Milestone status

7.58.7 still is **not 7.59.0**.

The remaining Club Pilot proving work should be driven from the new All Teams panel. The most important real-world proofs remain:

1. concurrent 12U + 14U games on separate devices
2. scorer handoff during pilot usage
3. both teams' GroupMe routes in real use
4. deliberate offline → continue scoring → reconnect
5. real multi-game weekend with recaps
6. first real 2026–2027 official tournament schedule and canonical reconciliation

The official schedule gate remains externally pending while WPI has zero current-season official games in the production feed.
