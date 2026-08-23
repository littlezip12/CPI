-- WPI 7.64.2 — Scale & Mega-Event Readiness
-- Adds bounded public read APIs, server-side filtering/pagination, sanitized
-- score-only Realtime Broadcast, public read indexes, and an owner-only
-- readiness snapshot. This migration does not expose rosters, player events,
-- scorer identity, membership, GroupMe delivery data, or private games.

-- ---------------------------------------------------------------------------
-- Public read indexes for high-volume score/tournament discovery.
-- Partial indexes keep the working set focused on intentionally public games.
-- ---------------------------------------------------------------------------
create index if not exists live_games_public_scoreboard_scale_idx
  on public.live_games(status, scheduled_at, updated_at desc)
  where visibility='public_team' and status<>'cancelled';

create index if not exists live_games_public_tournament_id_scale_idx
  on public.live_games(tournament_public_id, competitive_season, status, scheduled_at, updated_at desc)
  where visibility='public_team'
    and game_kind='tournament'
    and status<>'cancelled'
    and tournament_public_id is not null;

create index if not exists live_games_public_tournament_name_scale_idx
  on public.live_games(lower(trim(tournament_name)), competitive_season, status, scheduled_at, updated_at desc)
  where visibility='public_team'
    and game_kind='tournament'
    and status<>'cancelled'
    and tournament_name is not null;

-- ---------------------------------------------------------------------------
-- Sanitized score-only public Broadcast.
-- The public channel never receives full live_games rows. It receives only the
-- same team-level score/state fields already exposed by the public score RPC.
-- If Realtime public channels are unavailable, clients retain an RPC fallback.
-- ---------------------------------------------------------------------------
create or replace function public.live_broadcast_public_game_score_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  should_emit boolean := false;
  is_visible boolean := false;
  payload jsonb;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  should_emit :=
       new.visibility is distinct from old.visibility
    or new.status is distinct from old.status
    or new.current_quarter is distinct from old.current_quarter
    or new.current_time_remaining_seconds is distinct from old.current_time_remaining_seconds
    or new.team_score is distinct from old.team_score
    or new.opponent_score is distinct from old.opponent_score
    or new.scheduled_at is distinct from old.scheduled_at
    or new.venue is distinct from old.venue
    or new.tournament_name is distinct from old.tournament_name
    or new.tournament_public_id is distinct from old.tournament_public_id;

  if not should_emit then
    return new;
  end if;

  -- Send a hide signal when a previously-public game becomes private/cancelled.
  if old.visibility='public_team' and (new.visibility<>'public_team' or new.status='cancelled') then
    perform realtime.send(
      jsonb_build_object(
        'gameId',new.id,
        'visible',false,
        'updatedAt',new.updated_at
      ),
      'score',
      'wpi-public-game:' || new.id::text,
      false
    );

    perform realtime.send(
      jsonb_build_object('gameId',new.id,'reason','visibility_or_status_changed','updatedAt',new.updated_at),
      'invalidate',
      'wpi-public-scoreboard',
      false
    );
    return new;
  end if;

  is_visible := new.visibility='public_team' and new.status<>'cancelled';
  if not is_visible then
    return new;
  end if;

  payload := jsonb_build_object(
    'gameId',new.id,
    'visible',true,
    'status',new.status,
    'currentQuarter',new.current_quarter,
    'currentTimeRemainingSeconds',new.current_time_remaining_seconds,
    'teamScore',new.team_score,
    'opponentScore',new.opponent_score,
    'scheduledAt',new.scheduled_at,
    'venue',new.venue,
    'tournamentName',new.tournament_name,
    'tournamentPublicId',nullif(trim(new.tournament_public_id),''),
    'competitiveSeason',new.competitive_season,
    'updatedAt',new.updated_at
  );

  perform realtime.send(
    payload,
    'score',
    'wpi-public-game:' || new.id::text,
    false
  );

  -- The center receives only an invalidation hint; it re-reads through the
  -- bounded public RPC rather than receiving any database row payload.
  perform realtime.send(
    jsonb_build_object('gameId',new.id,'updatedAt',new.updated_at),
    'invalidate',
    'wpi-public-scoreboard',
    false
  );

  return new;
end;
$$;

revoke all on function public.live_broadcast_public_game_score_v1() from public,anon,authenticated;

