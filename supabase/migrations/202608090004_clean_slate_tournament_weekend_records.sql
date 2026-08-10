-- WPI 7.57.15 — Clean Slate & Tournament Weekend Records.
-- Intentional one-time pilot reset: clears all existing WPI Live game records while
-- preserving teams, members, roster, access, GroupMe destination, and team setup.
-- New games are grouped under a Tournament or named Scrimmage Weekend so the team
-- can return to a durable weekend record instead of a flat Game History list.

create table if not exists public.live_game_series (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.live_teams(id) on delete cascade,
  series_type text not null check (series_type in ('tournament','scrimmage_weekend')),
  name text not null check (char_length(trim(name)) between 1 and 120),
  competitive_season text not null default '2026-2027',
  tournament_public_id text,
  creation_source text not null default 'manual' check (creation_source in ('manual','tournament_schedule')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists live_game_series_tournament_identity_idx
  on public.live_game_series(team_id,tournament_public_id)
  where series_type='tournament' and tournament_public_id is not null;

create unique index if not exists live_game_series_named_identity_idx
  on public.live_game_series(team_id,series_type,competitive_season,lower(name));

create index if not exists live_game_series_team_updated_idx
  on public.live_game_series(team_id,updated_at desc);

alter table public.live_game_series enable row level security;

drop policy if exists live_game_series_team_read on public.live_game_series;
create policy live_game_series_team_read
  on public.live_game_series
  for select to authenticated
  using (public.live_is_team_member(team_id));

drop policy if exists live_game_series_manager_insert on public.live_game_series;
create policy live_game_series_manager_insert
  on public.live_game_series
  for insert to authenticated
  with check (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[]));

drop policy if exists live_game_series_manager_update on public.live_game_series;
create policy live_game_series_manager_update
  on public.live_game_series
  for update to authenticated
  using (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[]))
  with check (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[]));

alter table public.live_games
  add column if not exists series_id uuid references public.live_game_series(id) on delete set null,
  add column if not exists scrimmage_weekend_name text;

create index if not exists live_games_series_status_idx
  on public.live_games(series_id,status,scheduled_at);

alter table public.live_games alter column environment set default 'production';

comment on table public.live_game_series is
  'Durable WPI Live record container. Tournament games group under a Tournament series; Friendly games group under a named Scrimmage Weekend series.';
comment on column public.live_games.series_id is
  'Canonical tournament/scrimmage-weekend record container for permanent lookback.';
comment on column public.live_games.scrimmage_weekend_name is
  'Friendly-game source label used to place the game into a named Scrimmage Weekend.';

create or replace function public.live_series_link_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  desired_type text;
  desired_name text;
  desired_public_id text;
  linked_id uuid;
  lock_key text;
begin
  -- 7.57.14 graduated the product surface. From this clean slate forward,
  -- all newly persisted WPI Live games are production records.
  new.environment := 'production';

  if new.game_kind='tournament' and nullif(trim(coalesce(new.tournament_name,'')),'') is not null then
    desired_type := 'tournament';
    desired_name := trim(new.tournament_name);
    desired_public_id := nullif(trim(coalesce(new.tournament_public_id,'')),'');
  elsif new.game_kind='friendly' and nullif(trim(coalesce(new.scrimmage_weekend_name,'')),'') is not null then
    desired_type := 'scrimmage_weekend';
    desired_name := trim(new.scrimmage_weekend_name);
    desired_public_id := null;
  else
    new.series_id := null;
    return new;
  end if;

  lock_key := new.team_id::text || ':' || desired_type || ':' || coalesce(desired_public_id,lower(desired_name)) || ':' || coalesce(new.competitive_season,'');
  perform pg_advisory_xact_lock(hashtextextended(lock_key,0));

  if desired_type='tournament' and desired_public_id is not null then
    select id into linked_id
    from public.live_game_series
    where team_id=new.team_id and series_type='tournament' and tournament_public_id=desired_public_id
    limit 1;
  end if;

  if linked_id is null then
    select id into linked_id
    from public.live_game_series
    where team_id=new.team_id
      and series_type=desired_type
      and competitive_season=coalesce(new.competitive_season,'2026-2027')
      and lower(name)=lower(desired_name)
    limit 1;
  end if;

  if linked_id is null then
    insert into public.live_game_series(
      team_id,series_type,name,competitive_season,tournament_public_id,creation_source,created_by
    ) values (
      new.team_id,
      desired_type,
      desired_name,
      coalesce(new.competitive_season,'2026-2027'),
      desired_public_id,
      case when desired_type='tournament' and new.creation_source='tournament_schedule' then 'tournament_schedule' else 'manual' end,
      coalesce(new.created_by,auth.uid())
    ) returning id into linked_id;
  else
    update public.live_game_series
    set name=desired_name,
        tournament_public_id=coalesce(desired_public_id,tournament_public_id),
        creation_source=case when desired_type='tournament' and new.creation_source='tournament_schedule' then 'tournament_schedule' else creation_source end,
        updated_at=now()
    where id=linked_id;
  end if;

  new.series_id := linked_id;
  return new;
