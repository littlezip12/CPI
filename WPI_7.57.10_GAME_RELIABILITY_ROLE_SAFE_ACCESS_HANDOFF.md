# WPI 7.57.10 — Game Reliability & Role-Safe Access Handoff

Built from pushed WPI 7.57.9 baseline `CPI-main - 2026-08-09T093501.969.zip`.

This release addresses three user-reported issues/directions:

1. A newly created Friendly with an assigned scorer could return to the dashboard without a visible/startable game. The 7.57.9 client used separate game-save and assignment calls. 7.57.10 replaces that browser path with `live_save_game_day_v1`, which performs game persistence + optional scorer assignment in one database transaction, returns the canonical game ID, and is followed by `live_game_day_record_v1` verification. Before navigation, `live_prepare_game_start_v3` plus `backend.loadGameState()` preflight the exact saved game.
2. Role-shaped UX: Owner/Admin retain the full administration dashboard. Scorer gets a focused assignment/game launch experience. Viewer gets a minimal game browser for upcoming/live/final games and opens live/final games read-only for score/time/play-by-play.
3. Least-privilege onboarding: users never choose their own access level. The pilot remains invite-only, but every pending/new invite is forced to Viewer by a server-side trigger. After acceptance, Owner/Admin may promote to Scorer; only Owner may promote to Admin. Existing accepted memberships are unchanged. First-owner bootstrap remains Owner by design.

No Edge Function changes. Protected 7.56.15 scorer/delivery foundation, GroupMe, roster vision, team context, tournament schedule integration/reconciliation, and 7.57.9 assignment migration remain unchanged.