drop trigger if exists live_games_public_score_broadcast_v1 on public.live_games;
create trigger live_games_public_score_broadcast_v1
  after update of visibility,status,current_quarter,current_time_remaining_seconds,team_score,opponent_score,scheduled_at,venue,tournament_name,tournament_public_id
  on public.live_games
  for each row execute function public.live_broadcast_public_game_score_v1();

-- ---------------------------------------------------------------------------
-- Public scoreboard v3: bounded, server-filtered pages.
-- ---------------------------------------------------------------------------
create or replace function public.live_public_scoreboard_v3(
  requested_search text default null,
  requested_organization_type text default null,
  requested_gender text default null,
  requested_status text default 'all',
  requested_limit integer default 60,
  requested_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  search_term text := nullif(lower(trim(coalesce(requested_search,''))),'');
  organization_type_filter text := nullif(lower(trim(coalesce(requested_organization_type,''))),'');
  gender_filter text := nullif(lower(trim(coalesce(requested_gender,''))),'');
  status_filter text := lower(trim(coalesce(requested_status,'all')));
  page_size integer := greatest(1,least(coalesce(requested_limit,60),100));
  page_offset integer := greatest(0,least(coalesce(requested_offset,0),10000));
  games_json jsonb := '[]'::jsonb;
  total_matches integer := 0;
  global_live integer := 0;
  global_upcoming integer := 0;
  global_final integer := 0;
  filtered_live integer := 0;
  filtered_upcoming integer := 0;
  filtered_final integer := 0;
begin
  if status_filter not in ('all','live','upcoming','final') then status_filter := 'all'; end if;
  if organization_type_filter='all' then organization_type_filter := null; end if;
  if gender_filter='all' then gender_filter := null; end if;

  select
    count(*) filter (where g.status='live')::int,
    count(*) filter (where g.status in ('scheduled','setup'))::int,
    count(*) filter (where g.status='final')::int
  into global_live,global_upcoming,global_final
  from public.live_games g
  join public.live_teams t on t.id=g.team_id and t.active=true
  join public.live_clubs c on c.id=t.club_id and c.active=true
  where g.visibility='public_team'
    and g.status<>'cancelled'
    and (
      g.status='live'
      or (g.status in ('scheduled','setup') and g.scheduled_at is not null and g.scheduled_at between now()-interval '6 hours' and now()+interval '14 days')
      or (g.status='final' and coalesce(g.ended_at,g.updated_at,g.created_at)>=now()-interval '30 days')
    );

  select
    count(*)::int,
    count(*) filter (where q.status='live')::int,
    count(*) filter (where q.status in ('scheduled','setup'))::int,
    count(*) filter (where q.status='final')::int
  into total_matches,filtered_live,filtered_upcoming,filtered_final
  from (
    select g.status
    from public.live_games g
    join public.live_teams t on t.id=g.team_id and t.active=true
    join public.live_clubs c on c.id=t.club_id and c.active=true
    where g.visibility='public_team'
      and g.status<>'cancelled'
      and (
        g.status='live'
        or (g.status in ('scheduled','setup') and g.scheduled_at is not null and g.scheduled_at between now()-interval '6 hours' and now()+interval '14 days')
        or (g.status='final' and coalesce(g.ended_at,g.updated_at,g.created_at)>=now()-interval '30 days')
      )
      and (organization_type_filter is null or lower(coalesce(c.organization_type,''))=organization_type_filter)
      and (gender_filter is null or lower(coalesce(t.gender,''))=gender_filter)
      and (
        status_filter='all'
        or (status_filter='live' and g.status='live')
        or (status_filter='upcoming' and g.status in ('scheduled','setup'))
        or (status_filter='final' and g.status='final')
      )
      and (
        search_term is null
        or lower(concat_ws(' ',coalesce(c.display_name,c.name),coalesce(t.display_label,t.name),g.team_name_snapshot,g.opponent_name,t.age_group,t.gender,t.squad_label,g.tournament_name)) like '%'||search_term||'%'
      )
  ) q;

  select coalesce(jsonb_agg(row_data order by sort_rank, sort_time asc nulls last, sort_updated desc),'[]'::jsonb)
  into games_json
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end as sort_rank,
      case when g.status='final' then null else g.scheduled_at end as sort_time,
      g.updated_at as sort_updated,
      jsonb_build_object(
        'id',g.id,
        'teamId',g.team_id,
        'teamFamilyKey',t.canonical_wpi_team_family_key,
        'teamName',g.team_name_snapshot,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,
        'gender',t.gender,
        'squadLabel',t.squad_label,
        'organizationId',coalesce(c.canonical_wpi_club_id,c.canonical_slug,c.id::text),
        'organizationName',coalesce(nullif(trim(c.display_name),''),c.name),
        'organizationType',c.organization_type,
        'organizationLogoUrl',c.logo_url,
        'opponentName',g.opponent_name,
        'scheduledAt',g.scheduled_at,
        'venue',g.venue,
        'status',g.status,
        'currentQuarter',g.current_quarter,
        'currentTimeRemainingSeconds',g.current_time_remaining_seconds,
        'teamScore',g.team_score,
        'opponentScore',g.opponent_score,
        'updatedAt',g.updated_at,
        'endedAt',g.ended_at,
        'gameKind',g.game_kind,
        'tournamentName',g.tournament_name,
        'tournamentPublicId',nullif(trim(g.tournament_public_id),''),
        'competitiveSeason',g.competitive_season,
        'teamLogoUrl',coalesce(g.team_logo_url,c.logo_url),
        'opponentLogoUrl',g.opponent_logo_url
      ) as row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id and t.active=true
    join public.live_clubs c on c.id=t.club_id and c.active=true
    where g.visibility='public_team'
      and g.status<>'cancelled'
      and (
        g.status='live'
        or (g.status in ('scheduled','setup') and g.scheduled_at is not null and g.scheduled_at between now()-interval '6 hours' and now()+interval '14 days')
        or (g.status='final' and coalesce(g.ended_at,g.updated_at,g.created_at)>=now()-interval '30 days')
      )
      and (organization_type_filter is null or lower(coalesce(c.organization_type,''))=organization_type_filter)
      and (gender_filter is null or lower(coalesce(t.gender,''))=gender_filter)
      and (
        status_filter='all'
        or (status_filter='live' and g.status='live')
        or (status_filter='upcoming' and g.status in ('scheduled','setup'))
        or (status_filter='final' and g.status='final')
      )
      and (
        search_term is null
        or lower(concat_ws(' ',coalesce(c.display_name,c.name),coalesce(t.display_label,t.name),g.team_name_snapshot,g.opponent_name,t.age_group,t.gender,t.squad_label,g.tournament_name)) like '%'||search_term||'%'
      )
    order by sort_rank,
             case when g.status='final' then coalesce(g.ended_at,g.updated_at,g.created_at) end desc nulls last,
             g.scheduled_at asc nulls last,
             g.updated_at desc
    limit page_size offset page_offset
  ) rows;

  return jsonb_build_object(
    'games',games_json,
    'summary',jsonb_build_object('liveGames',global_live,'upcomingGames',global_upcoming,'finalGames',global_final),
    'filteredSummary',jsonb_build_object('liveGames',filtered_live,'upcomingGames',filtered_upcoming,'finalGames',filtered_final),
    'page',jsonb_build_object(
      'limit',page_size,
      'offset',page_offset,
      'total',total_matches,
      'returned',jsonb_array_length(games_json),
      'hasMore',(page_offset+jsonb_array_length(games_json))<total_matches,
      'nextOffset',case when (page_offset+jsonb_array_length(games_json))<total_matches then page_offset+jsonb_array_length(games_json) else null end
    ),
    'policy','public_team_summary_only',
    'delivery','server_filtered_bounded_page',
    'generatedAt',now()
  );
