# WPI 7.57.11 — Game-Day Queue Hotfix & Dashboard Simplification

Built cumulatively on WPI 7.57.10.

Primary fix: `live_game_day_queue_v4` previously constructed 50+ JSON key/value pairs in one PostgreSQL `jsonb_build_object()` call. That crossed PostgreSQL's 100-function-argument ceiling at runtime. The replacement migration splits the exact same response object across three safe JSON chunks and concatenates them.

Important operational note: the failing browser flow occurred after the atomic save RPC, so a Friendly/Tournament game that looked unsaved may already exist in `live_games`. After applying the migration, refresh Game Day before creating a replacement.

Dashboard simplification: Game-Day Hub is now the only game-creation surface. Guided Team Launch navigates to Game Day instead of opening a duplicate creation path; its second Add Game action is removed; the empty Game-Day state no longer shows Add first game; modal direct launch is labeled Start game.

No Edge Function changes. No new secrets. Preserve all 7.56.15 scoring/delivery behavior and 7.57.x identity, tournament reconciliation, assignments, role-shaped dashboards, and Viewer-first onboarding.
