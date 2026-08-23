-- WPI 7.64.3 — STAGING-ONLY mega-event fixture
-- DO NOT run this in the current WPI production Supabase project.
--
-- Purpose: create the 6,000-game / 100+ active-game data envelope in an
-- isolated/staging Supabase project so the real 7.64.2 public read functions,
-- indexes and Broadcast trigger are exercised by the 7.64.3 harness.
--
-- REQUIRED BEFORE RUNNING:
-- 1. Use a separate staging/test Supabase project.
-- 2. Apply the normal WPI migrations through 202608220003.
-- 3. Have at least one normal active WPI Live team in that staging project.
-- 4. Replace target_team_id := null below with that staging team UUID.
--
-- Cleanup file: supabase/load-test/7.64.3_cleanup_mega_event_fixture.sql

DO $$
DECLARE
  target_team_id uuid := null; -- REQUIRED: set a STAGING team UUID here.
  target_owner_id uuid;
  target_team_name text;
  target_age_group text;
BEGIN
  IF target_team_id IS NULL THEN
    RAISE EXCEPTION 'STAGING ONLY: set target_team_id before running the 7.64.3 fixture';
  END IF;

  SELECT owner_id,coalesce(nullif(trim(display_label),''),name),coalesce(age_group,'14U')
  INTO target_owner_id,target_team_name,target_age_group
  FROM public.live_teams
  WHERE id=target_team_id AND active=true;

  IF target_owner_id IS NULL THEN
    RAISE EXCEPTION 'Target staging team was not found or is inactive';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.live_games
    WHERE client_game_id LIKE 'wpi-loadtest-7643-%'
  ) THEN
    RAISE EXCEPTION '7.64.3 load-test fixture already exists. Run cleanup first.';
  END IF;

  INSERT INTO public.live_games(
    team_id,competitive_season,client_game_id,source_mode,team_name_snapshot,opponent_name,
    scheduled_at,venue,status,visibility,current_quarter,current_time_remaining_seconds,
    team_score,opponent_score,created_by,game_kind,creation_source,tournament_name,
    tournament_public_id,reconciliation_status,official_division_label,official_game_number,
    official_stage,started_at,ended_at,age_group
  )
  SELECT
    target_team_id,
    '2026-2027',
    'wpi-loadtest-7643-' || lpad(gs::text,5,'0'),
    'manual',
    target_team_name,
    'Load Test Opponent ' || gs,
    CASE
      WHEN gs <= 120 THEN now() - interval '15 minutes' + ((gs % 60) * interval '10 seconds')
      WHEN gs <= 3060 THEN now() + ((gs-120) * interval '12 seconds')
      ELSE now() - interval '3 days' + ((gs-3060) * interval '75 seconds')
    END,
    'Load Test Pool ' || ((gs-1) % 24 + 1),
    CASE WHEN gs <= 120 THEN 'live'::public.live_game_status WHEN gs <= 3060 THEN 'scheduled'::public.live_game_status ELSE 'final'::public.live_game_status END,
    'public_team'::public.live_visibility,
    CASE WHEN gs <= 120 THEN ((gs-1)%4)+1 WHEN gs > 3060 THEN 4 ELSE 1 END,
    CASE WHEN gs <= 120 THEN 420-((gs*7)%360) WHEN gs > 3060 THEN 0 ELSE 420 END,
    CASE WHEN gs <= 120 OR gs > 3060 THEN (gs%13)::numeric ELSE 0 END,
    CASE WHEN gs <= 120 OR gs > 3060 THEN ((gs*3)%13)::numeric ELSE 0 END,
    target_owner_id,
    'tournament',
    'manual',
    'WPI 7.64.3 Mega Event Fixture',
    'wpi-loadtest-7643',
    'provisional',
    target_age_group || ' Load Test',
    gs::text,
    CASE WHEN gs <= 3000 THEN 'Pool' ELSE 'Placement' END,
    CASE WHEN gs <= 120 OR gs > 3060 THEN now() - interval '30 minutes' ELSE null END,
    CASE WHEN gs > 3060 THEN now() - interval '5 minutes' ELSE null END,
    target_age_group
  FROM generate_series(1,6000) gs;

  RAISE NOTICE 'Created 6,000 staging fixture games: 120 live, 2,940 upcoming, 2,940 final.';
END $$;

SELECT
  count(*) AS fixture_games,
  count(*) FILTER (WHERE status='live') AS live_games,
  count(*) FILTER (WHERE status IN ('scheduled','setup')) AS upcoming_games,
  count(*) FILTER (WHERE status='final') AS final_games
FROM public.live_games
WHERE client_game_id LIKE 'wpi-loadtest-7643-%';
