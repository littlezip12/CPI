-- WPI 7.55.2 live-scoring sandbox foundation.
-- Run in a user-owned Supabase project. This migration does not contain secrets.

create extension if not exists pgcrypto;

create type public.live_team_role as enum ('owner','admin','scorer','viewer');
create type public.live_environment as enum ('sandbox','production');
create type public.live_game_status as enum ('setup','scheduled','live','final','cancelled');
create type public.live_visibility as enum ('private_only','team_private','public_team');
create type public.live_delivery_status as enum ('pending','sent','failed','mock','suppressed');

create table public.live_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.live_team_members (
  team_id uuid not null references public.live_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.live_team_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (team_id,user_id)
);

create table public.live_rosters (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.live_teams(id) on delete cascade,
  competitive_season text not null default '2026-2027',
  label text not null default 'Active roster',
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.live_players (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.live_rosters(id) on delete cascade,
  cap_number text not null check (char_length(cap_number) between 1 and 3),
  display_name text not null check (char_length(display_name) between 1 and 100),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (roster_id,cap_number)
);

create table public.live_destinations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.live_teams(id) on delete cascade,
  provider text not null default 'groupme' check (provider in ('groupme')),
  display_name text not null,
  secret_name text not null default 'GROUPME_BOT_ID',
  enabled boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (team_id,provider)
);

create table public.live_games (
  id uuid primary key default gen_random_uuid(),
  environment public.live_environment not null default 'sandbox',
  team_id uuid not null references public.live_teams(id) on delete cascade,
  roster_id uuid references public.live_rosters(id) on delete set null,
  destination_id uuid references public.live_destinations(id) on delete set null,
  competitive_season text not null default '2026-2027',
  tournament_event_id text,
  source_game_id text,
  source_mode text not null default 'manual' check (source_mode in ('manual','tournament_sheet','tournament_override')),
  team_name_snapshot text not null,
  opponent_name text not null,
  scheduled_at timestamptz,
  venue text,
  quarter_length_seconds integer not null default 420 check (quarter_length_seconds between 180 and 900),
  status public.live_game_status not null default 'setup',
  visibility public.live_visibility not null default 'team_private',
  message_frequency text not null default 'major' check (message_frequency in ('all','major','none')),
  messages_paused boolean not null default false,
  current_quarter integer not null default 1 check (current_quarter between 1 and 9),
  current_time_remaining_seconds integer not null default 420 check (current_time_remaining_seconds between 0 and 1800),
  team_score integer not null default 0 check (team_score between 0 and 99),
  opponent_score integer not null default 0 check (opponent_score between 0 and 99),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table public.live_lineups (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.live_games(id) on delete cascade,
  quarter integer not null check (quarter between 1 and 9),
  player_ids uuid[] not null default '{}',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id,quarter),
  check (cardinality(player_ids) <= 7)
);

create table public.live_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.live_games(id) on delete cascade,
  sequence integer not null,
  event_type text not null check (event_type in (
    'goal','opponent_goal','save','field_block','steal','turnover',
    'exclusion_drawn','exclusion_committed','five_meter_drawn','five_meter_committed',
    'quarter_start','quarter_end','score_correction'
  )),
  event_label text not null,
  player_id uuid references public.live_players(id) on delete set null,
  secondary_player_id uuid references public.live_players(id) on delete set null,
  quarter integer not null check (quarter between 1 and 9),
  time_remaining_seconds integer not null check (time_remaining_seconds between 0 and 1800),
  team_score_delta integer not null default 0 check (team_score_delta between -10 and 10),
  opponent_score_delta integer not null default 0 check (opponent_score_delta between -10 and 10),
  team_score_after integer not null check (team_score_after between 0 and 99),
  opponent_score_after integer not null check (opponent_score_after between 0 and 99),
  note text check (char_length(note) <= 280),
  message_text text check (char_length(message_text) <= 1200),
  status text not null default 'active' check (status in ('active','voided')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  voided_by uuid references auth.users(id),
  voided_at timestamptz,
  unique (game_id,sequence)
);

create table public.live_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.live_events(id) on delete cascade,
  provider text not null default 'groupme' check (provider in ('groupme')),
  destination_name text,
  status public.live_delivery_status not null default 'pending',
  attempt_count integer not null default 0,
  provider_response_code integer,
  provider_response_excerpt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id,provider)
);

