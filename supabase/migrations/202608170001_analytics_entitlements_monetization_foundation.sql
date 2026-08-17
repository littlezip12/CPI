-- WPI 7.63.0 — Analytics, Entitlements & Monetization Foundation.
-- Additive commercial/analytics foundation over authoritative WPI 7.62.6.
--
-- Goals:
--   1. Generate trusted server-derived analytics when a canonical game becomes Final.
--   2. Invalidate those analytics when a Final is reopened, then regenerate on refinal.
--   3. Separate operational team roles from analytics entitlements.
--   4. Stop ordinary followers from directly reading player events/lineups/analytics.
--   5. Add a Platform-Owner-controlled, youth-safe advertiser/campaign foundation.
--   6. Add scale-oriented indexes without rewriting the protected scoring engine.
--
-- No payment card data, CVV, home addresses, IP addresses, or ad-viewer identity is stored here.
-- No Edge Function is modified or redeployed by this release.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Analytics entitlements
-- ---------------------------------------------------------------------------
create table if not exists public.live_analytics_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_type text not null check (entitlement_type in ('team_insights','organization_insights')),
  scope_type text not null check (scope_type in ('team','organization','platform')),
  team_id uuid references public.live_teams(id) on delete cascade,
  organization_id uuid references public.live_clubs(id) on delete cascade,
  source text not null default 'platform_grant' check (source in ('platform_grant','organization_grant','future_subscription','future_billing','migration')),
  status text not null default 'active' check (status in ('active','paused','expired','revoked')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  granted_by uuid references auth.users(id) on delete set null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (
    (scope_type='team' and team_id is not null and organization_id is null and entitlement_type='team_insights')
    or (scope_type='organization' and organization_id is not null and team_id is null and entitlement_type in ('team_insights','organization_insights'))
    or (scope_type='platform' and team_id is null and organization_id is null and entitlement_type='organization_insights')
  )
);

create index if not exists live_analytics_entitlements_user_active_idx
  on public.live_analytics_entitlements(user_id,status,starts_at,ends_at);
create index if not exists live_analytics_entitlements_team_idx
  on public.live_analytics_entitlements(team_id,user_id,status)
  where team_id is not null;
create index if not exists live_analytics_entitlements_organization_idx
  on public.live_analytics_entitlements(organization_id,user_id,status)
  where organization_id is not null;

