-- WPI 7.56.1 complete connected live backend setup.
-- Run once in a new team-owned Supabase project SQL Editor.
-- Contains schema, role policies, invite-only registration, realtime, permanent game storage, and audit-safe upserts.
-- Contains no API secrets or GroupMe credentials.

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

-- WPI 7.56.1 connected live backend foundation.
-- Apply after 202608040001_live_scoring_sandbox.sql in a team-owned Supabase project.
-- This migration contains no passwords, GroupMe bot IDs, secret keys, or service-role credentials.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles and account lifecycle
-- ---------------------------------------------------------------------------
create table if not exists public.live_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.live_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_profiles(user_id,email,display_name)
  values (
    new.id,
    lower(coalesce(new.email,'')),
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name','')), '')
  )
  on conflict (user_id) do update
    set email=excluded.email,
        display_name=coalesce(excluded.display_name,public.live_profiles.display_name),
        updated_at=now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_live_profile on auth.users;
create trigger on_auth_user_created_live_profile
  after insert or update of email,raw_user_meta_data on auth.users
  for each row execute function public.live_handle_new_user();

insert into public.live_profiles(user_id,email,display_name)
select id,lower(coalesce(email,'')),nullif(trim(coalesce(raw_user_meta_data->>'display_name','')), '')
from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Team, roster and game fields needed by the connected client
-- ---------------------------------------------------------------------------
alter table public.live_teams add column if not exists age_group text not null default '14U';
alter table public.live_teams add column if not exists competitive_season text not null default '2026-2027';
alter table public.live_teams add column if not exists default_lineup_player_ids uuid[] not null default '{}';
alter table public.live_teams add column if not exists default_goalie_id uuid;
do $$ begin
  alter table public.live_teams add constraint live_teams_default_goalie_fk foreign key (default_goalie_id) references public.live_players(id) on delete set null;
exception when duplicate_object then null; end $$;

alter table public.live_players add column if not exists client_player_id text;
alter table public.live_players add column if not exists created_by uuid references auth.users(id);
alter table public.live_players add column if not exists updated_by uuid references auth.users(id);
alter table public.live_players add column if not exists updated_at timestamptz not null default now();
alter table public.live_players drop constraint if exists live_players_roster_id_cap_number_key;
create unique index if not exists live_players_roster_client_id_idx
  on public.live_players(roster_id,client_player_id);

alter table public.live_games add column if not exists client_game_id text;
alter table public.live_games add column if not exists updated_by uuid references auth.users(id);
alter table public.live_games add column if not exists age_group text not null default '14U';
alter table public.live_games add column if not exists phase text not null default 'regulation';
alter table public.live_games add column if not exists overtime_length_minutes integer not null default 2;
alter table public.live_games add column if not exists overtime_multiple_periods boolean not null default true;
alter table public.live_games add column if not exists state_snapshot jsonb not null default '{}'::jsonb;
alter table public.live_games add column if not exists last_synced_at timestamptz not null default now();
alter table public.live_games add column if not exists sync_version bigint not null default 0;
-- The legacy NULLS NOT DISTINCT key permitted only one manual game per team.
-- Official source uniqueness remains protected only when both source IDs exist;
-- manual games use the stable team/client-game key instead.
alter table public.live_games drop constraint if exists live_games_environment_tournament_event_id_source_game_id_t_key;
alter table public.live_games drop constraint if exists live_games_environment_tournament_event_id_source_game_id_team_id_key;
create unique index if not exists live_games_official_source_idx
  on public.live_games(environment,tournament_event_id,source_game_id,team_id)
  where tournament_event_id is not null and source_game_id is not null;
create unique index if not exists live_games_team_client_id_idx
  on public.live_games(team_id,client_game_id);
create index if not exists live_games_team_updated_idx on public.live_games(team_id,updated_at desc);

alter table public.live_lineups add column if not exists goalie_id uuid references public.live_players(id) on delete set null;
alter table public.live_lineups add column if not exists period_label text;
alter table public.live_lineups add column if not exists updated_by uuid references auth.users(id);

alter table public.live_events add column if not exists client_event_id text;
alter table public.live_events add column if not exists updated_by uuid references auth.users(id);
alter table public.live_events add column if not exists updated_at timestamptz not null default now();
alter table public.live_events add column if not exists phase text not null default 'regulation';
alter table public.live_events add column if not exists shootout_team text;
alter table public.live_events add column if not exists shootout_round integer;
alter table public.live_events add column if not exists shooter_label text;
alter table public.live_events add column if not exists metrics jsonb not null default '{}'::jsonb;
-- Client event IDs are the immutable synchronization key. Sequence values are
-- display order only and may be reused after an event is voided and corrected.
alter table public.live_events drop constraint if exists live_events_game_id_sequence_key;
create unique index if not exists live_events_game_client_id_idx
  on public.live_events(game_id,client_event_id);
