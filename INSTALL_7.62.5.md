# WPI 7.62.5 — Public Matchup Identity & Score Polish

## Scope
- Public WPI Live game cards show both team and opponent logos.
- Public score pages show both sides of the matchup with resilient logo fallbacks.
- Final games identify the winner visually; live games subtly indicate the current leader.
- Public score freshness uses the server game update timestamp and continues 8-second auto-refresh.
- No roster, player event, scorer, membership, GroupMe, or delivery detail is added to the public surface.

## Infrastructure
- No Supabase migration.
- No Edge Function redeploy.
- No new secret.

## Validation
```bash
./release-check-live-7.62.5
./release-check-clean
```
