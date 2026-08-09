# WPI 7.57.7 — Game-Day Identity & Launch Reliability

## Purpose
Fix Game-Day start reliability for pre-created games, simplify manual game types to Tournament/Friendly, and resolve canonical WPI logos/display names as the user types on mobile or desktop.

## Supabase
Apply `supabase/migrations/202608080006_game_day_identity_launch_reliability.sql`. No Edge Function redeploy and no new secrets.

## Key behavior
- Tournament and Friendly are the only new game types shown.
- Legacy Scrimmage records remain readable; editing a planned legacy Scrimmage normalizes it to Friendly.
- Start/Save & Start first calls `live_prepare_game_start_v1`, which uses the existing scorer-control authority and audit model, then opens the unchanged 7.56.15 scorer.
- Opponent input resolves identity on every input event; datalist selection is optional.
- `Stanford Black` displays Stanford + its logo and retains the source label. `CCU A` / `CCU Black` displays CCU + its logo and retains the source label.
