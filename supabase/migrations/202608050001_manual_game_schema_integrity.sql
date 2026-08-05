-- WPI 7.56.4 manual-game schema integrity.
-- Removes the legacy NULLS NOT DISTINCT constraint that treated manual-game
-- NULL source IDs as equal and therefore allowed only one manual game per team.
-- The hosted WPI Live project was already corrected manually; this migration
-- makes the correction reproducible for future projects and rebuilds.

alter table public.live_games
  drop constraint if exists live_games_environment_tournament_event_id_source_game_id_t_key;

alter table public.live_games
  drop constraint if exists live_games_environment_tournament_event_id_source_game_id_team_id_key;

-- Also remove a structurally equivalent legacy constraint if PostgreSQL or a
-- prior migration assigned it a different name.
do $$
declare
  legacy_constraint record;
begin
  for legacy_constraint in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.live_games'::regclass
      and c.contype = 'u'
      and c.connullsnotdistinct
      and (
        select array_agg(a.attname order by key_column.ordinality)
        from unnest(c.conkey) with ordinality as key_column(attnum, ordinality)
        join pg_attribute a
          on a.attrelid = c.conrelid
         and a.attnum = key_column.attnum
      ) = array[
        'environment',
        'tournament_event_id',
        'source_game_id',
        'team_id'
      ]::name[]
  loop
    execute format(
      'alter table public.live_games drop constraint %I',
      legacy_constraint.conname
    );
  end loop;
end $$;

-- Official imported games remain unique only when both source identifiers exist.
create unique index if not exists live_games_official_source_idx
  on public.live_games(environment,tournament_event_id,source_game_id,team_id)
  where tournament_event_id is not null and source_game_id is not null;

-- Manual and imported games use the stable browser/client game identifier.
create unique index if not exists live_games_team_client_id_idx
  on public.live_games(team_id,client_game_id);

comment on index public.live_games_official_source_idx is
  'Prevents duplicate official-source games only when both tournament source identifiers exist.';

comment on index public.live_games_team_client_id_idx is
  'Allows multiple manual games per team while preventing duplicate persistence of the same client game.';