create index if not exists live_events_game_sequence_idx on public.live_events(game_id,sequence);

-- Decimal shootout scoring and current event vocabulary.
alter table public.live_games drop constraint if exists live_games_team_score_check;
alter table public.live_games drop constraint if exists live_games_opponent_score_check;
alter table public.live_games alter column team_score type numeric(5,1) using team_score::numeric;
alter table public.live_games alter column opponent_score type numeric(5,1) using opponent_score::numeric;
alter table public.live_games add constraint live_games_team_score_check check (team_score between 0 and 199.9);
alter table public.live_games add constraint live_games_opponent_score_check check (opponent_score between 0 and 199.9);

alter table public.live_events drop constraint if exists live_events_team_score_delta_check;
alter table public.live_events drop constraint if exists live_events_opponent_score_delta_check;
alter table public.live_events drop constraint if exists live_events_team_score_after_check;
alter table public.live_events drop constraint if exists live_events_opponent_score_after_check;
alter table public.live_events alter column team_score_delta type numeric(5,1) using team_score_delta::numeric;
alter table public.live_events alter column opponent_score_delta type numeric(5,1) using opponent_score_delta::numeric;
alter table public.live_events alter column team_score_after type numeric(5,1) using team_score_after::numeric;
alter table public.live_events alter column opponent_score_after type numeric(5,1) using opponent_score_after::numeric;
alter table public.live_events add constraint live_events_team_score_delta_check check (team_score_delta between -20 and 20);
alter table public.live_events add constraint live_events_opponent_score_delta_check check (opponent_score_delta between -20 and 20);
alter table public.live_events add constraint live_events_team_score_after_check check (team_score_after between 0 and 199.9);
alter table public.live_events add constraint live_events_opponent_score_after_check check (opponent_score_after between 0 and 199.9);

alter table public.live_games drop constraint if exists live_games_current_quarter_check;
alter table public.live_games add constraint live_games_current_quarter_check check (current_quarter between 1 and 20);
alter table public.live_events drop constraint if exists live_events_quarter_check;
alter table public.live_events add constraint live_events_quarter_check check (quarter between 1 and 20);
alter table public.live_lineups drop constraint if exists live_lineups_quarter_check;
alter table public.live_lineups add constraint live_lineups_quarter_check check (quarter between 1 and 20);

alter table public.live_events drop constraint if exists live_events_event_type_check;
alter table public.live_events add constraint live_events_event_type_check check (event_type in (
  'goal','opponent_goal','shot_missed','shot_post','shot_blocked','shot_saved',
  'save','field_block','steal','turnover','exclusion_drawn','exclusion_committed',
  'five_meter_drawn','five_meter_committed','quarter_start','quarter_end',
  'overtime_start','shootout_start','shootout_goal','shootout_miss','score_correction'
));

-- Preserve original authorship during idempotent browser upserts. The current
-- editor is retained separately in updated_by.
create or replace function public.live_preserve_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := old.created_by;
  return new;
end;
$$;

drop trigger if exists live_players_preserve_creator on public.live_players;
create trigger live_players_preserve_creator before update on public.live_players
  for each row execute function public.live_preserve_created_by();

drop trigger if exists live_games_preserve_creator on public.live_games;
create trigger live_games_preserve_creator before update on public.live_games
  for each row execute function public.live_preserve_created_by();

drop trigger if exists live_lineups_preserve_creator on public.live_lineups;
create trigger live_lineups_preserve_creator before update on public.live_lineups
  for each row execute function public.live_preserve_created_by();

drop trigger if exists live_events_preserve_creator on public.live_events;
create trigger live_events_preserve_creator before update on public.live_events
  for each row execute function public.live_preserve_created_by();



-- ---------------------------------------------------------------------------
-- Invitations, recaps and permanent game history
-- ---------------------------------------------------------------------------
create table if not exists public.live_team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.live_teams(id) on delete cascade,
  email text not null,
  role public.live_team_role not null default 'scorer',
  token text not null unique default encode(gen_random_bytes(24),'hex'),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz
);
create index if not exists live_team_invites_team_idx on public.live_team_invites(team_id,status);
create index if not exists live_team_invites_email_idx on public.live_team_invites(lower(email),status);

create table if not exists public.live_game_recaps (
  game_id uuid primary key references public.live_games(id) on delete cascade,
  playful_text text,
  straight_text text,
  coach_text text,
  selected_style text check (selected_style in ('playful','straight','coach')),
  approved_text text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  analytics_snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Workspace and role-management RPCs
-- ---------------------------------------------------------------------------
create or replace function public.live_registration_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'bootstrapAvailable', not exists(select 1 from public.live_teams),
    'inviteRequired', exists(select 1 from public.live_teams)
  );
