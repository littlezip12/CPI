# WPI 7.64.2 — Scale & Mega-Event Readiness Handoff

- Bounded public scoreboard RPC: `live_public_scoreboard_v3` (server filters; max 100/page).
- Bounded tournament RPC: `live_public_tournament_v2` (server filters; max 100/page).
- Sanitized public score Broadcast: topic `wpi-public-game:<game-id>`, event `score`; no full database rows.
- Public Live Center receives only invalidation hints on `wpi-public-scoreboard`; it re-reads through the bounded RPC.
- Public score browser uses Broadcast primarily, 60s safety refresh when subscribed, 12s fallback when not.
- Public score/tournament indexes are additive partial indexes.
- `live-scale-readiness.html` is Platform Owner only and observational; it does not claim a load test passed.
- Scale targets remain 150K games/year, 6K-game mega-event, 10K simultaneous viewers, 250 events/game ceiling.
- Before JO-scale traffic, execute a controlled load test and measure p50/p95/p99, CPU/I/O/connections, Realtime health, errors and score persistence.
- Protected scoring/backend/storage/GroupMe/roster-extraction files are unchanged.