create unique index if not exists live_analytics_entitlements_active_scope_idx
  on public.live_analytics_entitlements(
    user_id,entitlement_type,scope_type,
    coalesce(team_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(organization_id,'00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status='active' and ends_at is null;

alter table public.live_analytics_entitlements enable row level security;

drop policy if exists live_analytics_entitlements_self_read on public.live_analytics_entitlements;
create policy live_analytics_entitlements_self_read
  on public.live_analytics_entitlements
  for select to authenticated
  using (user_id=auth.uid() or public.live_is_platform_owner());

drop policy if exists live_analytics_entitlements_platform_manage on public.live_analytics_entitlements;
create policy live_analytics_entitlements_platform_manage
  on public.live_analytics_entitlements
  for all to authenticated
  using (public.live_is_platform_owner())
  with check (public.live_is_platform_owner());

comment on table public.live_analytics_entitlements is
  'Analytics access is separate from operational roles. Future subscriptions/grants attach Team Insights or Organization Insights to a team, organization, or platform scope.';

create or replace function public.live_analytics_access_level_v1(target_team_id uuid)
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  target_organization uuid;
  level_value text := 'none';
begin
  if caller is null then return 'none'; end if;
  if public.live_is_platform_owner() then return 'organization_insights'; end if;

  select t.club_id into target_organization
  from public.live_teams t
  where t.id=target_team_id;

  if exists(
    select 1
    from public.live_analytics_entitlements e
    where e.user_id=caller
      and e.status='active'
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
      and e.scope_type='platform'
      and e.entitlement_type='organization_insights'
  ) then
    return 'organization_insights';
  end if;

  if target_organization is not null and exists(
    select 1
    from public.live_analytics_entitlements e
    where e.user_id=caller
      and e.status='active'
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
      and e.scope_type='organization'
      and e.organization_id=target_organization
      and e.entitlement_type='organization_insights'
  ) then
    return 'organization_insights';
  end if;

  if exists(
    select 1
    from public.live_analytics_entitlements e
    where e.user_id=caller
      and e.status='active'
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
      and (
        (e.scope_type='team' and e.team_id=target_team_id and e.entitlement_type='team_insights')
        or (e.scope_type='organization' and e.organization_id=target_organization and e.entitlement_type='team_insights')
      )
  ) then
    level_value := 'team_insights';
  end if;

  return level_value;
end;
$$;

revoke all on function public.live_analytics_access_level_v1(uuid) from public,anon;
grant execute on function public.live_analytics_access_level_v1(uuid) to authenticated;

create or replace function public.live_has_detailed_analytics_access(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.live_analytics_access_level_v1(target_team_id) in ('team_insights','organization_insights');
$$;

revoke all on function public.live_has_detailed_analytics_access(uuid) from public,anon;
grant execute on function public.live_has_detailed_analytics_access(uuid) to authenticated;

-- Seed the current Platform Owner with an explicit platform-wide entitlement.
-- live_is_platform_owner() continues to be the authority; this row makes the
-- commercial entitlement state explicit for future admin/subscription tooling.
insert into public.live_analytics_entitlements(
  user_id,entitlement_type,scope_type,source,status,starts_at,granted_by,note
)
select
  m.user_id,'organization_insights','platform','migration','active',now(),m.user_id,
  'WPI 7.63.0 Platform Owner bootstrap entitlement'
from public.live_team_members m
where m.role='owner'
order by m.created_at asc,m.user_id asc
limit 1
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Trusted finalized-game analytics
-- ---------------------------------------------------------------------------
create table if not exists public.live_game_analytics (
  game_id uuid primary key references public.live_games(id) on delete cascade,
  team_id uuid not null references public.live_teams(id) on delete cascade,
  organization_id uuid references public.live_clubs(id) on delete set null,
  series_id uuid references public.live_game_series(id) on delete set null,
  competitive_season text not null,
  analytics_version integer not null default 1,
  revision integer not null default 1,
  analytics_status text not null default 'current' check (analytics_status in ('current','invalidated')),
  source_event_count integer not null default 0,
  source_last_event_at timestamptz,
  final_team_score numeric(5,1) not null default 0,
  final_opponent_score numeric(5,1) not null default 0,
  result text not null check (result in ('win','loss','tie')),
  team_totals jsonb not null default '{}'::jsonb,
  period_totals jsonb not null default '[]'::jsonb,
  player_totals jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  invalidated_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists live_game_analytics_team_season_idx
  on public.live_game_analytics(team_id,competitive_season,analytics_status,generated_at desc);
create index if not exists live_game_analytics_series_idx
  on public.live_game_analytics(series_id,analytics_status,generated_at desc)
  where series_id is not null;
create index if not exists live_game_analytics_organization_idx
  on public.live_game_analytics(organization_id,competitive_season,analytics_status,generated_at desc)
  where organization_id is not null;

-- Per-game analytics remains inexpensive at pilot scale and stays efficient as
-- the raw event table grows because every aggregate starts from game_id.
create index if not exists live_events_game_active_type_player_idx
  on public.live_events(game_id,event_type,player_id)
  where status='active';
create index if not exists live_events_game_active_secondary_type_idx
  on public.live_events(game_id,secondary_player_id,event_type)
  where status='active' and secondary_player_id is not null;
create index if not exists live_games_team_season_final_idx
  on public.live_games(team_id,competitive_season,ended_at desc)
  where status='final';

alter table public.live_game_analytics enable row level security;

drop policy if exists live_game_analytics_entitled_read on public.live_game_analytics;
create policy live_game_analytics_entitled_read
  on public.live_game_analytics
  for select to authenticated
  using (
    public.live_is_team_member(team_id)
    or public.live_has_detailed_analytics_access(team_id)
  );

comment on table public.live_game_analytics is
  'Trusted server-derived analytics for finalized canonical WPI Live games. Raw live_events remain the durable source of truth.';

create or replace function public.live_refresh_game_analytics_internal_v1(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  game_row public.live_games%rowtype;
  team_row public.live_teams%rowtype;
  event_count integer := 0;
  last_event timestamptz;
  event_counts jsonb := '{}'::jsonb;
  periods_json jsonb := '[]'::jsonb;
  players_json jsonb := '[]'::jsonb;
  totals_json jsonb := '{}'::jsonb;
  result_value text := 'tie';
begin
  select * into game_row from public.live_games where id=target_game_id;
  if game_row.id is null then return; end if;
  if game_row.status <> 'final' then return; end if;

  select * into team_row from public.live_teams where id=game_row.team_id;

  select count(*)::int,max(e.created_at)
    into event_count,last_event
  from public.live_events e
  where e.game_id=game_row.id and e.status='active';

  select coalesce(jsonb_object_agg(rows.event_type,rows.event_count),'{}'::jsonb)
    into event_counts
  from (
    select e.event_type,count(*)::int as event_count
    from public.live_events e
    where e.game_id=game_row.id and e.status='active'
    group by e.event_type
    order by e.event_type
  ) rows;

  totals_json := jsonb_build_object(
    'goals',coalesce((event_counts->>'goal')::int,0),
    'shootoutGoals',coalesce((event_counts->>'shootout_goal')::int,0),
    'shots',
      coalesce((event_counts->>'goal')::int,0)
      + coalesce((event_counts->>'shot_missed')::int,0)
      + coalesce((event_counts->>'shot_post')::int,0)
      + coalesce((event_counts->>'shot_blocked')::int,0)
      + coalesce((event_counts->>'shot_saved')::int,0),
    'saves',coalesce((event_counts->>'save')::int,0),
    'fieldBlocks',coalesce((event_counts->>'field_block')::int,0),
    'steals',coalesce((event_counts->>'steal')::int,0),
    'turnovers',coalesce((event_counts->>'turnover')::int,0),
    'exclusionsDrawn',coalesce((event_counts->>'exclusion_drawn')::int,0),
    'exclusionsCommitted',coalesce((event_counts->>'exclusion_committed')::int,0),
    'fiveMetersDrawn',coalesce((event_counts->>'five_meter_drawn')::int,0),
    'fiveMetersCommitted',coalesce((event_counts->>'five_meter_committed')::int,0),
    'opponentGoalsRecorded',coalesce((event_counts->>'opponent_goal')::int,0),
    'activeEvents',event_count,
    'eventCounts',event_counts
  );

  select coalesce(jsonb_agg(jsonb_build_object(
      'quarter',period_row.quarter,
      'periodLabel',coalesce(period_row.period_label,'Q' || period_row.quarter::text),
      'teamScore',period_row.team_score_after,
      'opponentScore',period_row.opponent_score_after
    ) order by period_row.quarter),'[]'::jsonb)
    into periods_json
  from (
    select distinct on (e.quarter)
      e.quarter,l.period_label,e.team_score_after,e.opponent_score_after
    from public.live_events e
    left join public.live_lineups l on l.game_id=e.game_id and l.quarter=e.quarter
    where e.game_id=game_row.id and e.status='active'
    order by e.quarter,e.sequence desc,e.created_at desc
  ) period_row;

  select coalesce(jsonb_agg(jsonb_build_object(
      'playerId',p.id,
      'name',p.display_name,
      'cap',p.cap_number,
      'goals',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type in ('goal','shootout_goal')),
      'assists',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.secondary_player_id=p.id and e.event_type='goal'),
      'shots',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type in ('goal','shot_missed','shot_post','shot_blocked','shot_saved')),
      'saves',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='save'),
      'fieldBlocks',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='field_block'),
      'steals',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='steal'),
      'turnovers',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='turnover'),
      'exclusionsDrawn',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='exclusion_drawn'),
      'exclusionsCommitted',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='exclusion_committed'),
      'fiveMetersDrawn',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='five_meter_drawn'),
      'fiveMetersCommitted',(select count(*)::int from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='five_meter_committed')
    ) order by coalesce(nullif(trim(p.cap_number),''),'999'),p.display_name),'[]'::jsonb)
    into players_json
  from public.live_players p
  where p.id in (
    select e.player_id from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id is not null
    union
    select e.secondary_player_id from public.live_events e where e.game_id=game_row.id and e.status='active' and e.secondary_player_id is not null
    union
    select unnest(l.player_ids) from public.live_lineups l where l.game_id=game_row.id
    union
    select l.goalie_id from public.live_lineups l where l.game_id=game_row.id and l.goalie_id is not null
  );

  result_value := case
    when game_row.team_score > game_row.opponent_score then 'win'
    when game_row.team_score < game_row.opponent_score then 'loss'
    else 'tie'
  end;

  insert into public.live_game_analytics(
    game_id,team_id,organization_id,series_id,competitive_season,
    analytics_version,revision,analytics_status,source_event_count,source_last_event_at,
    final_team_score,final_opponent_score,result,team_totals,period_totals,player_totals,
    generated_at,invalidated_at,updated_at
  ) values (
    game_row.id,game_row.team_id,team_row.club_id,game_row.series_id,game_row.competitive_season,
    1,1,'current',event_count,last_event,
    game_row.team_score,game_row.opponent_score,result_value,totals_json,periods_json,players_json,
    now(),null,now()
  )
  on conflict (game_id) do update
  set team_id=excluded.team_id,
      organization_id=excluded.organization_id,
      series_id=excluded.series_id,
      competitive_season=excluded.competitive_season,
      analytics_version=excluded.analytics_version,
      revision=public.live_game_analytics.revision+1,
      analytics_status='current',
      source_event_count=excluded.source_event_count,
      source_last_event_at=excluded.source_last_event_at,
      final_team_score=excluded.final_team_score,
      final_opponent_score=excluded.final_opponent_score,
      result=excluded.result,
      team_totals=excluded.team_totals,
      period_totals=excluded.period_totals,
      player_totals=excluded.player_totals,
      generated_at=now(),
      invalidated_at=null,
      updated_at=now();