end;
$$;

revoke all on function public.live_public_scoreboard_v3(text,text,text,text,integer,integer) from public;
grant execute on function public.live_public_scoreboard_v3(text,text,text,text,integer,integer) to anon,authenticated;

comment on function public.live_public_scoreboard_v3(text,text,text,text,integer,integer) is
  'Bounded public-team scoreboard page with server-side search/type/gender/status filtering. Max page size 100; no roster/player/scorer/private data.';

-- ---------------------------------------------------------------------------
-- Tournament center v2: same conservative public boundary, but games are now
-- server-filtered and paged rather than capped to one 2,000-row payload.
-- ---------------------------------------------------------------------------
create or replace function public.live_public_tournament_v2(
  requested_tournament_public_id text default null,
  requested_tournament_name text default null,
  requested_competitive_season text default null,
  requested_search text default null,
  requested_division text default null,
  requested_team_id uuid default null,
  requested_status text default 'all',
  requested_limit integer default 60,
  requested_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  public_id text := nullif(trim(coalesce(requested_tournament_public_id,'')),'');
  tournament_name text := nullif(trim(coalesce(requested_tournament_name,'')),'');
  season_name text := nullif(trim(coalesce(requested_competitive_season,'')),'');
  search_term text := nullif(lower(trim(coalesce(requested_search,''))),'');
  division_filter text := nullif(trim(coalesce(requested_division,'')),'');
  status_filter text := lower(trim(coalesce(requested_status,'all')));
  page_size integer := greatest(1,least(coalesce(requested_limit,60),100));
  page_offset integer := greatest(0,least(coalesce(requested_offset,0),20000));
  selected_name text;
  selected_public_id text;
  selected_season text;
  representative_series uuid;
  games_json jsonb := '[]'::jsonb;
  teams_json jsonb := '[]'::jsonb;
  divisions_json jsonb := '[]'::jsonb;
  venues_json jsonb := '[]'::jsonb;
  first_game timestamptz;
  last_game timestamptz;
  live_games integer := 0;
  upcoming_games integer := 0;
  final_games integer := 0;
  wpi_teams integer := 0;
  total_matches integer := 0;
begin
  if public_id is null and tournament_name is null then
    return jsonb_build_object('found',false,'reason','missing_tournament','policy','public_team_tournament_summary_only');
  end if;
  if status_filter not in ('all','live','upcoming','final') then status_filter := 'all'; end if;
  if lower(coalesce(division_filter,''))='all' then division_filter := null; end if;

  select g.tournament_name,nullif(trim(g.tournament_public_id),''),g.competitive_season,g.series_id
  into selected_name,selected_public_id,selected_season,representative_series
  from public.live_games g
  join public.live_teams t on t.id=g.team_id and t.active=true
  join public.live_clubs c on c.id=t.club_id and c.active=true
  where g.visibility='public_team'
    and g.game_kind='tournament'
    and g.status<>'cancelled'
    and (
      (public_id is not null and nullif(trim(g.tournament_public_id),'')=public_id)
      or (
        public_id is null
        and tournament_name is not null
        and lower(trim(g.tournament_name))=lower(tournament_name)
        and (season_name is null or g.competitive_season=season_name)
      )
    )
  order by case when g.status='live' then 0 when g.status in ('scheduled','setup') then 1 else 2 end,
           coalesce(g.scheduled_at,g.updated_at,g.created_at) desc
  limit 1;

  if selected_name is null then
    return jsonb_build_object('found',false,'reason','tournament_not_public_or_not_found','policy','public_team_tournament_summary_only');
  end if;

  select
    count(*) filter (where g.status='live')::int,
    count(*) filter (where g.status in ('scheduled','setup'))::int,
    count(*) filter (where g.status='final')::int,
    count(distinct g.team_id)::int,
    min(g.scheduled_at),
    max(coalesce(g.scheduled_at,g.ended_at,g.updated_at,g.created_at)),
    coalesce(jsonb_agg(distinct nullif(trim(g.official_division_label),'')) filter (where nullif(trim(g.official_division_label),'') is not null),'[]'::jsonb),
    coalesce(jsonb_agg(distinct nullif(trim(g.venue),'')) filter (where nullif(trim(g.venue),'') is not null),'[]'::jsonb),
    coalesce((array_agg(g.series_id order by g.created_at) filter (where g.series_id is not null))[1],representative_series)
  into live_games,upcoming_games,final_games,wpi_teams,first_game,last_game,divisions_json,venues_json,representative_series
  from public.live_games g
  join public.live_teams t on t.id=g.team_id and t.active=true
  join public.live_clubs c on c.id=t.club_id and c.active=true
  where g.visibility='public_team'
    and g.game_kind='tournament'
    and g.status<>'cancelled'
    and (
      (selected_public_id is not null and nullif(trim(g.tournament_public_id),'')=selected_public_id)
      or (
        selected_public_id is null
        and lower(trim(g.tournament_name))=lower(selected_name)
        and g.competitive_season=selected_season
      )
    );

  select count(*)::int
  into total_matches
  from public.live_games g
  join public.live_teams t on t.id=g.team_id and t.active=true
  join public.live_clubs c on c.id=t.club_id and c.active=true
  where g.visibility='public_team'
    and g.game_kind='tournament'
    and g.status<>'cancelled'
    and (
      (selected_public_id is not null and nullif(trim(g.tournament_public_id),'')=selected_public_id)
      or (
        selected_public_id is null
        and lower(trim(g.tournament_name))=lower(selected_name)
        and g.competitive_season=selected_season
      )
    )
    and (division_filter is null or coalesce(g.official_division_label,'')=division_filter)
    and (requested_team_id is null or g.team_id=requested_team_id)
    and (
      status_filter='all'
      or (status_filter='live' and g.status='live')
      or (status_filter='upcoming' and g.status in ('scheduled','setup'))
      or (status_filter='final' and g.status='final')
    )
    and (
      search_term is null
      or lower(concat_ws(' ',coalesce(t.display_label,t.name),coalesce(c.display_name,c.name),g.team_name_snapshot,g.opponent_name,g.official_division_label,g.official_stage,g.official_game_number)) like '%'||search_term||'%'
    );

  select coalesce(jsonb_agg(row_data order by sort_rank, sort_time asc nulls last, sort_updated desc),'[]'::jsonb)
  into games_json
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end as sort_rank,
      case when g.status='final' then null else g.scheduled_at end as sort_time,
      g.updated_at as sort_updated,
      jsonb_build_object(
        'id',g.id,
        'teamId',g.team_id,
        'teamFamilyKey',t.canonical_wpi_team_family_key,
        'teamName',g.team_name_snapshot,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,
        'gender',t.gender,
        'squadLabel',t.squad_label,
        'organizationId',coalesce(c.canonical_wpi_club_id,c.canonical_slug,c.id::text),
        'organizationName',coalesce(nullif(trim(c.display_name),''),c.name),
        'organizationType',c.organization_type,
        'opponentName',g.opponent_name,
        'scheduledAt',g.scheduled_at,
        'startedAt',g.started_at,
        'endedAt',g.ended_at,
        'venue',g.venue,
        'status',g.status,
        'currentQuarter',g.current_quarter,
        'currentTimeRemainingSeconds',g.current_time_remaining_seconds,
        'teamScore',g.team_score,
        'opponentScore',g.opponent_score,
        'updatedAt',g.updated_at,
        'gameKind',g.game_kind,
        'tournamentName',g.tournament_name,
        'tournamentPublicId',nullif(trim(g.tournament_public_id),''),
        'competitiveSeason',g.competitive_season,
        'seriesId',g.series_id,
        'officialDivisionLabel',g.official_division_label,
        'officialStage',g.official_stage,
        'officialGameNumber',g.official_game_number,
        'teamLogoUrl',coalesce(g.team_logo_url,c.logo_url),
        'opponentLogoUrl',g.opponent_logo_url
      ) as row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id and t.active=true
    join public.live_clubs c on c.id=t.club_id and c.active=true
    where g.visibility='public_team'
      and g.game_kind='tournament'
      and g.status<>'cancelled'
      and (
        (selected_public_id is not null and nullif(trim(g.tournament_public_id),'')=selected_public_id)
        or (
          selected_public_id is null
          and lower(trim(g.tournament_name))=lower(selected_name)
          and g.competitive_season=selected_season
        )
      )
      and (division_filter is null or coalesce(g.official_division_label,'')=division_filter)
      and (requested_team_id is null or g.team_id=requested_team_id)
      and (
        status_filter='all'
        or (status_filter='live' and g.status='live')
        or (status_filter='upcoming' and g.status in ('scheduled','setup'))
        or (status_filter='final' and g.status='final')
      )
      and (
        search_term is null
        or lower(concat_ws(' ',coalesce(t.display_label,t.name),coalesce(c.display_name,c.name),g.team_name_snapshot,g.opponent_name,g.official_division_label,g.official_stage,g.official_game_number)) like '%'||search_term||'%'
      )
    order by sort_rank,
             case when g.status='final' then coalesce(g.ended_at,g.updated_at,g.created_at) end desc nulls last,
             g.scheduled_at asc nulls last,
             g.updated_at desc
    limit page_size offset page_offset
  ) game_rows;

  -- These are informational WPI-team event records, not official standings.
  select coalesce(jsonb_agg(team_data order by team_label),'[]'::jsonb)
  into teams_json
  from (
    select
      coalesce(nullif(trim(t.display_label),''),t.name) as team_label,
      jsonb_build_object(
        'teamId',t.id,
        'teamFamilyKey',t.canonical_wpi_team_family_key,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,
        'gender',t.gender,
        'squadLabel',t.squad_label,
        'organizationId',coalesce(c.canonical_wpi_club_id,c.canonical_slug,c.id::text),
        'organizationName',coalesce(nullif(trim(c.display_name),''),c.name),
        'logoUrl',c.logo_url,
        'games',count(*) filter (where g.status='final'),
        'wins',count(*) filter (where g.status='final' and coalesce(g.team_score,0)>coalesce(g.opponent_score,0)),
        'losses',count(*) filter (where g.status='final' and coalesce(g.team_score,0)<coalesce(g.opponent_score,0)),
        'ties',count(*) filter (where g.status='final' and coalesce(g.team_score,0)=coalesce(g.opponent_score,0)),
        'goalsFor',coalesce(sum(g.team_score) filter (where g.status='final'),0),
        'goalsAgainst',coalesce(sum(g.opponent_score) filter (where g.status='final'),0),
        'goalDifferential',coalesce(sum(g.team_score) filter (where g.status='final'),0)-coalesce(sum(g.opponent_score) filter (where g.status='final'),0),
        'liveGames',count(*) filter (where g.status='live'),
        'upcomingGames',count(*) filter (where g.status in ('scheduled','setup'))
      ) as team_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id and t.active=true
    join public.live_clubs c on c.id=t.club_id and c.active=true
    where g.visibility='public_team'
      and g.game_kind='tournament'
      and g.status<>'cancelled'
      and (
        (selected_public_id is not null and nullif(trim(g.tournament_public_id),'')=selected_public_id)
        or (
          selected_public_id is null
          and lower(trim(g.tournament_name))=lower(selected_name)
          and g.competitive_season=selected_season
        )
      )
    group by t.id,t.canonical_wpi_team_family_key,t.name,t.display_label,t.age_group,t.gender,t.squad_label,
             c.id,c.canonical_wpi_club_id,c.canonical_slug,c.display_name,c.name,c.logo_url
  ) team_rows;

  return jsonb_build_object(
    'found',true,
    'tournament',jsonb_build_object(
      'name',selected_name,
      'tournamentPublicId',selected_public_id,
      'competitiveSeason',selected_season,
      'firstGameAt',first_game,
      'lastGameAt',last_game,
      'venues',venues_json,
      'divisions',divisions_json,
      'representativeSeriesId',representative_series
    ),
    'summary',jsonb_build_object('liveGames',live_games,'upcomingGames',upcoming_games,'finalGames',final_games,'wpiTeams',wpi_teams),
    'games',games_json,
    'teams',teams_json,
    'page',jsonb_build_object(
      'limit',page_size,
      'offset',page_offset,
      'total',total_matches,
      'returned',jsonb_array_length(games_json),
      'hasMore',(page_offset+jsonb_array_length(games_json))<total_matches,
      'nextOffset',case when (page_offset+jsonb_array_length(games_json))<total_matches then page_offset+jsonb_array_length(games_json) else null end
    ),
    'recordPolicy','WPI team records are derived only from finalized public WPI Live games and are not official tournament standings.',
    'schedulePolicy','The schedule contains only games published through WPI Live and may not represent the complete official tournament schedule.',
    'paginationPolicy','Games are filtered on the server and returned in bounded pages of at most 100.',
    'policy','public_team_tournament_summary_only',
    'generatedAt',now()
  );
