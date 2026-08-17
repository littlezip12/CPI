# WPI 7.62.6 — Homepage Live Pulse & Public Score Discovery

## Scope
- Adds a compact public WPI Live pulse directly to the WPI homepage.
- Prioritizes live public games, then upcoming public games, then recent public finals.
- Uses both matchup logos and organization colors when available.
- Links directly to the public score-only game viewer.
- Refreshes every 30 seconds while the homepage is visible.
- Uses the existing `live_public_scoreboard_v1` RPC; no new public data surface is introduced.
- Preserves the existing `public_team` privacy boundary. No rosters, player events, scorer identity, membership data, GroupMe information, delivery logs, or team-private games are exposed.

## Infrastructure
- No Supabase migration.
- No Edge Function redeploy.
- No new secret.

## Validation
```bash
./release-check-live-7.62.6
./release-check-clean
```
