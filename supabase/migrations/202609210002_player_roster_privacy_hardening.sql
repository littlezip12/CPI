-- WPI 7.64.15 — Player roster accuracy + parent privacy hardening

create or replace function public.live_is_permanent_user_v1()
returns boolean
language sql
stable
security invoker
set search_path=public
as $$
  select auth.uid() is not null
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false;
$$;

revoke all on function public.live_is_permanent_user_v1() from public,anon;
grant execute on function public.live_is_permanent_user_v1() to authenticated;

create or replace function public.live_has_detailed_analytics_access(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.live_is_permanent_user_v1()
    and (
      public.live_analytics_access_level_v1(target_team_id) in ('team_insights','organization_insights')
      or public.live_team_insights_launch_free_access_v1(target_team_id)
    );
$$;

-- Permanent-account boundary for parent/supporter PII and account-owned records.
drop policy if exists live_profiles_permanent_user_guard on public.live_profiles;
create policy live_profiles_permanent_user_guard on public.live_profiles
as restrictive for all to authenticated
using (public.live_is_permanent_user_v1())
with check (public.live_is_permanent_user_v1());

drop policy if exists live_team_follows_permanent_user_guard on public.live_team_follows;
create policy live_team_follows_permanent_user_guard on public.live_team_follows
as restrictive for select to authenticated
using (public.live_is_permanent_user_v1());

drop policy if exists live_analytics_entitlements_permanent_user_guard on public.live_analytics_entitlements;
create policy live_analytics_entitlements_permanent_user_guard on public.live_analytics_entitlements
as restrictive for all to authenticated
using (public.live_is_permanent_user_v1())
with check (public.live_is_permanent_user_v1());

drop policy if exists live_billing_customers_permanent_user_guard on public.live_billing_customers;
create policy live_billing_customers_permanent_user_guard on public.live_billing_customers
as restrictive for all to authenticated
using (public.live_is_permanent_user_v1())
with check (public.live_is_permanent_user_v1());

drop policy if exists live_billing_subscriptions_permanent_user_guard on public.live_billing_subscriptions;
create policy live_billing_subscriptions_permanent_user_guard on public.live_billing_subscriptions
as restrictive for all to authenticated
using (public.live_is_permanent_user_v1())
with check (public.live_is_permanent_user_v1());

-- Scope-aware player analytics. Player identity uses the browser-stable client_player_id
-- across roster versions; cap numbers are intentionally not returned as analytics identity.
create or replace function public.live_team_player_insights_v2(
  target_team_id uuid,
  requested_season text default null,
  requested_scope text default 'season',
  requested_scope_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  team_row public.live_teams%rowtype;
  member_role public.live_team_role;
  selected_season text;
  scope_value text := lower(trim(coalesce(requested_scope,'season')));
  scope_label text;
  scope_series_id uuid;
  scope_game_id uuid;
  scope_game_date timestamptz;
  players_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_is_permanent_user_v1() then raise exception 'Verified permanent account required'; end if;

  select * into team_row from public.live_teams where id=target_team_id and active=true;
  if team_row.id is null then raise exception 'Team not found'; end if;

  select role into member_role from public.live_team_members where team_id=team_row.id and user_id=caller;
  if not (coalesce(member_role in ('owner','admin','scorer'),false) or public.live_has_detailed_analytics_access(team_row.id)) then
    raise exception 'Detailed analytics access required';
  end if;
  if scope_value not in ('season','series','game') then raise exception 'Unsupported analytics scope'; end if;

  selected_season := nullif(trim(coalesce(requested_season,'')),'');
  if selected_season is null then
    select a.competitive_season into selected_season from public.live_game_analytics a
    where a.team_id=team_row.id and a.analytics_status='current' order by a.generated_at desc limit 1;
    selected_season := coalesce(selected_season,team_row.competitive_season);
  end if;

  if scope_value='season' then
    scope_label := coalesce(selected_season,'Season') || ' season';
  elsif scope_value='series' then
    if requested_scope_id is null then raise exception 'Series scope requires an event'; end if;
    select s.id,s.name into scope_series_id,scope_label from public.live_game_series s
    where s.id=requested_scope_id and exists(select 1 from public.live_game_analytics a where a.series_id=s.id and a.team_id=team_row.id and a.competitive_season=selected_season and a.analytics_status='current');
    if scope_series_id is null then raise exception 'Event analytics not found'; end if;
  else
    if requested_scope_id is null then raise exception 'Game scope requires a game'; end if;
    select a.game_id,g.opponent_name,coalesce(g.ended_at,g.scheduled_at,a.generated_at),a.competitive_season
      into scope_game_id,scope_label,scope_game_date,selected_season
    from public.live_game_analytics a join public.live_games g on g.id=a.game_id
    where a.game_id=requested_scope_id and a.team_id=team_row.id and a.analytics_status='current';
    if scope_game_id is null then raise exception 'Game analytics not found'; end if;
    scope_label := 'vs ' || coalesce(scope_label,'Opponent');
  end if;

  with scope_games as (
    select a.game_id,g.roster_id
    from public.live_game_analytics a join public.live_games g on g.id=a.game_id
    where a.team_id=team_row.id and a.analytics_status='current'
      and ((scope_value='season' and a.competitive_season=selected_season)
        or (scope_value='series' and a.competitive_season=selected_season and a.series_id=scope_series_id)
        or (scope_value='game' and a.game_id=scope_game_id))
  ),
  season_rosters as (
    select r.id as roster_id from public.live_rosters r
    where r.team_id=team_row.id and r.competitive_season=selected_season
  ),
  eligible_raw as (
    select p.id,p.client_player_id,p.display_name,p.roster_id,r.version_number,p.updated_at,
           coalesce(nullif(trim(p.client_player_id),''),p.id::text) as stable_key
    from public.live_players p join public.live_rosters r on r.id=p.roster_id
    where p.active=true and (
      (scope_value='season' and p.roster_id in (select roster_id from season_rosters))
      or (scope_value in ('series','game') and p.roster_id in (select roster_id from scope_games where roster_id is not null))
    )
  ),
  eligible as (
    select distinct on (stable_key) stable_key,display_name
    from eligible_raw order by stable_key,version_number desc,updated_at desc
  ),
  team_player_map as (
    select p.id,coalesce(nullif(trim(p.client_player_id),''),p.id::text) stable_key
    from public.live_players p join public.live_rosters r on r.id=p.roster_id
    where r.team_id=team_row.id and r.competitive_season=selected_season
  ),
  played_pairs as (
    select gp.game_id,m.stable_key from public.live_game_participation gp join team_player_map m on m.id=gp.player_id join scope_games sg on sg.game_id=gp.game_id where gp.status='played'
    union select e.game_id,m.stable_key from public.live_events e join team_player_map m on m.id=e.player_id join scope_games sg on sg.game_id=e.game_id where e.status='active' and e.player_id is not null
    union select e.game_id,m.stable_key from public.live_events e join team_player_map m on m.id=e.secondary_player_id join scope_games sg on sg.game_id=e.game_id where e.status='active' and e.secondary_player_id is not null
    union select l.game_id,m.stable_key from public.live_lineups l join scope_games sg on sg.game_id=l.game_id cross join lateral unnest(l.player_ids) as u(player_id) join team_player_map m on m.id=u.player_id
    union select l.game_id,m.stable_key from public.live_lineups l join scope_games sg on sg.game_id=l.game_id join team_player_map m on m.id=l.goalie_id where l.goalie_id is not null
  ),
  played_stats as (select stable_key,count(distinct game_id)::int games from played_pairs group by stable_key),
  primary_stats as (
    select m.stable_key,
      count(*) filter(where e.event_type='goal')::int goals,
      count(*) filter(where e.event_type in ('goal','shot_missed','shot_post','shot_blocked','shot_saved'))::int shots,
      count(*) filter(where e.event_type='shot_missed')::int shots_missed,
      count(*) filter(where e.event_type='shot_post')::int shots_post,
      count(*) filter(where e.event_type='shot_blocked')::int shots_blocked,
      count(*) filter(where e.event_type='shot_saved')::int shots_saved,
      count(*) filter(where e.event_type='shootout_goal')::int shootout_goals,
      count(*) filter(where e.event_type='shootout_miss')::int shootout_misses,
      count(*) filter(where e.event_type='save')::int saves,
      count(*) filter(where e.event_type='field_block')::int field_blocks,
      count(*) filter(where e.event_type='steal')::int steals,
      count(*) filter(where e.event_type='turnover')::int turnovers,
      count(*) filter(where e.event_type='exclusion_drawn')::int exclusions_drawn,
      count(*) filter(where e.event_type='exclusion_committed')::int exclusions_committed,
      count(*) filter(where e.event_type='five_meter_drawn')::int five_meters_drawn,
      count(*) filter(where e.event_type='five_meter_committed')::int five_meters_committed
    from public.live_events e join scope_games sg on sg.game_id=e.game_id join team_player_map m on m.id=e.player_id
    where e.status='active' and e.player_id is not null group by m.stable_key
  ),
  assist_stats as (
    select m.stable_key,count(*) filter(where e.event_type='goal')::int assists
    from public.live_events e join scope_games sg on sg.game_id=e.game_id join team_player_map m on m.id=e.secondary_player_id
    where e.status='active' and e.secondary_player_id is not null group by m.stable_key
  ),
  rostered_games as (
    select er.stable_key,count(distinct sg.game_id)::int rostered_games
    from eligible_raw er join scope_games sg on sg.roster_id=er.roster_id group by er.stable_key
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'playerId',e.stable_key,'name',e.display_name,'rosterStatus','Rostered for this scope',
    'games',coalesce(pg.games,0),'rosteredGames',coalesce(rg.rostered_games,0),
    'goals',coalesce(ps.goals,0),'assists',coalesce(ast.assists,0),'shots',coalesce(ps.shots,0),
    'shotsMissed',coalesce(ps.shots_missed,0),'shotsPost',coalesce(ps.shots_post,0),'shotsBlocked',coalesce(ps.shots_blocked,0),'shotsSaved',coalesce(ps.shots_saved,0),
    'shootoutGoals',coalesce(ps.shootout_goals,0),'shootoutMisses',coalesce(ps.shootout_misses,0),'saves',coalesce(ps.saves,0),'fieldBlocks',coalesce(ps.field_blocks,0),
    'steals',coalesce(ps.steals,0),'turnovers',coalesce(ps.turnovers,0),'exclusionsDrawn',coalesce(ps.exclusions_drawn,0),'exclusionsCommitted',coalesce(ps.exclusions_committed,0),
    'fiveMetersDrawn',coalesce(ps.five_meters_drawn,0),'fiveMetersCommitted',coalesce(ps.five_meters_committed,0)
  ) order by e.display_name),'[]'::jsonb) into players_json
  from eligible e left join played_stats pg on pg.stable_key=e.stable_key left join rostered_games rg on rg.stable_key=e.stable_key
  left join primary_stats ps on ps.stable_key=e.stable_key left join assist_stats ast on ast.stable_key=e.stable_key;

  return jsonb_build_object('teamId',team_row.id,'selectedSeason',selected_season,'scope',jsonb_build_object('type',scope_value,'id',case when scope_value='series' then scope_series_id when scope_value='game' then scope_game_id else null end,'label',scope_label,'gameDate',scope_game_date),'players',players_json);