end;
$$;

revoke all on function public.live_refresh_game_analytics_internal_v1(uuid) from public,anon,authenticated;

create or replace function public.live_game_analytics_status_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_op='INSERT' then
    if new.status='final' then
      perform public.live_refresh_game_analytics_internal_v1(new.id);
    end if;
  elsif tg_op='UPDATE' then
    if new.status='final' and old.status is distinct from 'final' then
      perform public.live_refresh_game_analytics_internal_v1(new.id);
    elsif old.status='final' and new.status is distinct from 'final' then
      update public.live_game_analytics
      set analytics_status='invalidated',invalidated_at=now(),updated_at=now()
      where game_id=new.id;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.live_game_analytics_status_trigger_v1() from public,anon,authenticated;

drop trigger if exists live_games_analytics_status_trigger on public.live_games;
create trigger live_games_analytics_status_trigger
  after insert or update of status on public.live_games
  for each row execute function public.live_game_analytics_status_trigger_v1();

-- Backfill trusted analytics for any existing finalized games.
do $$
declare
  game_record record;
begin
  for game_record in select id from public.live_games where status='final' loop
    perform public.live_refresh_game_analytics_internal_v1(game_record.id);
  end loop;
end $$;

create or replace function public.live_game_analytics_detail_v1(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  analytics_row public.live_game_analytics%rowtype;
  game_team_id uuid;
  access_level text;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select team_id into game_team_id from public.live_games where id=target_game_id;
  if game_team_id is null then raise exception 'Game not found'; end if;

  access_level := public.live_analytics_access_level_v1(game_team_id);
  if not public.live_is_team_member(game_team_id) and access_level='none' then
    raise exception 'Team Insights or Organization Insights access required';
  end if;

  select * into analytics_row from public.live_game_analytics where game_id=target_game_id;
  if analytics_row.game_id is null then
    return jsonb_build_object('gameId',target_game_id,'status','not_generated','accessLevel',access_level);
  end if;

  return jsonb_build_object(
    'gameId',analytics_row.game_id,
    'teamId',analytics_row.team_id,
    'organizationId',analytics_row.organization_id,
    'seriesId',analytics_row.series_id,
    'competitiveSeason',analytics_row.competitive_season,
    'analyticsVersion',analytics_row.analytics_version,
    'revision',analytics_row.revision,
    'status',analytics_row.analytics_status,
    'sourceEventCount',analytics_row.source_event_count,
    'sourceLastEventAt',analytics_row.source_last_event_at,
    'teamScore',analytics_row.final_team_score,
    'opponentScore',analytics_row.final_opponent_score,
    'result',analytics_row.result,
    'teamTotals',analytics_row.team_totals,
    'periodTotals',analytics_row.period_totals,
    'playerTotals',analytics_row.player_totals,
    'generatedAt',analytics_row.generated_at,
    'invalidatedAt',analytics_row.invalidated_at,
    'accessLevel',access_level
  );
end;
$$;

revoke all on function public.live_game_analytics_detail_v1(uuid) from public,anon;
grant execute on function public.live_game_analytics_detail_v1(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Follower privacy boundary
-- ---------------------------------------------------------------------------
-- Followers still receive game/result access through WPI's follower RPCs, but
-- raw player events, lineups and browser-generated analytics are not directly
-- selectable merely because a user follows the team. Entitled analytics users
-- receive detail through security-definer analytics/recap RPCs.

drop policy if exists "game participants and followers read events" on public.live_events;
drop policy if exists "game participants read events" on public.live_events;
drop policy if exists live_events_member_read on public.live_events;
create policy live_events_member_read
  on public.live_events
  for select to authenticated
  using (
    exists(
      select 1 from public.live_games g
      where g.id=live_events.game_id
        and public.live_is_team_member(g.team_id)
    )
  );

drop policy if exists "game participants and followers read lineups" on public.live_lineups;
drop policy if exists "game participants read lineups" on public.live_lineups;
drop policy if exists live_lineups_member_read on public.live_lineups;
create policy live_lineups_member_read
  on public.live_lineups
  for select to authenticated
  using (
    exists(
      select 1 from public.live_games g
      where g.id=live_lineups.game_id
        and public.live_is_team_member(g.team_id)
    )
  );

drop policy if exists "game participants and followers read recaps" on public.live_game_recaps;
drop policy if exists "game participants read recaps" on public.live_game_recaps;
drop policy if exists "members read recaps" on public.live_game_recaps;
drop policy if exists live_game_recaps_member_read on public.live_game_recaps;
create policy live_game_recaps_member_read
  on public.live_game_recaps
  for select to authenticated
  using (
    exists(
      select 1 from public.live_games g
      where g.id=live_game_recaps.game_id
        and public.live_is_team_member(g.team_id)
    )
  );

-- Replace the current recap RPC with a compatibility-preserving privacy-aware
-- response. Team members and entitled users receive full detail. Ordinary
-- followers receive game/series/period result context only; player analytics,
-- lineups, timeline events and recap text/analytics are not returned.
create or replace function public.live_game_recap_detail_v1(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  series_row public.live_game_series%rowtype;
  member_role public.live_team_role;
  recap_row public.live_game_recaps%rowtype;
  events_json jsonb := '[]'::jsonb;
  lineups_json jsonb := '[]'::jsonb;
  periods_json jsonb := '[]'::jsonb;
  stats_json jsonb := '[]'::jsonb;
  delivery_json jsonb := null;
  is_manager boolean := false;
  is_follower boolean := false;
  entitlement_level text := 'none';
  can_view_detail boolean := false;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into game_row from public.live_games where id=target_game_id;
  if game_row.id is null then raise exception 'Game not found'; end if;
  if not public.live_can_view_game(game_row.id) then raise exception 'Game access required'; end if;

  select role into member_role from public.live_team_members where team_id=game_row.team_id and user_id=caller;
  is_manager := member_role in ('owner','admin');
  is_follower := member_role is null and public.live_is_team_follower(game_row.team_id);
  entitlement_level := public.live_analytics_access_level_v1(game_row.team_id);
  can_view_detail := member_role is not null or entitlement_level in ('team_insights','organization_insights');

  if game_row.series_id is not null then
    select * into series_row from public.live_game_series where id=game_row.series_id;
  end if;
  select * into recap_row from public.live_game_recaps where game_id=game_row.id;

  if can_view_detail then
    select coalesce(jsonb_agg(jsonb_build_object(
        'id',e.id,
        'sequence',e.sequence,
        'eventType',e.event_type,
        'eventLabel',e.event_label,
        'quarter',e.quarter,
        'phase',e.phase,
        'timeRemainingSeconds',e.time_remaining_seconds,
        'teamScoreAfter',e.team_score_after,
        'opponentScoreAfter',e.opponent_score_after,
        'playerId',e.player_id,
        'playerName',p.display_name,
        'playerCap',p.cap_number,
        'secondaryPlayerId',e.secondary_player_id,
        'secondaryPlayerName',sp.display_name,
        'secondaryPlayerCap',sp.cap_number,
        'note',e.note,
        'metrics',e.metrics,
        'createdAt',e.created_at
      ) order by e.sequence),'[]'::jsonb)
    into events_json
    from public.live_events e
    left join public.live_players p on p.id=e.player_id
    left join public.live_players sp on sp.id=e.secondary_player_id
    where e.game_id=game_row.id and e.status='active';

    select coalesce(jsonb_agg(jsonb_build_object(
        'quarter',l.quarter,
        'periodLabel',coalesce(l.period_label,'Q' || l.quarter::text),
        'goalieId',l.goalie_id,
        'goalieName',gp.display_name,
        'goalieCap',gp.cap_number,
        'players',coalesce(players.player_rows,'[]'::jsonb)
      ) order by l.quarter),'[]'::jsonb)
    into lineups_json
    from public.live_lineups l
    left join public.live_players gp on gp.id=l.goalie_id
    left join lateral (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',lp.id,'name',lp.display_name,'cap',lp.cap_number
      ) order by ids.ordinality),'[]'::jsonb) as player_rows
      from unnest(l.player_ids) with ordinality ids(player_id,ordinality)
      join public.live_players lp on lp.id=ids.player_id
    ) players on true
    where l.game_id=game_row.id;

    select coalesce(jsonb_agg(jsonb_build_object(
        'playerId',p.id,
        'name',p.display_name,
        'cap',p.cap_number,
        'goals',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type in ('goal','shootout_goal')),
        'assists',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.secondary_player_id=p.id and e.event_type='goal'),
        'saves',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='save'),
        'steals',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='steal'),
        'turnovers',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='turnover'),
        'exclusionsDrawn',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='exclusion_drawn'),
        'exclusionsCommitted',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='exclusion_committed'),
        'fiveMetersDrawn',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='five_meter_drawn'),
        'fiveMetersCommitted',(select count(*) from public.live_events e where e.game_id=game_row.id and e.status='active' and e.player_id=p.id and e.event_type='five_meter_committed')
      ) order by coalesce(nullif(trim(p.cap_number),''),'999'),p.display_name),'[]'::jsonb)
    into stats_json
    from public.live_players p
    where p.id in (
      select e.player_id from public.live_events e where e.game_id=game_row.id and e.player_id is not null
      union
      select e.secondary_player_id from public.live_events e where e.game_id=game_row.id and e.secondary_player_id is not null
      union
      select unnest(l.player_ids) from public.live_lineups l where l.game_id=game_row.id
      union
      select l.goalie_id from public.live_lineups l where l.game_id=game_row.id and l.goalie_id is not null
    );
  end if;

  -- Team-only period score progression is safe for free followers.
  select coalesce(jsonb_agg(jsonb_build_object(
      'quarter',period_row.quarter,
      'periodLabel',coalesce(period_row.period_label,'Q' || period_row.quarter::text),
      'teamScore',period_row.team_score_after,
      'opponentScore',period_row.opponent_score_after
    ) order by period_row.quarter),'[]'::jsonb)
  into periods_json
  from (
    select distinct on (e.quarter)
      e.quarter,l.period_label,e.team_score_after,e.opponent_score_after
    from public.live_events e
    left join public.live_lineups l on l.game_id=e.game_id and l.quarter=e.quarter
    where e.game_id=game_row.id and e.status='active'
    order by e.quarter,e.sequence desc,e.created_at desc
  ) period_row;

  if is_manager then
    select jsonb_build_object(
      'sent',count(*) filter (where d.status='sent'),
      'failed',count(*) filter (where d.status='failed'),
      'pending',count(*) filter (where d.status='pending'),
      'suppressed',count(*) filter (where d.status='suppressed')
    )
    into delivery_json
    from public.live_deliveries d
    join public.live_events e on e.id=d.event_id
    where e.game_id=game_row.id;
  end if;

  return jsonb_build_object(
    'game',jsonb_build_object(
      'id',game_row.id,
      'teamId',game_row.team_id,
      'rosterId',case when can_view_detail then game_row.roster_id else null end,
      'teamName',game_row.team_name_snapshot,
      'opponentName',game_row.opponent_name,
      'scheduledAt',game_row.scheduled_at,
      'startedAt',game_row.started_at,
      'endedAt',game_row.ended_at,
      'venue',game_row.venue,
      'status',game_row.status,
      'teamScore',game_row.team_score,
      'opponentScore',game_row.opponent_score,
      'competitiveSeason',game_row.competitive_season,
      'gameKind',game_row.game_kind,
      'teamLogoUrl',game_row.team_logo_url,
      'opponentLogoUrl',game_row.opponent_logo_url,
      'officialDivisionLabel',game_row.official_division_label,
      'officialStage',game_row.official_stage,
      'officialGameNumber',game_row.official_game_number,
      'reconciliationStatus',game_row.reconciliation_status
    ),
    'series',case when series_row.id is null then null else jsonb_build_object(
      'id',series_row.id,
      'seriesType',series_row.series_type,
      'name',series_row.name,
      'competitiveSeason',series_row.competitive_season,
      'tournamentPublicId',series_row.tournament_public_id,
      'creationSource',series_row.creation_source
    ) end,
    'recap',case when recap_row.game_id is null then null else jsonb_build_object(
      'selectedStyle',case when can_view_detail then recap_row.selected_style else null end,
      'approvedText',case when can_view_detail then recap_row.approved_text else null end,
      'straightText',case when can_view_detail then recap_row.straight_text else null end,
      'analyticsSnapshot',case when can_view_detail then recap_row.analytics_snapshot else '{}'::jsonb end,
      'approvedAt',case when can_view_detail then recap_row.approved_at else null end,
      'updatedAt',recap_row.updated_at
    ) end,
    'periods',periods_json,
    'lineups',lineups_json,
    'events',events_json,
    'playerStats',stats_json,
    'deliveryAudit',delivery_json,
    'viewer',jsonb_build_object(
      'role',member_role,
      'isFollower',is_follower,
      'canManage',is_manager,
      'analyticsLevel',entitlement_level,
      'hasDetailedAnalytics',can_view_detail,
      'detailAccessReason',case
        when member_role is not null then 'team_role'
        when entitlement_level <> 'none' then 'entitlement'
        else 'supporter_free'
      end
    )
  );
