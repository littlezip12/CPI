# WPI 7.56.1 — Connected Live Backend Foundation

- Adds a private WPI Live dashboard between account access and the scorer.
- Activates browser-ready Supabase email/password signup, sign-in, email confirmation, password reset, and persistent sessions once the team-owned project is configured.
- Establishes Team Owner, Admin, Scorer, and Viewer roles protected by Postgres Row Level Security.
- Bootstraps the first connected workspace as Lamorinda A 14U Boys and supports secure ownership transfer and invitation links.
- Persists teams, rosters, players, games, lineups, event history, corrections, recap drafts, analytics snapshots, and future GroupMe delivery audit rows.
- Stores an exact private game snapshot for resilient resume while retaining normalized events as the analytics source of truth.
- Adds authorized realtime game subscriptions and browser-local fallback if a connected sync is temporarily unavailable.
- Keeps GroupMe in mock/preview mode until connected authentication and storage complete multi-device testing.
- Preserves all 724 immutable 2025–2026 rankings, 182 clubs, tournament results, identities, and existing 7.56.0 overtime/shootout/shot-tracking behavior.