end;
$$;

revoke all on function public.live_team_player_insights_v2(uuid,text,text,uuid) from public,anon;
grant execute on function public.live_team_player_insights_v2(uuid,text,text,uuid) to authenticated;

-- Existing follower RPCs now require a permanent (non-anonymous) account.

create or replace function public.live_set_team_follow_v2(
  target_team_id uuid,
  requested_follow boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  target_team public.live_teams%rowtype;
  target_club public.live_clubs%rowtype;
  existing_role public.live_team_role;
  label text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_is_permanent_user_v1() then raise exception 'Verified permanent account required'; end if;
  select * into target_team from public.live_teams where id=target_team_id and active=true;
  if target_team.id is null then raise exception 'Active WPI Live team not found'; end if;
  select * into target_club from public.live_clubs where id=target_team.club_id and active=true;
  if target_club.id is null then raise exception 'Active club not found'; end if;

  select role into existing_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  if existing_role is not null then
    delete from public.live_team_follows where user_id=caller and team_id=target_team_id;
    return jsonb_build_object('teamId',target_team_id,'following',false,'relationship','member','role',existing_role);
  end if;

  label := concat_ws(' · ',coalesce(nullif(trim(target_club.display_name),''),target_club.name),coalesce(nullif(trim(target_team.display_label),''),target_team.name));

  if coalesce(requested_follow,true) then
    insert into public.live_team_follows(user_id,team_id) values (caller,target_team_id)
    on conflict (user_id,team_id) do nothing;
    if target_team.canonical_wpi_team_family_key is not null and target_club.canonical_wpi_club_id is not null then
      insert into public.live_public_team_follows(
        user_id,canonical_wpi_team_family_key,canonical_wpi_club_id,canonical_display_name,age_group,gender,squad_label,updated_at
      ) values (
        caller,target_team.canonical_wpi_team_family_key,target_club.canonical_wpi_club_id,label,target_team.age_group,target_team.gender,target_team.squad_label,now()
      ) on conflict (user_id,canonical_wpi_team_family_key) do update set
        canonical_wpi_club_id=excluded.canonical_wpi_club_id,
        canonical_display_name=excluded.canonical_display_name,
        age_group=excluded.age_group,gender=excluded.gender,squad_label=excluded.squad_label,updated_at=now();
    end if;
  else
    delete from public.live_team_follows where user_id=caller and team_id=target_team_id;
    if target_team.canonical_wpi_team_family_key is not null then
      delete from public.live_public_team_follows
      where user_id=caller and canonical_wpi_team_family_key=target_team.canonical_wpi_team_family_key;
    end if;
  end if;

  return jsonb_build_object(
    'teamId',target_team_id,'following',coalesce(requested_follow,true),
    'relationship',case when coalesce(requested_follow,true) then 'following' else 'none' end,
    'canonicalWpiTeamFamilyKey',target_team.canonical_wpi_team_family_key
  );
end;
$$;

create or replace function public.live_following_overview_v1()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  teams_json jsonb := '[]'::jsonb;
  games_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_is_permanent_user_v1() then raise exception 'Verified permanent account required'; end if;

  select coalesce(jsonb_agg(row_data order by sort_age,sort_name),'[]'::jsonb)
  into teams_json
  from (
    select
      coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'999')::integer as sort_age,
      lower(coalesce(t.display_label,t.name)) as sort_name,
      jsonb_build_object(
        'teamId',t.id,
        'teamName',t.name,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,
        'gender',t.gender,
        'squadLabel',t.squad_label,
        'competitiveSeason',t.competitive_season,
        'clubId',t.club_id,
        'clubDisplayName',c.display_name,
        'isMember',exists(select 1 from public.live_team_members own where own.team_id=t.id and own.user_id=caller),
        'membershipRole',(select own.role from public.live_team_members own where own.team_id=t.id and own.user_id=caller),
        'isFollowing',public.live_is_team_follower(t.id),
        'canFollow',not exists(select 1 from public.live_team_members own where own.team_id=t.id and own.user_id=caller)
      ) as row_data
    from public.live_teams t
    join public.live_clubs c on c.id=t.club_id
    where t.active=true
      and c.canonical_wpi_club_id='club-lamorinda'
      and exists (
        select 1
        from public.live_team_members source_member
        join public.live_teams source_team on source_team.id=source_member.team_id
        where source_member.user_id=caller
          and source_member.role in ('scorer','viewer')
          and source_team.club_id=t.club_id
          and source_team.active=true
      )
  ) team_rows;

  select coalesce(jsonb_agg(row_data order by sort_rank,sort_time asc nulls last,sort_updated desc),'[]'::jsonb)
  into games_json
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end as sort_rank,
      g.scheduled_at as sort_time,
      g.updated_at as sort_updated,
      jsonb_build_object(
        'id',g.id,
        'teamId',g.team_id,
        'teamName',g.team_name_snapshot,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'opponentName',g.opponent_name,
        'opponentSourceName',coalesce(g.opponent_source_name,g.opponent_name),
        'scheduledAt',g.scheduled_at,
        'venue',g.venue,
        'ageGroup',g.age_group,
        'status',g.status,
        'teamScore',g.team_score,
        'opponentScore',g.opponent_score,
        'startedAt',g.started_at,
        'endedAt',g.ended_at,
        'updatedAt',g.updated_at,
        'gameKind',g.game_kind,
        'tournamentName',g.tournament_name,
        'seriesName',series.name,
        'teamLogoUrl',g.team_logo_url,
        'opponentLogoUrl',g.opponent_logo_url,
        'followingTeam',true,
        'readOnly',true
      ) as row_data
    from public.live_team_follows f
    join public.live_teams t on t.id=f.team_id
    join public.live_games g on g.team_id=t.id
    left join public.live_game_series series on series.id=g.series_id
    where f.user_id=caller
      and public.live_is_team_follower(t.id)
      and g.status<>'cancelled'
  ) game_rows;

  return jsonb_build_object('teams',teams_json,'games',games_json);
end;
$$;

-- Harden a known mutable search_path function.
alter function public.live_identity_normalize_v1(text) set search_path=public;

-- Remove unauthenticated API execution from sensitive SECURITY DEFINER RPC families.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure::text as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and (
      p.proname like 'live_create_team_invite%' or
      p.proname like 'live_create_additional_team%' or
      p.proname like 'live_create_manual_game%' or
      p.proname in ('live_assign_game_scorer_v1','live_bootstrap_workspace','live_following_overview_v1','live_set_team_follow_v2','live_team_insights_overview_v1','live_team_player_insights_v1','live_team_player_insights_v2')
    )
  loop
    execute 'revoke execute on function ' || fn.signature || ' from public, anon';
    execute 'grant execute on function ' || fn.signature || ' to authenticated';
  end loop;
end;
$$;

comment on function public.live_is_permanent_user_v1() is '7.64.15: true only for signed-in non-anonymous WPI accounts; used to isolate parent/supporter PII from guest-scoring sessions.';
comment on function public.live_team_player_insights_v2(uuid,text,text,uuid) is '7.64.15: roster-aware player analytics using stable player identity across roster versions; excludes players not rostered for the selected game/event scope and does not expose cap numbers as analytics identity.';