end;
$$;

revoke all on function public.live_public_tournament_v2(text,text,text,text,text,uuid,text,integer,integer) from public;
grant execute on function public.live_public_tournament_v2(text,text,text,text,text,uuid,text,integer,integer) to anon,authenticated;

comment on function public.live_public_tournament_v2(text,text,text,text,text,uuid,text,integer,integer) is
  'Server-filtered/paged public tournament center. Max game page size 100; team records remain informational, not official standings.';

-- ---------------------------------------------------------------------------
-- Platform Owner scale-readiness snapshot. Observational only: this does not
-- claim a 10,000-viewer load test has passed.
-- ---------------------------------------------------------------------------
create or replace function public.live_scale_readiness_snapshot_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  total_games bigint := 0;
  games_30d bigint := 0;
  public_games_90d bigint := 0;
  active_live_games bigint := 0;
  public_live_games bigint := 0;
  events_30d bigint := 0;
  max_tournament_games bigint := 0;
  max_tournament_teams bigint := 0;
  tournament_count bigint := 0;
  broadcast_trigger_installed boolean := false;
  scoreboard_index_installed boolean := false;
  tournament_id_index_installed boolean := false;
  tournament_name_index_installed boolean := false;
begin
  if auth.uid() is null or not public.live_is_platform_owner() then
    raise exception 'Platform Owner access required';
  end if;

  select count(*) into total_games from public.live_games;
  select count(*) into games_30d from public.live_games where created_at>=now()-interval '30 days';
  select count(*) into public_games_90d from public.live_games where visibility='public_team' and status<>'cancelled' and coalesce(scheduled_at,updated_at,created_at)>=now()-interval '90 days';
  select count(*) into active_live_games from public.live_games where status='live';
  select count(*) into public_live_games from public.live_games where visibility='public_team' and status='live';
  select count(*) into events_30d from public.live_events where created_at>=now()-interval '30 days';

  select coalesce(max(game_count),0),coalesce(max(team_count),0),count(*)
  into max_tournament_games,max_tournament_teams,tournament_count
  from (
    select
      coalesce(nullif(trim(g.tournament_public_id),''),lower(trim(g.tournament_name))) as tournament_key,
      g.competitive_season,
      count(*) as game_count,
      count(distinct g.team_id) as team_count
    from public.live_games g
    where g.visibility='public_team'
      and g.game_kind='tournament'
      and g.status<>'cancelled'
      and nullif(trim(g.tournament_name),'') is not null
      and coalesce(g.scheduled_at,g.updated_at,g.created_at)>=now()-interval '180 days'
    group by 1,2
  ) t;

  select exists(select 1 from pg_trigger where tgname='live_games_public_score_broadcast_v1' and not tgisinternal)
    into broadcast_trigger_installed;
  scoreboard_index_installed := to_regclass('public.live_games_public_scoreboard_scale_idx') is not null;
  tournament_id_index_installed := to_regclass('public.live_games_public_tournament_id_scale_idx') is not null;
  tournament_name_index_installed := to_regclass('public.live_games_public_tournament_name_scale_idx') is not null;

  return jsonb_build_object(
    'observed',jsonb_build_object(
      'totalGames',total_games,
      'gamesCreatedLast30Days',games_30d,
      'publicGamesLast90Days',public_games_90d,
      'liveGamesNow',active_live_games,
      'publicLiveGamesNow',public_live_games,
      'eventsCreatedLast30Days',events_30d,
      'recentPublicTournaments',tournament_count,
      'largestRecentPublicTournamentGames',max_tournament_games,
      'largestRecentPublicTournamentWpiTeams',max_tournament_teams
    ),
    'foundation',jsonb_build_object(
      'serverSideScoreboardPagination',true,
      'serverSideTournamentPagination',true,
      'sanitizedPublicScoreBroadcast',broadcast_trigger_installed,
      'scoreboardIndex',scoreboard_index_installed,
      'tournamentIdIndex',tournament_id_index_installed,
      'tournamentNameIndex',tournament_name_index_installed,
      'maxPublicPageSize',100
    ),
    'targets',jsonb_build_object(
      'annualGames',150000,
      'megaEventGames',6000,
      'simultaneousPublicViewers',10000,
      'eventsPerGameCeiling',250
    ),
    'loadTest',jsonb_build_object(
      'passed',false,
      'requiredBeforeMegaEvent',true,
      'note','This snapshot verifies architecture/readiness controls only. It is not a 10,000-viewer or 6,000-game load-test certification.'
    ),
    'generatedAt',now()
  );
end;
$$;

revoke all on function public.live_scale_readiness_snapshot_v1() from public,anon;
grant execute on function public.live_scale_readiness_snapshot_v1() to authenticated;

comment on function public.live_scale_readiness_snapshot_v1() is
  'Platform Owner observational scale snapshot. Does not certify mega-event load capacity.';