end;
$$;

revoke all on function public.live_game_recap_detail_v1(uuid) from public,anon;
grant execute on function public.live_game_recap_detail_v1(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Youth-safe commercial / advertising data foundation
-- ---------------------------------------------------------------------------
create table if not exists public.live_advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  advertiser_type text not null default 'direct' check (advertiser_type in ('direct','house')),
  category text,
  website_url text,
  status text not null default 'pending' check (status in ('pending','approved','suspended','rejected')),
  youth_safe_approved boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status='approved' and youth_safe_approved and approved_at is not null) or status<>'approved')
);

create table if not exists public.live_ad_creatives (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.live_advertisers(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  creative_format text not null check (creative_format in ('banner','interstitial','presenting')),
  asset_url text,
  headline text check (char_length(headline) <= 180),
  body_text text check (char_length(body_text) <= 500),
  cta text check (char_length(cta) <= 80),
  destination_url text,
  status text not null default 'pending' check (status in ('pending','approved','paused','rejected')),
  youth_safe_approved boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status='approved' and youth_safe_approved and approved_at is not null) or status<>'approved')
);

create table if not exists public.live_ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.live_advertisers(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 180),
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','completed','cancelled')),
  start_at timestamptz,
  end_at timestamptz,
  priority integer not null default 50 check (priority between 0 and 1000),
  exclusive boolean not null default false,
  share_of_voice numeric(5,2) not null default 100 check (share_of_voice > 0 and share_of_voice <= 100),
  placements text[] not null default '{}',
  scope_type text not null default 'platform' check (scope_type in ('platform','region','organization','team','tournament','weekend','game')),
  scope_region text,
  organization_id uuid references public.live_clubs(id) on delete cascade,
  team_id uuid references public.live_teams(id) on delete cascade,
  series_id uuid references public.live_game_series(id) on delete cascade,
  game_id uuid references public.live_games(id) on delete cascade,
  tournament_public_id text,
  event_tier text not null default 'standard' check (event_tier in ('friendly','local','standard','major','flagship')),
  commercial_model text not null default 'flat' check (commercial_model in ('flat','cpm','monthly','takeover','house')),
  contract_value_cents bigint check (contract_value_cents is null or contract_value_cents >= 0),
  currency text not null default 'USD' check (char_length(currency)=3),
  payment_status text not null default 'not_applicable' check (payment_status in ('not_applicable','quoted','invoiced','paid','waived','refunded','past_due')),
  impression_cap bigint check (impression_cap is null or impression_cap > 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at > start_at),
  check (
    (scope_type='platform' and scope_region is null and organization_id is null and team_id is null and series_id is null and game_id is null and tournament_public_id is null)
    or (scope_type='region' and nullif(trim(coalesce(scope_region,'')),'') is not null and organization_id is null and team_id is null and series_id is null and game_id is null and tournament_public_id is null)
    or (scope_type='organization' and organization_id is not null and team_id is null and series_id is null and game_id is null and tournament_public_id is null)
    or (scope_type='team' and team_id is not null and series_id is null and game_id is null and tournament_public_id is null)
    or (scope_type='tournament' and nullif(trim(coalesce(tournament_public_id,'')),'') is not null and series_id is null and game_id is null)
    or (scope_type='weekend' and series_id is not null and game_id is null)
    or (scope_type='game' and game_id is not null)
  )
);

