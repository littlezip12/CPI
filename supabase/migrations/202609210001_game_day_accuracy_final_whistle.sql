-- WPI 7.64.11 — Game-Day Accuracy & Final Whistle
-- Explicit participation, correction-safe canonical analytics, and finalized game refresh hooks.

create table if not exists public.live_game_participation (
  game_id uuid not null references public.live_games(id) on delete cascade,
  player_id uuid not null references public.live_players(id) on delete cascade,
  status text not null check (status in ('played','dnp')),
  game_cap text,
  source text not null default 'manual',
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_id,player_id),
  constraint live_game_participation_game_cap_check check (game_cap is null or char_length(game_cap) between 1 and 3)
);

comment on table public.live_game_participation is
  'Canonical per-game participation. Separates Played with zero recorded stats from DNP and carries the game-specific cap assignment.';

create index if not exists live_game_participation_player_idx
  on public.live_game_participation(player_id,game_id);
create index if not exists live_game_participation_game_status_idx
  on public.live_game_participation(game_id,status);

alter table public.live_game_participation enable row level security;

drop policy if exists live_game_participation_read on public.live_game_participation;
create policy live_game_participation_read
  on public.live_game_participation for select to authenticated
  using (public.live_can_read_game(game_id));

drop policy if exists live_game_participation_insert on public.live_game_participation;
create policy live_game_participation_insert
  on public.live_game_participation for insert to authenticated
  with check (
    public.live_can_score_game(game_id)
    or exists (
      select 1 from public.live_games g
      join public.live_team_members m on m.team_id=g.team_id
      where g.id=game_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')
    )
  );

drop policy if exists live_game_participation_update on public.live_game_participation;
create policy live_game_participation_update
  on public.live_game_participation for update to authenticated
  using (
    public.live_can_score_game(game_id)
    or exists (
      select 1 from public.live_games g
      join public.live_team_members m on m.team_id=g.team_id
      where g.id=game_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')
    )
  )
  with check (
    public.live_can_score_game(game_id)
    or exists (
      select 1 from public.live_games g
      join public.live_team_members m on m.team_id=g.team_id
      where g.id=game_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')
    )
  );

drop policy if exists live_game_participation_delete on public.live_game_participation;
create policy live_game_participation_delete
  on public.live_game_participation for delete to authenticated
  using (
    public.live_can_score_game(game_id)
    or exists (
      select 1 from public.live_games g
      join public.live_team_members m on m.team_id=g.team_id
      where g.id=game_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')
    )
  );

grant select,insert,update,delete on public.live_game_participation to authenticated;

-- Generic backfill: any player with a recorded active event or saved lineup is known to have played.
insert into public.live_game_participation(game_id,player_id,status,game_cap,source,created_by,updated_by)
select inferred.game_id,inferred.player_id,'played',null,'inferred_existing',inferred.created_by,inferred.created_by
from (
  select distinct g.id as game_id,e.player_id,g.created_by
  from public.live_games g
  join public.live_events e on e.game_id=g.id and e.status='active' and e.player_id is not null
  union
  select distinct g.id,e.secondary_player_id,g.created_by
  from public.live_games g
  join public.live_events e on e.game_id=g.id and e.status='active' and e.secondary_player_id is not null
  union
  select distinct g.id,players.player_id,g.created_by
  from public.live_games g
  join public.live_lineups l on l.game_id=g.id
  cross join lateral unnest(l.player_ids) players(player_id)
  union
  select distinct g.id,l.goalie_id,g.created_by
  from public.live_games g
  join public.live_lineups l on l.game_id=g.id
  where l.goalie_id is not null
) inferred
where inferred.player_id is not null
on conflict (game_id,player_id) do nothing;

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
      'cap',coalesce(participation.game_cap,p.cap_number),
      'played',true,
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
    ) order by coalesce(nullif(trim(coalesce(participation.game_cap,p.cap_number)),''),'999'),p.display_name),'[]'::jsonb)
    into players_json
  from public.live_players p
  left join public.live_game_participation participation
    on participation.game_id=game_row.id and participation.player_id=p.id and participation.status='played'
  where p.id in (
    select gp.player_id from public.live_game_participation gp where gp.game_id=game_row.id and gp.status='played'
    union
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

create or replace function public.live_refresh_final_analytics_from_event_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  target_id uuid;
begin
  target_id := case when tg_op='DELETE' then old.game_id else new.game_id end;
  if exists(select 1 from public.live_games g where g.id=target_id and g.status='final') then
    perform public.live_refresh_game_analytics_internal_v1(target_id);
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.live_refresh_final_analytics_from_event_v1() from public,anon,authenticated;

drop trigger if exists live_events_refresh_final_analytics on public.live_events;
create trigger live_events_refresh_final_analytics
  after insert or update or delete on public.live_events
  for each row execute function public.live_refresh_final_analytics_from_event_v1();

create or replace function public.live_refresh_final_analytics_from_participation_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  target_id uuid;
begin
  target_id := case when tg_op='DELETE' then old.game_id else new.game_id end;
  if exists(select 1 from public.live_games g where g.id=target_id and g.status='final') then
    perform public.live_refresh_game_analytics_internal_v1(target_id);
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.live_refresh_final_analytics_from_participation_v1() from public,anon,authenticated;

drop trigger if exists live_game_participation_refresh_final_analytics on public.live_game_participation;
create trigger live_game_participation_refresh_final_analytics
  after insert or update or delete on public.live_game_participation
  for each row execute function public.live_refresh_final_analytics_from_participation_v1();

-- Rebuild already-finalized analytics using the inferred participation facts above.
do $$
declare
  game_record record;
begin
  for game_record in select id from public.live_games where status='final' loop
    perform public.live_refresh_game_analytics_internal_v1(game_record.id);
  end loop;
end $$;