$$;

grant execute on function public.live_registration_status() to anon,authenticated;

create or replace function public.live_bootstrap_workspace(
  requested_team_name text default 'Lamorinda A 14U Boys',
  requested_slug text default 'lamorinda-a-14u-boys',
  requested_age_group text default '14U',
  requested_season text default '2026-2027'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  selected_team public.live_teams%rowtype;
  selected_role public.live_team_role;
  selected_roster public.live_rosters%rowtype;
  final_slug text;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select t.* into selected_team
  from public.live_team_members m
  join public.live_teams t on t.id=m.team_id
  where m.user_id=caller
  order by case m.role when 'owner' then 1 when 'admin' then 2 when 'scorer' then 3 else 4 end,t.created_at
  limit 1;

  if selected_team.id is not null then
    select m.role into selected_role
    from public.live_team_members m
    where m.team_id=selected_team.id and m.user_id=caller;
  end if;

  if selected_team.id is null then
    if exists(select 1 from public.live_teams) then
      raise exception 'A team invitation is required for this account';
    end if;
    final_slug := regexp_replace(lower(coalesce(nullif(trim(requested_slug),''),requested_team_name)),'[^a-z0-9]+','-','g');
    final_slug := trim(both '-' from final_slug);
    if final_slug='' then final_slug := 'wpi-live-team'; end if;
    if exists(select 1 from public.live_teams where slug=final_slug) then
      final_slug := final_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
    end if;

    insert into public.live_teams(name,slug,owner_id,age_group,competitive_season)
    values (coalesce(nullif(trim(requested_team_name),''),'Lamorinda A 14U Boys'),final_slug,caller,coalesce(nullif(trim(requested_age_group),''),'14U'),requested_season)
    returning * into selected_team;
    selected_role := 'owner';
  end if;

  select * into selected_roster
  from public.live_rosters
  where team_id=selected_team.id and active=true
  order by created_at desc
  limit 1;

  if selected_roster.id is null then
    insert into public.live_rosters(team_id,competitive_season,label,active,created_by)
    values (selected_team.id,selected_team.competitive_season,selected_team.name || ' roster',true,caller)
    returning * into selected_roster;
  end if;

  return jsonb_build_object(
    'teamId',selected_team.id,
    'teamName',selected_team.name,
    'teamSlug',selected_team.slug,
    'ageGroup',selected_team.age_group,
    'competitiveSeason',selected_team.competitive_season,
    'role',selected_role,
    'rosterId',selected_roster.id,
    'defaultLineupPlayerIds',selected_team.default_lineup_player_ids,
    'defaultGoalieId',selected_team.default_goalie_id
  );
end;
$$;

grant execute on function public.live_bootstrap_workspace(text,text,text,text) to authenticated;

create or replace function public.live_create_team_invite(
  target_team_id uuid,
  invite_email text,
  invite_role public.live_team_role default 'scorer'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  invite_row public.live_team_invites%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into caller_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  if caller_role not in ('owner','admin') then raise exception 'Owner or Admin role required'; end if;
  if invite_role='owner' then raise exception 'Ownership must be transferred separately'; end if;
  if invite_role='admin' and caller_role<>'owner' then raise exception 'Only the Team Owner can invite another Admin'; end if;

  update public.live_team_invites
  set status='revoked'
  where team_id=target_team_id and lower(email)=lower(trim(invite_email)) and status='pending';

  insert into public.live_team_invites(team_id,email,role,created_by)
  values (target_team_id,lower(trim(invite_email)),invite_role,caller)
  returning * into invite_row;

  return jsonb_build_object('inviteId',invite_row.id,'token',invite_row.token,'expiresAt',invite_row.expires_at,'role',invite_row.role,'email',invite_row.email);
end;
$$;

grant execute on function public.live_create_team_invite(uuid,text,public.live_team_role) to authenticated;

create or replace function public.live_accept_team_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_email text;
  invite_row public.live_team_invites%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select lower(coalesce(email,'')) into caller_email from auth.users where id=caller;
  select * into invite_row from public.live_team_invites where token=invite_token and status='pending' for update;
  if invite_row.id is null then raise exception 'Invite is unavailable'; end if;
  if invite_row.expires_at < now() then
    update public.live_team_invites set status='expired' where id=invite_row.id;
    raise exception 'Invite has expired';
  end if;
  if lower(invite_row.email)<>caller_email then raise exception 'Invite email does not match the signed-in account'; end if;

  insert into public.live_team_members(team_id,user_id,role)
  values (invite_row.team_id,caller,invite_row.role)
  on conflict (team_id,user_id) do update set role=excluded.role;

  update public.live_team_invites
  set status='accepted',accepted_by=caller,accepted_at=now()
  where id=invite_row.id;

  return jsonb_build_object('teamId',invite_row.team_id,'role',invite_row.role);
end;
$$;

grant execute on function public.live_accept_team_invite(text) to authenticated;

create or replace function public.live_transfer_team_ownership(target_team_id uuid,target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare caller uuid := auth.uid();
begin
  if not public.live_has_team_role(target_team_id,array['owner']::public.live_team_role[]) then
    raise exception 'Only the Team Owner can transfer ownership';
  end if;
  if not exists(select 1 from public.live_team_members where team_id=target_team_id and user_id=target_user_id) then
    raise exception 'New owner must already be a team member';
  end if;
  update public.live_team_members set role='admin' where team_id=target_team_id and user_id=caller;
  update public.live_team_members set role='owner' where team_id=target_team_id and user_id=target_user_id;
  update public.live_teams set owner_id=target_user_id,updated_at=now() where id=target_team_id;
end;
$$;

grant execute on function public.live_transfer_team_ownership(uuid,uuid) to authenticated;

create or replace function public.live_guard_team_owner_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id and not public.live_has_team_role(old.id,array['owner']::public.live_team_role[]) then
    raise exception 'Only the Team Owner can change ownership';
  end if;
  return new;
end;
$$;

drop trigger if exists live_guard_team_owner_change_trigger on public.live_teams;
create trigger live_guard_team_owner_change_trigger
  before update of owner_id on public.live_teams
  for each row execute function public.live_guard_team_owner_change();

-- ---------------------------------------------------------------------------
-- RLS for new tables and corrected role behavior
-- ---------------------------------------------------------------------------
alter table public.live_profiles enable row level security;
alter table public.live_team_invites enable row level security;
alter table public.live_game_recaps enable row level security;

drop policy if exists "users read own live profile" on public.live_profiles;
create policy "users read own live profile" on public.live_profiles for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "users update own live profile" on public.live_profiles;
create policy "users update own live profile" on public.live_profiles for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists "team managers read invites" on public.live_team_invites;
create policy "team managers read invites" on public.live_team_invites for select to authenticated using (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[]));

drop policy if exists "members read recaps" on public.live_game_recaps;
create policy "members read recaps" on public.live_game_recaps for select to authenticated using (exists(select 1 from public.live_games g where g.id=game_id and public.live_is_team_member(g.team_id)));
drop policy if exists "scorers manage recaps" on public.live_game_recaps;
create policy "scorers manage recaps" on public.live_game_recaps for all to authenticated using (exists(select 1 from public.live_games g where g.id=game_id and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[]))) with check (exists(select 1 from public.live_games g where g.id=game_id and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[])));