create table if not exists public.live_ad_campaign_creatives (
  campaign_id uuid not null references public.live_ad_campaigns(id) on delete cascade,
  creative_id uuid not null references public.live_ad_creatives(id) on delete cascade,
  weight integer not null default 1 check (weight between 1 and 1000),
  created_at timestamptz not null default now(),
  primary key (campaign_id,creative_id)
);

-- No public/client write function is exposed in 7.63.0. This table is the
-- private accounting foundation for a future asynchronous/validated collector.
-- It intentionally contains no viewer user_id, email, address, card data or IP.
create table if not exists public.live_ad_delivery_events (
  id bigint generated always as identity primary key,
  client_event_id uuid unique,
  event_type text not null check (event_type in ('impression','click')),
  campaign_id uuid not null references public.live_ad_campaigns(id) on delete cascade,
  creative_id uuid references public.live_ad_creatives(id) on delete set null,
  placement text not null,
  game_id uuid references public.live_games(id) on delete set null,
  series_id uuid references public.live_game_series(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists live_ad_campaigns_status_dates_idx
  on public.live_ad_campaigns(status,start_at,end_at,priority desc);
create index if not exists live_ad_campaigns_team_idx
  on public.live_ad_campaigns(team_id,status,start_at,end_at)
  where team_id is not null;
create index if not exists live_ad_campaigns_organization_idx
  on public.live_ad_campaigns(organization_id,status,start_at,end_at)
  where organization_id is not null;
create index if not exists live_ad_campaigns_series_idx
  on public.live_ad_campaigns(series_id,status,start_at,end_at)
  where series_id is not null;
create index if not exists live_ad_delivery_campaign_time_idx
  on public.live_ad_delivery_events(campaign_id,occurred_at desc);
create index if not exists live_ad_delivery_game_time_idx
  on public.live_ad_delivery_events(game_id,occurred_at desc)
  where game_id is not null;

alter table public.live_advertisers enable row level security;
alter table public.live_ad_creatives enable row level security;
alter table public.live_ad_campaigns enable row level security;
alter table public.live_ad_campaign_creatives enable row level security;
alter table public.live_ad_delivery_events enable row level security;

drop policy if exists live_advertisers_platform_owner_only on public.live_advertisers;
drop policy if exists live_ad_creatives_platform_owner_only on public.live_ad_creatives;
drop policy if exists live_ad_campaigns_platform_owner_only on public.live_ad_campaigns;
drop policy if exists live_ad_campaign_creatives_platform_owner_only on public.live_ad_campaign_creatives;
drop policy if exists live_ad_delivery_events_platform_owner_only on public.live_ad_delivery_events;

create policy live_advertisers_platform_owner_only on public.live_advertisers
  for all to authenticated using (public.live_is_platform_owner()) with check (public.live_is_platform_owner());
create policy live_ad_creatives_platform_owner_only on public.live_ad_creatives
  for all to authenticated using (public.live_is_platform_owner()) with check (public.live_is_platform_owner());
create policy live_ad_campaigns_platform_owner_only on public.live_ad_campaigns
  for all to authenticated using (public.live_is_platform_owner()) with check (public.live_is_platform_owner());
create policy live_ad_campaign_creatives_platform_owner_only on public.live_ad_campaign_creatives
  for all to authenticated using (public.live_is_platform_owner()) with check (public.live_is_platform_owner());
create policy live_ad_delivery_events_platform_owner_only on public.live_ad_delivery_events
  for all to authenticated using (public.live_is_platform_owner()) with check (public.live_is_platform_owner());

comment on table public.live_advertisers is
  'Platform-Owner-approved advertiser whitelist. Youth-facing ads must come only from explicitly approved advertisers.';
comment on table public.live_ad_creatives is
  'Platform-Owner-approved creative whitelist. Approval is per creative, not merely per advertiser.';
comment on table public.live_ad_campaigns is
  'Commercial campaign rules supporting platform/region/organization/team/tournament/weekend/game scope, exclusivity, share of voice, pricing and payment status.';
comment on table public.live_ad_delivery_events is
  'Privacy-minimized ad accounting events. No viewer PII is stored in this table.';

create or replace function public.live_validate_ad_campaign_activation_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  advertiser_ok boolean := false;
  approved_creative_count integer := 0;
begin
  if new.status not in ('scheduled','active') then return new; end if;

  select (a.status='approved' and a.youth_safe_approved)
  into advertiser_ok
  from public.live_advertisers a
  where a.id=new.advertiser_id;

  if coalesce(advertiser_ok,false)=false then
    raise exception 'Campaign cannot activate until advertiser is WPI-approved and youth-safe';
  end if;

  select count(*)::int into approved_creative_count
  from public.live_ad_campaign_creatives cc
  join public.live_ad_creatives c on c.id=cc.creative_id
  where cc.campaign_id=new.id
    and c.advertiser_id=new.advertiser_id
    and c.status='approved'
    and c.youth_safe_approved;

  if approved_creative_count=0 then
    raise exception 'Campaign cannot activate until at least one WPI-approved youth-safe creative is attached';
  end if;

  return new;
end;
$$;

revoke all on function public.live_validate_ad_campaign_activation_v1() from public,anon,authenticated;

drop trigger if exists live_ad_campaign_activation_guard on public.live_ad_campaigns;
create trigger live_ad_campaign_activation_guard
  before insert or update of status,advertiser_id on public.live_ad_campaigns
  for each row execute function public.live_validate_ad_campaign_activation_v1();

create or replace function public.live_platform_ad_campaign_reporting_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  rows_json jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.live_is_platform_owner() then raise exception 'Platform Owner access required'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'campaignId',c.id,
    'campaignName',c.name,
    'advertiserId',a.id,
    'advertiserName',a.name,
    'status',c.status,
    'scopeType',c.scope_type,
    'eventTier',c.event_tier,
    'exclusive',c.exclusive,
    'shareOfVoice',c.share_of_voice,
    'commercialModel',c.commercial_model,
    'contractValueCents',c.contract_value_cents,
    'currency',c.currency,
    'paymentStatus',c.payment_status,
    'impressions',coalesce(metrics.impressions,0),
    'clicks',coalesce(metrics.clicks,0),
    'startAt',c.start_at,
    'endAt',c.end_at
  ) order by c.created_at desc),'[]'::jsonb)
  into rows_json
  from public.live_ad_campaigns c
  join public.live_advertisers a on a.id=c.advertiser_id
  left join lateral (
    select
      count(*) filter (where e.event_type='impression')::bigint as impressions,
      count(*) filter (where e.event_type='click')::bigint as clicks
    from public.live_ad_delivery_events e
    where e.campaign_id=c.id
  ) metrics on true;

  return jsonb_build_object('generatedAt',now(),'campaigns',rows_json);
end;
$$;

revoke all on function public.live_platform_ad_campaign_reporting_v1() from public,anon;
grant execute on function public.live_platform_ad_campaign_reporting_v1() to authenticated;

-- ---------------------------------------------------------------------------
-- Release metadata / explicit privacy notes
-- ---------------------------------------------------------------------------
comment on function public.live_game_analytics_detail_v1(uuid) is
  'Entitlement-aware trusted game analytics. Ordinary followers do not receive player-level analytics.';
comment on function public.live_game_recap_detail_v1(uuid) is
  'Privacy-aware recap RPC: free followers get result context only; team members and entitled users receive detailed player/timeline data.';