create or replace function public.live_is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.live_team_members
    where team_id = target_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.live_has_team_role(target_team_id uuid, allowed_roles public.live_team_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.live_team_members
    where team_id = target_team_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

grant execute on function public.live_is_team_member(uuid) to authenticated;
grant execute on function public.live_has_team_role(uuid,public.live_team_role[]) to authenticated;

create or replace function public.live_add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_team_members(team_id,user_id,role)
  values (new.id,new.owner_id,'owner')
  on conflict (team_id,user_id) do update set role='owner';
  return new;
end;
$$;

create trigger live_team_owner_membership
  after insert on public.live_teams
  for each row execute function public.live_add_owner_membership();

alter table public.live_teams enable row level security;
alter table public.live_team_members enable row level security;
alter table public.live_rosters enable row level security;
alter table public.live_players enable row level security;
alter table public.live_destinations enable row level security;
alter table public.live_games enable row level security;
alter table public.live_lineups enable row level security;
alter table public.live_events enable row level security;
alter table public.live_deliveries enable row level security;

create policy "members read teams" on public.live_teams for select to authenticated using (public.live_is_team_member(id));
create policy "users create owned teams" on public.live_teams for insert to authenticated with check (owner_id = auth.uid());
create policy "owners and admins update teams" on public.live_teams for update to authenticated using (public.live_has_team_role(id,array['owner','admin']::public.live_team_role[])) with check (public.live_has_team_role(id,array['owner','admin']::public.live_team_role[]));

create policy "members read memberships" on public.live_team_members for select to authenticated using (public.live_is_team_member(team_id));
create policy "owners and admins manage memberships" on public.live_team_members for all to authenticated using (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[])) with check (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[]));

create policy "members read rosters" on public.live_rosters for select to authenticated using (public.live_is_team_member(team_id));
create policy "scorers manage rosters" on public.live_rosters for all to authenticated using (public.live_has_team_role(team_id,array['owner','admin','scorer']::public.live_team_role[])) with check (public.live_has_team_role(team_id,array['owner','admin','scorer']::public.live_team_role[]) and created_by = auth.uid());

create policy "members read players" on public.live_players for select to authenticated using (exists (select 1 from public.live_rosters r where r.id=roster_id and public.live_is_team_member(r.team_id)));
create policy "scorers manage players" on public.live_players for all to authenticated using (exists (select 1 from public.live_rosters r where r.id=roster_id and public.live_has_team_role(r.team_id,array['owner','admin','scorer']::public.live_team_role[]))) with check (exists (select 1 from public.live_rosters r where r.id=roster_id and public.live_has_team_role(r.team_id,array['owner','admin','scorer']::public.live_team_role[])));

create policy "members read destinations" on public.live_destinations for select to authenticated using (public.live_is_team_member(team_id));
create policy "owners and admins manage destinations" on public.live_destinations for all to authenticated using (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[])) with check (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[]) and created_by = auth.uid());

create policy "members read games" on public.live_games for select to authenticated using (public.live_is_team_member(team_id));
create policy "scorers create games" on public.live_games for insert to authenticated with check (public.live_has_team_role(team_id,array['owner','admin','scorer']::public.live_team_role[]) and created_by=auth.uid());
create policy "scorers update games" on public.live_games for update to authenticated using (public.live_has_team_role(team_id,array['owner','admin','scorer']::public.live_team_role[])) with check (public.live_has_team_role(team_id,array['owner','admin','scorer']::public.live_team_role[]));

create policy "members read lineups" on public.live_lineups for select to authenticated using (exists (select 1 from public.live_games g where g.id=game_id and public.live_is_team_member(g.team_id)));
create policy "scorers manage lineups" on public.live_lineups for all to authenticated using (exists (select 1 from public.live_games g where g.id=game_id and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[]))) with check (exists (select 1 from public.live_games g where g.id=game_id and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[])) and created_by=auth.uid());

create policy "members read events" on public.live_events for select to authenticated using (exists (select 1 from public.live_games g where g.id=game_id and public.live_is_team_member(g.team_id)));
create policy "scorers create events" on public.live_events for insert to authenticated with check (exists (select 1 from public.live_games g where g.id=game_id and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[])) and created_by=auth.uid());
create policy "scorers update events" on public.live_events for update to authenticated using (exists (select 1 from public.live_games g where g.id=game_id and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[]))) with check (exists (select 1 from public.live_games g where g.id=game_id and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[])));

create policy "members read deliveries" on public.live_deliveries for select to authenticated using (exists (select 1 from public.live_events e join public.live_games g on g.id=e.game_id where e.id=event_id and public.live_is_team_member(g.team_id)));

comment on table public.live_games is 'Sandbox/production live-scoring games. Sandbox records are quarantined from rankings and official tournament results.';
comment on column public.live_destinations.secret_name is 'Name of a server-side Edge Function secret. Never store the GroupMe bot ID in this table or client code.';
