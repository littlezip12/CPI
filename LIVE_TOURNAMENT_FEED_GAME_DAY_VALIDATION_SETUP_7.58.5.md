# WPI Live 7.58.5 — Tournament Feed → Game-Day Validation

## Production feed contract

The production dashboard consumes:

`data/live/tournament-schedule-index.json`

That file is derived only from current-season events registered in the public WPI tournament hub with a real `dataPath`. The builder never creates an event/game merely because an upcoming tournament has been announced.

## Squad-safe identity policy

Official schedule ingestion uses this order of trust:

1. canonical WPI team ID match
2. exact Live team/display-name match
3. canonical club + matching squad qualifier
4. club-only identity only when there is one unambiguous same-age/gender Live team

If WPI has multiple same-age/gender Live squads and the official source only identifies the club, the matchup is not added to Game-Day Hub. It becomes an identity-review condition instead.

This prevents one generic `Lamorinda` source row from being auto-imported into both an A and B team.

## Canonical manual-game reconciliation

7.58.5 deliberately keeps the existing database reconciliation mechanism introduced in 7.57.8:

- one official `(team, environment, tournament_event_id, source_game_id)` identity
- transaction advisory lock around official sync
- high-confidence manual fallback may receive the official identity on the same `live_games.id`
- lower-confidence manual matches stay `possible_match`
- Owner/Admin explicitly confirms or dismisses ambiguous matches
- if a completed WPI Live score conflicts with the later official score, the Live score/event log is preserved and reconciliation becomes `conflict`
- no canonical game is deleted during official sync

## Source-backed validation evidence

QA-only file:

`data/live/tournament-feed-validation.json`

It is generated from real banked WPI platform data and is **not loaded by the production dashboard**.

The regression set proves three real identity cases:

- historical Evan Cousineau 14U Boys `LAMORINDA A` → A only
- historical Evan Cousineau 14U Boys `LAMORINDA B` → B only
- historical Quiksilver 14U Boys generic `LAMORINDA` → identity review if A/B both exist

## Current 2026–2027 limitation

WPI's current-season public hub does not yet contain an official 2026–2027 game schedule. Therefore this release cannot truthfully claim a live current-season game was imported from a published source.

When an official current-season schedule is added to the public tournament platform, the same production index and Game-Day sync path will ingest it without a new architecture change. That live-source observation remains a rollout validation item.

## Infrastructure

No Supabase migration.  
No Edge Function redeploy.  
No new secret.