-- Direct membership role changes are Owner-only. Admin invitations are handled by the secured RPC.
drop policy if exists "owners and admins manage memberships" on public.live_team_members;
create policy "owners manage memberships" on public.live_team_members for all to authenticated
  using (public.live_has_team_role(team_id,array['owner']::public.live_team_role[]))
  with check (public.live_has_team_role(team_id,array['owner']::public.live_team_role[]));

-- Correct legacy policies that incorrectly tied all future updates to the original creator.
drop policy if exists "scorers manage rosters" on public.live_rosters;
create policy "scorers manage rosters" on public.live_rosters for all to authenticated using (public.live_has_team_role(team_id,array['owner','admin','scorer']::public.live_team_role[])) with check (public.live_has_team_role(team_id,array['owner','admin','scorer']::public.live_team_role[]));

drop policy if exists "scorers manage lineups" on public.live_lineups;
create policy "scorers manage lineups" on public.live_lineups for all to authenticated using (exists(select 1 from public.live_games g where g.id=game_id and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[]))) with check (exists(select 1 from public.live_games g where g.id=game_id and public.live_has_team_role(g.team_id,array['owner','admin','scorer']::public.live_team_role[])));

-- Realtime is private because RLS still governs which authenticated clients receive rows.
do $$
begin
  begin alter publication supabase_realtime add table public.live_games; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.live_events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.live_lineups; exception when duplicate_object then null; end;
end $$;

comment on table public.live_game_recaps is 'Editable private recap variants and analytics snapshots. AI-generated text must be reviewed before GroupMe delivery.';
comment on column public.live_games.state_snapshot is 'Exact private scorer state used for resilient resume. Normalized events remain the analytics source of truth.';
comment on column public.live_players.client_player_id is 'Browser-stable player identifier used to synchronize local and connected modes.';