end;
$$;

drop trigger if exists live_games_series_link_trigger on public.live_games;
create trigger live_games_series_link_trigger
  before insert or update of game_kind,tournament_name,tournament_public_id,scrimmage_weekend_name,competitive_season,creation_source
  on public.live_games
  for each row execute function public.live_series_link_trigger_v1();

create or replace function public.live_save_game_day_v2(
  target_team_id uuid,
  target_game_id uuid,
  requested_game_kind text,
  requested_opponent_name text,
  requested_opponent_source_name text,
  requested_scheduled_at timestamptz,
  requested_timezone text,
  requested_venue text,
  requested_quarter_length_minutes integer,
  requested_tournament_name text,
  requested_tournament_public_id text,
  requested_series_name text,
  requested_opponent_wpi_team_id text,
  requested_opponent_wpi_club_id text,
  requested_team_logo_url text,
  requested_opponent_logo_url text,
  target_scorer_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
  saved_game_id uuid;
  cleaned_kind text := lower(trim(coalesce(requested_game_kind,'')));
  cleaned_series text := nullif(trim(coalesce(requested_series_name,'')),'');
  series_row public.live_game_series%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if cleaned_kind='scrimmage' then cleaned_kind := 'friendly'; end if;
  if cleaned_kind not in ('tournament','friendly') then raise exception 'Game type must be tournament or friendly'; end if;
  if cleaned_kind='friendly' and cleaned_series is null then
    raise exception 'A Scrimmage Weekend name is required for a Friendly';
  end if;
  if cleaned_kind='tournament' then
    cleaned_series := coalesce(cleaned_series,nullif(trim(coalesce(requested_tournament_name,'')),''));
    if cleaned_series is null then raise exception 'Tournament name is required'; end if;
  end if;

  result := public.live_save_game_day_v1(
    target_team_id,
    target_game_id,
    cleaned_kind,
    requested_opponent_name,
    requested_opponent_source_name,
    requested_scheduled_at,
    requested_timezone,
    requested_venue,
    requested_quarter_length_minutes,
    requested_tournament_name,
    requested_tournament_public_id,
    requested_opponent_wpi_team_id,
    requested_opponent_wpi_club_id,
    requested_team_logo_url,
    requested_opponent_logo_url,
    target_scorer_user_id
  );

  saved_game_id := nullif(result->>'gameId','')::uuid;
  if saved_game_id is null then raise exception 'Game save did not return an ID'; end if;

  update public.live_games
  set scrimmage_weekend_name=case when cleaned_kind='friendly' then cleaned_series else null end,
      environment='production',
      updated_at=now()
  where id=saved_game_id and team_id=target_team_id;

  select s.* into series_row
  from public.live_games g
  join public.live_game_series s on s.id=g.series_id
  where g.id=saved_game_id and g.team_id=target_team_id;

  if series_row.id is null then raise exception 'WPI could not attach this game to its tournament/weekend record'; end if;

  return result || jsonb_build_object(
    'seriesId',series_row.id,
    'seriesType',series_row.series_type,
    'seriesName',series_row.name
  );
end;
$$;

grant execute on function public.live_save_game_day_v2(uuid,uuid,text,text,text,timestamptz,text,text,integer,text,text,text,text,text,text,text,uuid) to authenticated;

-- Preserve the 7.57.11 chunked queue implementation and enrich it with the
-- durable series identity. Never return to a single >100-argument JSON builder.
create or replace function public.live_game_day_queue_v4(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  member_role public.live_team_role;
  queue jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into member_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  if member_role is null then raise exception 'Team membership required'; end if;

  select coalesce(jsonb_agg(row_data order by sort_rank,sort_mine,sort_time asc nulls last,sort_updated desc),'[]'::jsonb)
  into queue
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end as sort_rank,
      case when g.assigned_scorer_user_id=caller then 0 when g.assigned_scorer_user_id is null then 1 else 2 end as sort_mine,
      g.scheduled_at as sort_time,
      g.updated_at as sort_updated,
      (
        jsonb_build_object(
          'id',g.id,'clientGameId',g.client_game_id,'teamId',g.team_id,'teamName',g.team_name_snapshot,
          'opponentName',g.opponent_name,'opponentSourceName',coalesce(g.opponent_source_name,g.opponent_name),
          'scheduledAt',g.scheduled_at,'venue',g.venue,'ageGroup',g.age_group,'quarterLengthSeconds',g.quarter_length_seconds,
          'status',g.status,'teamScore',g.team_score,'opponentScore',g.opponent_score,'startedAt',g.started_at,'endedAt',g.ended_at,
          'updatedAt',g.updated_at,'gameKind',g.game_kind,'creationSource',g.creation_source
        )
        || jsonb_build_object(
          'tournamentName',g.tournament_name,'scheduledTimezone',g.scheduled_timezone,'tournamentPublicId',g.tournament_public_id,
          'officialTournamentEventId',g.tournament_event_id,'officialSourceGameId',g.source_game_id,
          'opponentWpiTeamId',g.opponent_wpi_team_id,'opponentWpiClubId',g.opponent_wpi_club_id,
          'teamLogoUrl',g.team_logo_url,'opponentLogoUrl',g.opponent_logo_url,'reconciliationStatus',g.reconciliation_status,
          'reconciliationConfidence',g.reconciliation_confidence,'reconciliationCandidateEventId',g.reconciliation_candidate_event_id,
          'reconciliationCandidateGameId',g.reconciliation_candidate_game_id,'reconciliationCandidateSnapshot',g.reconciliation_candidate_snapshot,
          'officialScheduledAt',g.official_scheduled_at,'officialVenue',g.official_venue,'officialOpponentName',g.official_opponent_name,
          'officialDivisionId',g.official_division_id
        )
        || jsonb_build_object(
          'officialDivisionLabel',g.official_division_label,'officialGameNumber',g.official_game_number,'officialStage',g.official_stage,
          'officialStatus',g.official_status,'officialTeamScore',g.official_team_score,'officialOpponentScore',g.official_opponent_score,
          'officialLastSeenAt',g.official_last_seen_at,'assignedScorerUserId',g.assigned_scorer_user_id,
          'assignedScorerDisplayName',g.assigned_scorer_display_name,'assignedAt',g.assigned_at,'assignedBy',g.assigned_by,
          'isAssignedToMe',g.assigned_scorer_user_id=caller,
          'canStart',case
            when g.status='live' then true
            when g.status not in ('setup','scheduled') or g.started_at is not null then false
            when member_role in ('owner','admin') then true
            when member_role='scorer' and (g.assigned_scorer_user_id is null or g.assigned_scorer_user_id=caller) then true
            else false
          end,
          'cancelledReason',g.cancelled_reason,'canManage',member_role in ('owner','admin'),
          'seriesId',g.series_id,'seriesName',s.name,'seriesType',s.series_type,
          'scrimmageWeekendName',g.scrimmage_weekend_name
        )
      ) as row_data
    from public.live_games g
    left join public.live_game_series s on s.id=g.series_id
    where g.team_id=target_team_id and g.status <> 'cancelled'
  ) rows;

  return jsonb_build_object('role',member_role,'games',queue);
end;
$$;

grant execute on function public.live_game_day_queue_v4(uuid) to authenticated;

create or replace function public.live_game_series_archive_v1(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  member_role public.live_team_role;
  series_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into member_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  if member_role is null then raise exception 'Team membership required'; end if;

  select coalesce(jsonb_agg(series_row order by sort_date desc nulls last,created_at desc),'[]'::jsonb)
  into series_json
  from (
    select
      s.created_at,
      summary.last_game_at as sort_date,
      jsonb_build_object(
        'id',s.id,
        'seriesType',s.series_type,
        'name',s.name,
        'competitiveSeason',s.competitive_season,
        'tournamentPublicId',s.tournament_public_id,
        'creationSource',s.creation_source,
        'gameCount',summary.game_count,
        'finalCount',summary.final_count,
        'wins',summary.wins,
        'losses',summary.losses,
        'ties',summary.ties,
        'firstGameAt',summary.first_game_at,
        'lastGameAt',summary.last_game_at,
        'games',summary.games
      ) as series_row
    from public.live_game_series s
    cross join lateral (
      select
        count(g.id)::int as game_count,
        count(g.id) filter (where g.status='final')::int as final_count,
        count(g.id) filter (where g.status='final' and g.team_score>g.opponent_score)::int as wins,
        count(g.id) filter (where g.status='final' and g.team_score<g.opponent_score)::int as losses,
        count(g.id) filter (where g.status='final' and g.team_score=g.opponent_score)::int as ties,
        min(g.scheduled_at) as first_game_at,
        max(coalesce(g.scheduled_at,g.ended_at,g.created_at)) as last_game_at,
        coalesce(jsonb_agg(
          jsonb_build_object(
            'id',g.id,
            'teamName',g.team_name_snapshot,
            'opponentName',g.opponent_name,
            'scheduledAt',g.scheduled_at,
            'venue',g.venue,
            'status',g.status,
            'teamScore',g.team_score,
            'opponentScore',g.opponent_score,
            'teamLogoUrl',g.team_logo_url,
            'opponentLogoUrl',g.opponent_logo_url
          ) order by coalesce(g.scheduled_at,g.ended_at,g.created_at)
        ) filter (where g.status='final'),'[]'::jsonb) as games
      from public.live_games g
      where g.series_id=s.id
    ) summary
    where s.team_id=target_team_id and summary.game_count>0
  ) rows;

  return jsonb_build_object('role',member_role,'series',series_json);
end;
$$;

grant execute on function public.live_game_series_archive_v1(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- INTENTIONAL PILOT CLEAN SLATE
-- ---------------------------------------------------------------------------
-- The user explicitly requested that Games on Deck and old Game History start
-- empty. live_games is the parent of lineups, play events, deliveries, recaps,
-- scorer sessions/passes/audit and assignment audit, all of which cascade.
-- Team profile, roster, members, invitations and GroupMe setup are preserved.
delete from public.live_games;
delete from public.live_game_series;
