# WPI 7.55.2 — Live Scoring Sandbox Foundation

- Adds a hidden, `noindex` **Live Scoring Sandbox** for dry runs and scrimmage testing without touching rankings, tournament archives, official results, or public team profiles.
- Provides a mobile-first console for goals and optional assists, saves, field blocks, steals, turnovers, exclusions drawn/committed, five-meter penalties drawn/committed, opponent goals, quarter starts, starting lineups, score corrections, undo, and manual quarter/time remaining.
- Stores demo-mode test data only in the scorer's browser and clearly labels all output as unofficial sandbox data.
- Generates exact GroupMe message previews with configurable message frequency, pause/resume controls, and a reusable team/tournament destination label.
- Produces end-of-game team/player analytics, an editable parent recap, and a downloadable JSON game log.
- Adds a Supabase schema with email/password-ready team roles, row-level security, sandbox/production separation, rosters, games, lineups, events, and delivery audit records.
- Adds a server-side GroupMe Edge Function blueprint that keeps the bot ID out of GitHub and the public browser client.
- Keeps all 724 final rankings, 182 clubs, multi-season snapshots, tournament scores, placements, identities, logos, websites, and journeys unchanged.
