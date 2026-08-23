-- WPI 7.64.3 — STAGING-ONLY fixture cleanup
-- DO NOT use as a general production cleanup script.
-- Deletes only rows carrying the explicit 7.64.3 synthetic client_game_id prefix.

BEGIN;

DELETE FROM public.live_games
WHERE client_game_id LIKE 'wpi-loadtest-7643-%';

COMMIT;

SELECT count(*) AS remaining_fixture_games
FROM public.live_games
WHERE client_game_id LIKE 'wpi-loadtest-7643-%';
