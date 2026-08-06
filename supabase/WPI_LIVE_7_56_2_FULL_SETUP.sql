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

-- WPI 7.56.2 — authenticated GroupMe delivery, retry queue, and audit history.
-- Apply after WPI_LIVE_7_56_1_FULL_SETUP.sql or migrations 001 + 002.
-- No bot ID, access token, service-role key, password, or other secret belongs in this file.

alter table public.live_destinations add column if not exists updated_by uuid references auth.users(id);
alter table public.live_destinations add column if not exists updated_at timestamptz not null default now();
alter table public.live_destinations add column if not exists last_tested_at timestamptz;
alter table public.live_destinations add column if not exists last_test_status text check (last_test_status in ('sent','failed','not_tested')) default 'not_tested';
alter table public.live_destinations add column if not exists last_test_error text;

alter table public.live_deliveries add column if not exists destination_id uuid references public.live_destinations(id) on delete set null;
alter table public.live_deliveries add column if not exists message_text_snapshot text;
alter table public.live_deliveries add column if not exists first_attempt_at timestamptz;
alter table public.live_deliveries add column if not exists last_attempt_at timestamptz;
alter table public.live_deliveries add column if not exists next_retry_at timestamptz;
alter table public.live_deliveries add column if not exists sent_at timestamptz;
alter table public.live_deliveries add column if not exists last_error text;
alter table public.live_deliveries add column if not exists request_id uuid not null default gen_random_uuid();

create index if not exists live_deliveries_retry_idx
  on public.live_deliveries(status,next_retry_at)
  where status in ('pending','failed');
create index if not exists live_deliveries_destination_idx
  on public.live_deliveries(destination_id,updated_at desc);

create table if not exists public.live_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.live_deliveries(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  request_id uuid not null,
  invoked_by uuid references auth.users(id) on delete set null,
  trigger_source text not null default 'scorer' check (trigger_source in ('scorer','manual_retry','test','worker')),
  provider_response_code integer,
  provider_response_excerpt text,
  outcome text not null check (outcome in ('sent','failed','suppressed')),
  error_message text,
  attempted_at timestamptz not null default now(),
  unique(delivery_id,attempt_number)
);

alter table public.live_delivery_attempts enable row level security;

drop policy if exists "members read delivery attempts" on public.live_delivery_attempts;
create policy "members read delivery attempts" on public.live_delivery_attempts
for select to authenticated
using (
  exists (
    select 1
    from public.live_deliveries d
    join public.live_events e on e.id=d.event_id
    join public.live_games g on g.id=e.game_id
    where d.id=delivery_id and public.live_is_team_member(g.team_id)
  )
);

create or replace function public.live_claim_groupme_delivery(
  target_event_id uuid,
  target_destination_id uuid,
  target_destination_name text,
  target_message_text text,
  force_retry boolean default false,
  claim_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery public.live_deliveries%rowtype;
  attempt_number integer;
  claimed_at timestamptz := now();
begin
  -- Serialize claims for one event/provider pair. A recent pending claim is
  -- treated as in-flight so two scorer devices cannot post the same play.
  perform pg_advisory_xact_lock(hashtextextended(target_event_id::text || ':groupme', 0));

  select * into delivery
  from public.live_deliveries
  where event_id=target_event_id and provider='groupme'
  for update;

  if delivery.id is not null then
    if delivery.status='sent' then
      return jsonb_build_object('claimed',false,'status','already_sent','deliveryId',delivery.id);
    end if;
    if delivery.status='pending'
       and delivery.last_attempt_at is not null
       and delivery.last_attempt_at > claimed_at - interval '60 seconds' then
      return jsonb_build_object('claimed',false,'status','in_flight','deliveryId',delivery.id);
    end if;
    if delivery.next_retry_at is not null and delivery.next_retry_at > claimed_at and not force_retry then
      return jsonb_build_object(
        'claimed',false,'status','queued','deliveryId',delivery.id,'nextRetryAt',delivery.next_retry_at
      );
    end if;

    attempt_number := delivery.attempt_count + 1;
    update public.live_deliveries
    set destination_id=target_destination_id,
        destination_name=target_destination_name,
        status='pending',
        attempt_count=attempt_number,
        message_text_snapshot=target_message_text,
        first_attempt_at=coalesce(first_attempt_at,claimed_at),
        last_attempt_at=claimed_at,
        next_retry_at=null,
        sent_at=null,
        last_error=null,
        provider_response_code=null,
        provider_response_excerpt=null,
        request_id=claim_request_id,
        updated_at=claimed_at
    where id=delivery.id
    returning * into delivery;
  else
    attempt_number := 1;
    insert into public.live_deliveries(
      event_id,provider,destination_id,destination_name,status,attempt_count,
      message_text_snapshot,first_attempt_at,last_attempt_at,request_id,updated_at
    ) values (
      target_event_id,'groupme',target_destination_id,target_destination_name,'pending',attempt_number,
      target_message_text,claimed_at,claimed_at,claim_request_id,claimed_at
    )
    returning * into delivery;
  end if;

  return jsonb_build_object(
    'claimed',true,
    'status','pending',
    'deliveryId',delivery.id,
    'attemptNumber',attempt_number,
    'requestId',claim_request_id
  );
end;
$$;

revoke all on function public.live_claim_groupme_delivery(uuid,uuid,text,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.live_claim_groupme_delivery(uuid,uuid,text,text,boolean,uuid) to service_role;

create or replace function public.live_upsert_groupme_destination(
  target_team_id uuid,
  destination_name text,
  destination_secret_name text default 'GROUPME_BOT_ID',
  destination_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  destination public.live_destinations%rowtype;
  cleaned_secret text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Owner or Admin role required';
  end if;
  if nullif(trim(destination_name),'') is null then
    raise exception 'Destination display name is required';
  end if;

  cleaned_secret := upper(regexp_replace(coalesce(nullif(trim(destination_secret_name),''),'GROUPME_BOT_ID'),'[^A-Za-z0-9_]+','_','g'));
  if cleaned_secret !~ '^[A-Z][A-Z0-9_]{2,127}$' then
    raise exception 'Secret name must use uppercase letters, numbers, and underscores';
  end if;

  insert into public.live_destinations(
    team_id,provider,display_name,secret_name,enabled,created_by,updated_by,updated_at
  ) values (
    target_team_id,'groupme',trim(destination_name),cleaned_secret,destination_enabled,caller,caller,now()
  )
  on conflict (team_id,provider) do update
    set display_name=excluded.display_name,
        secret_name=excluded.secret_name,
        enabled=excluded.enabled,
        updated_by=caller,
        updated_at=now()
  returning * into destination;

  return jsonb_build_object(
    'id',destination.id,
    'teamId',destination.team_id,
    'displayName',destination.display_name,
    'secretName',destination.secret_name,
    'enabled',destination.enabled,
    'lastTestedAt',destination.last_tested_at,
    'lastTestStatus',destination.last_test_status,
    'lastTestError',destination.last_test_error
  );
end;
$$;

grant execute on function public.live_upsert_groupme_destination(uuid,text,text,boolean) to authenticated;

create or replace function public.live_groupme_delivery_summary(target_team_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'sent',count(*) filter (where d.status='sent'),
    'failed',count(*) filter (where d.status='failed'),
    'pending',count(*) filter (where d.status='pending'),
    'suppressed',count(*) filter (where d.status='suppressed'),
    'lastSentAt',max(d.sent_at),
    'lastFailureAt',max(d.last_attempt_at) filter (where d.status='failed')
  )
  from public.live_deliveries d
  join public.live_events e on e.id=d.event_id
  join public.live_games g on g.id=e.game_id
  where g.team_id=target_team_id
    and public.live_is_team_member(target_team_id);
$$;

grant execute on function public.live_groupme_delivery_summary(uuid) to authenticated;

-- Realtime delivery status keeps the private scorer and dashboard current on multiple devices.
do $$ begin
  begin alter publication supabase_realtime add table public.live_deliveries; exception when duplicate_object then null; end;
end $$;

comment on table public.live_delivery_attempts is 'Immutable per-attempt audit history for WPI Live outbound delivery. Provider secrets are never stored here.';
comment on column public.live_destinations.secret_name is 'Edge Function environment-variable name only. The GroupMe bot ID itself must remain in Supabase secrets.';
comment on column public.live_deliveries.next_retry_at is 'Earliest recommended retry time. Automatic retries occur while an authorized WPI Live client is open; failed rows remain available for manual retry.';

-- ===========================================================================
-- WPI 7.56.6 — Guest Scorer Handoff & Scoped Admin Control
-- Source: supabase/migrations/202608050002_guest_scorer_handoff.sql
-- ===========================================================================
-- WPI 7.56.6 — scoped Admin authority and seamless game-scoped scorer handoff.
-- Apply after 202608050001_manual_game_schema_integrity.sql.
-- This migration contains no GroupMe bot IDs, API keys, passwords, or other secrets.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- One active scoring controller per game, with temporary guest sessions.
-- ---------------------------------------------------------------------------
create table if not exists public.live_game_scorer_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.live_games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  session_kind text not null check (session_kind in ('member','guest')),
  status text not null default 'active' check (status in ('active','read_only','revoked','ended')),
  source text not null default 'initial_claim' check (source in (
    'initial_claim','member_assignment','member_handoff','guest_handoff','admin_takeover','migration_backfill'
  )),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references auth.users(id) on delete set null
);

create unique index if not exists live_game_one_active_scorer_idx
  on public.live_game_scorer_sessions(game_id)
  where status='active';
create index if not exists live_game_scorer_sessions_user_idx
  on public.live_game_scorer_sessions(user_id,game_id,status);
create index if not exists live_game_scorer_sessions_game_idx
  on public.live_game_scorer_sessions(game_id,created_at desc);

alter table public.live_games add column if not exists active_scorer_session_id uuid;
alter table public.live_games add column if not exists active_scorer_user_id uuid references auth.users(id) on delete set null;
alter table public.live_games add column if not exists active_scorer_display_name text;
alter table public.live_games add column if not exists active_scorer_kind text check (active_scorer_kind in ('member','guest'));
alter table public.live_games add column if not exists scorer_control_version bigint not null default 0;
alter table public.live_games add column if not exists scorer_control_updated_at timestamptz;



create table if not exists public.live_game_scorer_passes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.live_games(id) on delete cascade,
  token_hash text not null unique,
  code_hash text not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_session_id uuid references public.live_game_scorer_sessions(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_session_id uuid references public.live_game_scorer_sessions(id) on delete set null,
  accepted_display_name text,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists live_game_pending_scorer_pass_idx
  on public.live_game_scorer_passes(game_id)
  where status='pending';
create index if not exists live_game_scorer_pass_expiry_idx
  on public.live_game_scorer_passes(status,expires_at);

create table if not exists public.live_game_scorer_audit (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.live_games(id) on delete cascade,
  action text not null check (action in (
    'initial_claim','handoff_created','handoff_accepted','handoff_revoked','admin_takeover','session_ended'
  )),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_display_name text,
  from_session_id uuid references public.live_game_scorer_sessions(id) on delete set null,
  to_session_id uuid references public.live_game_scorer_sessions(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_game_scorer_audit_game_idx
  on public.live_game_scorer_audit(game_id,created_at desc);

-- ---------------------------------------------------------------------------
-- Security helpers.
-- ---------------------------------------------------------------------------
create or replace function public.live_is_anonymous_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt()->>'is_anonymous')::boolean,false);
$$;

create or replace function public.live_user_display_name(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(trim(p.display_name),''),
    nullif(split_part(coalesce(u.email,''),'@',1),''),
    'WPI scorer'
  )
  from auth.users u
  left join public.live_profiles p on p.user_id=u.id
  where u.id=target_user_id;
$$;

create or replace function public.live_can_read_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_games g
    where g.id=target_game_id
      and (
        public.live_is_team_member(g.team_id)
        or exists (
          select 1
          from public.live_game_scorer_sessions s
          where s.game_id=g.id
            and s.user_id=auth.uid()
            and s.status in ('active','read_only')
        )
      )
  );
$$;

create or replace function public.live_can_score_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_game_scorer_sessions s
    where s.game_id=target_game_id
      and s.user_id=auth.uid()
      and s.status='active'
  );
$$;

create or replace function public.live_can_manage_game_scorer(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_games g
    where g.id=target_game_id
      and public.live_has_team_role(g.team_id,array['owner','admin']::public.live_team_role[])
  );
$$;

grant execute on function public.live_is_anonymous_user() to authenticated;
grant execute on function public.live_can_read_game(uuid) to authenticated;
grant execute on function public.live_can_score_game(uuid) to authenticated;
grant execute on function public.live_can_manage_game_scorer(uuid) to authenticated;
revoke all on function public.live_user_display_name(uuid) from public,anon,authenticated;

-- Scorer-control columns may change only inside the secured RPCs below.
create or replace function public.live_guard_scorer_control_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.active_scorer_session_id is distinct from old.active_scorer_session_id
    or new.active_scorer_user_id is distinct from old.active_scorer_user_id
    or new.active_scorer_display_name is distinct from old.active_scorer_display_name
    or new.active_scorer_kind is distinct from old.active_scorer_kind
    or new.scorer_control_version is distinct from old.scorer_control_version
    or new.scorer_control_updated_at is distinct from old.scorer_control_updated_at
  ) and coalesce(current_setting('wpi.scorer_control_mutation',true),'') <> 'allowed' then
    raise exception 'Scorer control must be changed through a WPI handoff or takeover action';
  end if;
  return new;
end;
$$;

drop trigger if exists live_guard_scorer_control_columns_trigger on public.live_games;
create trigger live_guard_scorer_control_columns_trigger
  before update on public.live_games
  for each row execute function public.live_guard_scorer_control_columns();

-- Active scorers can update live game state, but only Team Owners/Admins may
-- change durable team, roster, source, season, visibility, or GroupMe routing.
create or replace function public.live_guard_game_configuration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.team_id is distinct from old.team_id
    or new.roster_id is distinct from old.roster_id
    or new.destination_id is distinct from old.destination_id
    or new.competitive_season is distinct from old.competitive_season
    or new.tournament_event_id is distinct from old.tournament_event_id
    or new.source_game_id is distinct from old.source_game_id
    or new.source_mode is distinct from old.source_mode
    or new.environment is distinct from old.environment
    or new.visibility is distinct from old.visibility
  ) and not public.live_has_team_role(old.team_id,array['owner','admin']::public.live_team_role[]) then
    raise exception 'Only a Team Owner or Admin may change game configuration';
  end if;
  return new;
end;
$$;

drop trigger if exists live_guard_game_configuration_trigger on public.live_games;
create trigger live_guard_game_configuration_trigger
  before update on public.live_games
  for each row execute function public.live_guard_game_configuration();

-- ---------------------------------------------------------------------------
-- Scorer-control RPCs.
-- ---------------------------------------------------------------------------
create or replace function public.live_scorer_control_status(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  active_row public.live_game_scorer_sessions%rowtype;
  caller_session public.live_game_scorer_sessions%rowtype;
  caller_role public.live_team_role;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into game_row from public.live_games where id=target_game_id;
  if game_row.id is null or not public.live_can_read_game(target_game_id) then
    raise exception 'Game is unavailable';
  end if;
  select * into active_row
  from public.live_game_scorer_sessions
  where game_id=target_game_id and status='active'
  order by activated_at desc limit 1;
  select * into caller_session
  from public.live_game_scorer_sessions
  where game_id=target_game_id and user_id=caller and status in ('active','read_only')
  order by activated_at desc limit 1;
  select role into caller_role
  from public.live_team_members
  where team_id=game_row.team_id and user_id=caller;

  return jsonb_build_object(
    'gameId',game_row.id,
    'activeSessionId',active_row.id,
    'activeUserId',active_row.user_id,
    'activeDisplayName',active_row.display_name,
    'activeKind',active_row.session_kind,
    'activeSince',active_row.activated_at,
    'controlVersion',game_row.scorer_control_version,
    'callerSessionId',caller_session.id,
    'callerSessionStatus',caller_session.status,
    'callerRole',caller_role,
    'canScore',coalesce(active_row.user_id=caller,false),
    'canManage',caller_role in ('owner','admin'),
    'canTransfer',coalesce(active_row.user_id=caller,false) or caller_role in ('owner','admin')
  );
end;
$$;

grant execute on function public.live_scorer_control_status(uuid) to authenticated;

create or replace function public.live_claim_game_scorer(
  target_game_id uuid,
  requested_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  active_row public.live_game_scorer_sessions%rowtype;
  new_session public.live_game_scorer_sessions%rowtype;
  caller_role public.live_team_role;
  final_name text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if public.live_is_anonymous_user() then raise exception 'A guest scorer must use a valid handoff pass'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_game_id::text || ':scorer-control',0));
  select * into game_row from public.live_games where id=target_game_id for update;
  if game_row.id is null then raise exception 'Game not found'; end if;
  select role into caller_role from public.live_team_members where team_id=game_row.team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin','scorer') then raise exception 'Scorer access required'; end if;
  if game_row.status in ('final','cancelled') then raise exception 'This game is no longer open for scoring'; end if;

  select * into active_row from public.live_game_scorer_sessions
  where game_id=target_game_id and status='active' for update;
  if active_row.id is not null then
    if active_row.user_id=caller then return public.live_scorer_control_status(target_game_id); end if;
    raise exception 'Scoring is currently controlled by %',active_row.display_name;
  end if;

  final_name := coalesce(nullif(trim(requested_display_name),''),public.live_user_display_name(caller),'WPI scorer');
  insert into public.live_game_scorer_sessions(
    game_id,user_id,display_name,session_kind,status,source,created_by
  ) values (
    target_game_id,caller,final_name,'member','active','initial_claim',caller
  ) returning * into new_session;

  perform set_config('wpi.scorer_control_mutation','allowed',true);
  update public.live_games
  set active_scorer_session_id=new_session.id,
      active_scorer_user_id=caller,
      active_scorer_display_name=final_name,
      active_scorer_kind='member',
      scorer_control_version=scorer_control_version+1,
      scorer_control_updated_at=now(),
      updated_at=now()
  where id=target_game_id;

  insert into public.live_game_scorer_audit(
    game_id,action,actor_user_id,actor_display_name,to_session_id
  ) values (target_game_id,'initial_claim',caller,final_name,new_session.id);

  return public.live_scorer_control_status(target_game_id);
end;
$$;

grant execute on function public.live_claim_game_scorer(uuid,text) to authenticated;

create or replace function public.live_create_scorer_handoff_pass(target_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  active_row public.live_game_scorer_sessions%rowtype;
  pass_row public.live_game_scorer_passes%rowtype;
  raw_token text;
  raw_code text;
  code_available boolean := false;
  caller_name text;
  i integer;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_game_id::text || ':scorer-control',0));
  select * into game_row from public.live_games where id=target_game_id for update;
  if game_row.id is null or not public.live_can_read_game(target_game_id) then raise exception 'Game is unavailable'; end if;
  if game_row.status in ('final','cancelled') then raise exception 'This game is no longer open for scoring'; end if;
  if not public.live_can_score_game(target_game_id) and not public.live_can_manage_game_scorer(target_game_id) then
    raise exception 'The active Scorer or a Team Admin must create the handoff';
  end if;

  update public.live_game_scorer_passes
  set status='revoked',revoked_at=now()
  where game_id=target_game_id and status='pending';

  raw_token := encode(gen_random_bytes(32),'hex');
  for i in 1..20 loop
    raw_code := lpad((floor(random()*1000000))::integer::text,6,'0');
    if not exists (
      select 1 from public.live_game_scorer_passes
      where status='pending' and code_hash=encode(digest(raw_code,'sha256'),'hex')
    ) then
      code_available := true;
      exit;
    end if;
  end loop;
  if not code_available then raise exception 'Could not generate a unique handoff code'; end if;

  select * into active_row from public.live_game_scorer_sessions
  where game_id=target_game_id and status='active';
  caller_name := coalesce(
    case when active_row.user_id=caller then active_row.display_name end,
    public.live_user_display_name(caller),
    'WPI scorer'
  );

  insert into public.live_game_scorer_passes(
    game_id,token_hash,code_hash,status,expires_at,created_by,created_by_session_id
  ) values (
    target_game_id,
    encode(digest(raw_token,'sha256'),'hex'),
    encode(digest(raw_code,'sha256'),'hex'),
    'pending',now()+interval '5 minutes',caller,active_row.id
  ) returning * into pass_row;

  insert into public.live_game_scorer_audit(
    game_id,action,actor_user_id,actor_display_name,from_session_id,details
  ) values (
    target_game_id,'handoff_created',caller,caller_name,active_row.id,
    jsonb_build_object('passId',pass_row.id,'expiresAt',pass_row.expires_at)
  );

  return jsonb_build_object(
    'passId',pass_row.id,
    'gameId',target_game_id,
    'token',raw_token,
    'code',raw_code,
    'expiresAt',pass_row.expires_at,
    'currentScorer',active_row.display_name
  );
end;
$$;

grant execute on function public.live_create_scorer_handoff_pass(uuid) to authenticated;

create or replace function public.live_resolve_scorer_pass(
  handoff_token text default null,
  handoff_code text default null,
  target_game_id uuid default null,
  lock_row boolean default false
)
returns public.live_game_scorer_passes
language plpgsql
security definer
set search_path = public
as $$
declare
  pass_row public.live_game_scorer_passes%rowtype;
  token_value text := nullif(trim(coalesce(handoff_token,'')),'');
  code_value text := regexp_replace(coalesce(handoff_code,''),'[^0-9]','','g');
begin
  if token_value is not null then
    if lock_row then
      select * into pass_row from public.live_game_scorer_passes
      where token_hash=encode(digest(token_value,'sha256'),'hex') for update;
    else
      select * into pass_row from public.live_game_scorer_passes
      where token_hash=encode(digest(token_value,'sha256'),'hex');
    end if;
  elsif target_game_id is not null and char_length(code_value)=6 then
    if lock_row then
      select * into pass_row from public.live_game_scorer_passes
      where game_id=target_game_id and status='pending' for update;
    else
      select * into pass_row from public.live_game_scorer_passes
      where game_id=target_game_id and status='pending';
    end if;
    if pass_row.id is not null and pass_row.code_hash<>encode(digest(code_value,'sha256'),'hex') then
      update public.live_game_scorer_passes
      set attempt_count=least(attempt_count+1,20),
          status=case when attempt_count+1>=8 then 'revoked' else status end,
          revoked_at=case when attempt_count+1>=8 then now() else revoked_at end
      where id=pass_row.id;
      pass_row.id := null;
    end if;
  end if;
  return pass_row;
end;
$$;

revoke all on function public.live_resolve_scorer_pass(text,text,uuid,boolean) from public,anon,authenticated;

create or replace function public.live_preview_scorer_handoff_pass(
  handoff_token text default null,
  handoff_code text default null,
  target_game_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  pass_row public.live_game_scorer_passes%rowtype;
  game_row public.live_games%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  pass_row := public.live_resolve_scorer_pass(handoff_token,handoff_code,target_game_id,false);
  if pass_row.id is null then raise exception 'The scorer pass is invalid or unavailable'; end if;
  if pass_row.status<>'pending' then raise exception 'The scorer pass has already been used or revoked'; end if;
  if pass_row.expires_at<now() then
    update public.live_game_scorer_passes set status='expired' where id=pass_row.id;
    raise exception 'The scorer pass has expired';
  end if;
  select * into game_row from public.live_games where id=pass_row.game_id;
  if game_row.status in ('final','cancelled') then raise exception 'This game is no longer open for scoring'; end if;
  return jsonb_build_object(
    'passId',pass_row.id,
    'gameId',game_row.id,
    'teamName',game_row.team_name_snapshot,
    'opponentName',game_row.opponent_name,
    'teamScore',game_row.team_score,
    'opponentScore',game_row.opponent_score,
    'quarter',game_row.current_quarter,
    'scheduledAt',game_row.scheduled_at,
    'venue',game_row.venue,
    'expiresAt',pass_row.expires_at,
    'activeScorer',game_row.active_scorer_display_name
  );
end;
$$;

grant execute on function public.live_preview_scorer_handoff_pass(text,text,uuid) to authenticated;

create or replace function public.live_accept_scorer_handoff_pass(
  handoff_token text default null,
  handoff_code text default null,
  target_game_id uuid default null,
  requested_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  pass_row public.live_game_scorer_passes%rowtype;
  game_row public.live_games%rowtype;
  active_row public.live_game_scorer_sessions%rowtype;
  new_session public.live_game_scorer_sessions%rowtype;
  final_name text;
  final_kind text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  final_name := nullif(trim(coalesce(requested_display_name,'')),'');
  if final_name is null or char_length(final_name)>80 then raise exception 'Enter a scorer name between 1 and 80 characters'; end if;

  -- Resolve once without a row lock so every scorer-control path can take the
  -- game advisory lock before locking a pass/session row. This consistent lock
  -- order prevents a concurrent pass refresh, acceptance, or Admin takeover
  -- from deadlocking.
  pass_row := public.live_resolve_scorer_pass(handoff_token,handoff_code,target_game_id,false);
  if pass_row.id is null then raise exception 'The scorer pass is invalid or unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(pass_row.game_id::text || ':scorer-control',0));
  pass_row := public.live_resolve_scorer_pass(handoff_token,handoff_code,target_game_id,true);
  if pass_row.id is null then raise exception 'The scorer pass is invalid or unavailable'; end if;
  if pass_row.status<>'pending' then raise exception 'The scorer pass has already been used or revoked'; end if;
  if pass_row.expires_at<now() then
    update public.live_game_scorer_passes set status='expired' where id=pass_row.id;
    raise exception 'The scorer pass has expired';
  end if;

  select * into game_row from public.live_games where id=pass_row.game_id for update;
  if game_row.status in ('final','cancelled') then raise exception 'This game is no longer open for scoring'; end if;
  select * into active_row from public.live_game_scorer_sessions
  where game_id=game_row.id and status='active' for update;

  if active_row.id is not null then
    update public.live_game_scorer_sessions
    set status='read_only',ended_at=now(),ended_by=caller
    where id=active_row.id;
  end if;

  final_kind := case when public.live_is_team_member(game_row.team_id) then 'member' else 'guest' end;
  insert into public.live_game_scorer_sessions(
    game_id,user_id,display_name,session_kind,status,source,created_by
  ) values (
    game_row.id,caller,final_name,final_kind,'active',
    case when final_kind='member' then 'member_handoff' else 'guest_handoff' end,
    pass_row.created_by
  ) returning * into new_session;

  perform set_config('wpi.scorer_control_mutation','allowed',true);
  update public.live_games
  set active_scorer_session_id=new_session.id,
      active_scorer_user_id=caller,
      active_scorer_display_name=final_name,
      active_scorer_kind=final_kind,
      scorer_control_version=scorer_control_version+1,
      scorer_control_updated_at=now(),
      updated_at=now()
  where id=game_row.id;

  update public.live_game_scorer_passes
  set status='accepted',accepted_by=caller,accepted_session_id=new_session.id,
      accepted_display_name=final_name,accepted_at=now()
  where id=pass_row.id;

  insert into public.live_game_scorer_audit(
    game_id,action,actor_user_id,actor_display_name,from_session_id,to_session_id,details
  ) values (
    game_row.id,'handoff_accepted',caller,final_name,active_row.id,new_session.id,
    jsonb_build_object('passId',pass_row.id,'sessionKind',final_kind)
  );

  return jsonb_build_object(
    'gameId',game_row.id,
    'teamId',game_row.team_id,
    'rosterId',game_row.roster_id,
    'teamName',game_row.team_name_snapshot,
    'opponentName',game_row.opponent_name,
    'role',case when final_kind='member' then 'scorer' else 'guest_scorer' end,
    'displayName',final_name,
    'sessionId',new_session.id,
    'active',true
  );
end;
$$;

grant execute on function public.live_accept_scorer_handoff_pass(text,text,uuid,text) to authenticated;

create or replace function public.live_guest_game_workspace(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  team_row public.live_teams%rowtype;
  session_row public.live_game_scorer_sessions%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into session_row
  from public.live_game_scorer_sessions
  where game_id=target_game_id and user_id=caller and status in ('active','read_only')
  order by activated_at desc limit 1;
  if session_row.id is null then raise exception 'This scorer session is no longer available'; end if;
  select * into game_row from public.live_games where id=target_game_id;
  select * into team_row from public.live_teams where id=game_row.team_id;
  return jsonb_build_object(
    'teamId',team_row.id,
    'teamName',team_row.name,
    'teamSlug',team_row.slug,
    'ageGroup',game_row.age_group,
    'competitiveSeason',game_row.competitive_season,
    'role',case when session_row.status='active' then
      case when session_row.session_kind='guest' then 'guest_scorer' else 'scorer' end
      else 'guest_viewer' end,
    'rosterId',game_row.roster_id,
    'gameId',game_row.id,
    'scorerSessionId',session_row.id,
    'scorerDisplayName',session_row.display_name,
    'defaultLineupPlayerIds',team_row.default_lineup_player_ids,
    'defaultGoalieId',team_row.default_goalie_id
  );
end;
$$;

grant execute on function public.live_guest_game_workspace(uuid) to authenticated;

create or replace function public.live_take_over_game_scorer(
  target_game_id uuid,
  requested_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  game_row public.live_games%rowtype;
  active_row public.live_game_scorer_sessions%rowtype;
  new_session public.live_game_scorer_sessions%rowtype;
  final_name text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_game_id::text || ':scorer-control',0));
  select * into game_row from public.live_games where id=target_game_id for update;
  if game_row.id is null or not public.live_can_manage_game_scorer(target_game_id) then
    raise exception 'Owner or Admin role required';
  end if;
  if game_row.status in ('final','cancelled') then raise exception 'This game is no longer open for scoring'; end if;
  final_name := coalesce(nullif(trim(requested_display_name),''),public.live_user_display_name(caller),'WPI Admin');
  select * into active_row from public.live_game_scorer_sessions
  where game_id=target_game_id and status='active' for update;
  if active_row.user_id=caller then return public.live_scorer_control_status(target_game_id); end if;
  if active_row.id is not null then
    update public.live_game_scorer_sessions
    set status='read_only',ended_at=now(),ended_by=caller
    where id=active_row.id;
  end if;

  insert into public.live_game_scorer_sessions(
    game_id,user_id,display_name,session_kind,status,source,created_by
  ) values (
    target_game_id,caller,final_name,'member','active','admin_takeover',caller
  ) returning * into new_session;

  perform set_config('wpi.scorer_control_mutation','allowed',true);
  update public.live_games
  set active_scorer_session_id=new_session.id,
      active_scorer_user_id=caller,
      active_scorer_display_name=final_name,
      active_scorer_kind='member',
      scorer_control_version=scorer_control_version+1,
      scorer_control_updated_at=now(),
      updated_at=now()
  where id=target_game_id;

  insert into public.live_game_scorer_audit(
    game_id,action,actor_user_id,actor_display_name,from_session_id,to_session_id
  ) values (target_game_id,'admin_takeover',caller,final_name,active_row.id,new_session.id);

  return public.live_scorer_control_status(target_game_id);
end;
$$;

grant execute on function public.live_take_over_game_scorer(uuid,text) to authenticated;

create or replace function public.live_revoke_scorer_handoff_pass(target_pass_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  pass_row public.live_game_scorer_passes%rowtype;
  caller_name text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into pass_row from public.live_game_scorer_passes where id=target_pass_id for update;
  if pass_row.id is null then return; end if;
  if not public.live_can_score_game(pass_row.game_id) and not public.live_can_manage_game_scorer(pass_row.game_id) then
    raise exception 'The active Scorer or a Team Admin must revoke the handoff';
  end if;
  select coalesce(s.display_name,public.live_user_display_name(caller),'WPI scorer') into caller_name
  from (select 1) seed
  left join public.live_game_scorer_sessions s
    on s.game_id=pass_row.game_id and s.user_id=caller and s.status='active';
  update public.live_game_scorer_passes set status='revoked',revoked_at=now()
  where id=pass_row.id and status='pending';
  insert into public.live_game_scorer_audit(game_id,action,actor_user_id,actor_display_name,details)
  values (pass_row.game_id,'handoff_revoked',caller,caller_name,jsonb_build_object('passId',pass_row.id));
end;
$$;

grant execute on function public.live_revoke_scorer_handoff_pass(uuid) to authenticated;

-- Final games automatically close the active scoring controller.
create or replace function public.live_end_scorer_session_with_game()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare active_row public.live_game_scorer_sessions%rowtype;
begin
  if new.status in ('final','cancelled') and old.status is distinct from new.status then
    select * into active_row from public.live_game_scorer_sessions
    where game_id=new.id and status='active' for update;
    if active_row.id is not null then
      update public.live_game_scorer_sessions
      set status='ended',ended_at=now(),ended_by=auth.uid()
      where id=active_row.id;
      perform set_config('wpi.scorer_control_mutation','allowed',true);
      new.active_scorer_session_id := null;
      new.active_scorer_user_id := null;
      new.active_scorer_display_name := null;
      new.active_scorer_kind := null;
      new.scorer_control_version := new.scorer_control_version+1;
      new.scorer_control_updated_at := now();
      insert into public.live_game_scorer_audit(
        game_id,action,actor_user_id,actor_display_name,from_session_id
      ) values (new.id,'session_ended',auth.uid(),coalesce(active_row.display_name,public.live_user_display_name(auth.uid())),active_row.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists live_end_scorer_session_with_game_trigger on public.live_games;
create trigger live_end_scorer_session_with_game_trigger
  before update of status on public.live_games
  for each row execute function public.live_end_scorer_session_with_game();

-- Backfill one active member controller for each existing unfinished game.
do $$
declare
  game_row record;
  new_session public.live_game_scorer_sessions%rowtype;
  final_user uuid;
  final_name text;
begin
  for game_row in
    select g.* from public.live_games g
    where g.status not in ('final','cancelled')
      and not exists (
        select 1 from public.live_game_scorer_sessions s
        where s.game_id=g.id and s.status='active'
      )
  loop
    select coalesce(
      (select m.user_id from public.live_team_members m
       where m.team_id=game_row.team_id and m.user_id=game_row.updated_by
         and m.role in ('owner','admin','scorer') limit 1),
      (select m.user_id from public.live_team_members m
       where m.team_id=game_row.team_id and m.user_id=game_row.created_by
         and m.role in ('owner','admin','scorer') limit 1),
      (select m.user_id from public.live_team_members m
       where m.team_id=game_row.team_id and m.role='owner' limit 1)
    ) into final_user;
    if final_user is null then continue; end if;
    final_name := coalesce(public.live_user_display_name(final_user),'WPI scorer');
    insert into public.live_game_scorer_sessions(
      game_id,user_id,display_name,session_kind,status,source,created_by
    ) values (
      game_row.id,final_user,final_name,'member','active','migration_backfill',final_user
    ) returning * into new_session;
    perform set_config('wpi.scorer_control_mutation','allowed',true);
    update public.live_games
    set active_scorer_session_id=new_session.id,
        active_scorer_user_id=final_user,
        active_scorer_display_name=final_name,
        active_scorer_kind='member',
        scorer_control_version=scorer_control_version+1,
        scorer_control_updated_at=now()
    where id=game_row.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: Admins manage teams; only the active game controller writes scoring.
-- ---------------------------------------------------------------------------
alter table public.live_game_scorer_sessions enable row level security;
alter table public.live_game_scorer_passes enable row level security;
alter table public.live_game_scorer_audit enable row level security;

revoke all on public.live_game_scorer_sessions from anon,authenticated;
revoke all on public.live_game_scorer_passes from anon,authenticated;
revoke all on public.live_game_scorer_audit from anon,authenticated;
grant select on public.live_game_scorer_sessions to authenticated;
grant select on public.live_game_scorer_audit to authenticated;

drop policy if exists "game participants read scorer sessions" on public.live_game_scorer_sessions;
create policy "game participants read scorer sessions" on public.live_game_scorer_sessions
for select to authenticated using (public.live_can_read_game(game_id));
drop policy if exists "game participants read scorer audit" on public.live_game_scorer_audit;
create policy "game participants read scorer audit" on public.live_game_scorer_audit
for select to authenticated using (public.live_can_read_game(game_id));

-- Team and roster reads include accepted guest scorers. Permanent roster edits
-- remain an Owner/Admin responsibility.
drop policy if exists "members read teams" on public.live_teams;
drop policy if exists "members and guest scorers read teams" on public.live_teams;
create policy "members and guest scorers read teams" on public.live_teams
for select to authenticated using (
  public.live_is_team_member(id)
  or exists (
    select 1 from public.live_games g
    join public.live_game_scorer_sessions s on s.game_id=g.id
    where g.team_id=id and s.user_id=auth.uid() and s.status in ('active','read_only')
  )
);

drop policy if exists "members read rosters" on public.live_rosters;
drop policy if exists "members and guest scorers read rosters" on public.live_rosters;
create policy "members and guest scorers read rosters" on public.live_rosters
for select to authenticated using (
  public.live_is_team_member(team_id)
  or exists (
    select 1 from public.live_games g
    join public.live_game_scorer_sessions s on s.game_id=g.id
    where g.roster_id=id and s.user_id=auth.uid() and s.status in ('active','read_only')
  )
);
drop policy if exists "scorers manage rosters" on public.live_rosters;
drop policy if exists "team managers manage rosters" on public.live_rosters;
create policy "team managers manage rosters" on public.live_rosters
for all to authenticated
using (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[]))
with check (public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[]));

drop policy if exists "members read players" on public.live_players;
drop policy if exists "members and guest scorers read players" on public.live_players;
create policy "members and guest scorers read players" on public.live_players
for select to authenticated using (
  exists (
    select 1 from public.live_rosters r
    where r.id=roster_id and (
      public.live_is_team_member(r.team_id)
      or exists (
        select 1 from public.live_games g
        join public.live_game_scorer_sessions s on s.game_id=g.id
        where g.roster_id=r.id and s.user_id=auth.uid() and s.status in ('active','read_only')
      )
    )
  )
);
drop policy if exists "scorers manage players" on public.live_players;
drop policy if exists "team managers manage players" on public.live_players;
create policy "team managers manage players" on public.live_players
for all to authenticated
using (exists (
  select 1 from public.live_rosters r
  where r.id=roster_id and public.live_has_team_role(r.team_id,array['owner','admin']::public.live_team_role[])
))
with check (exists (
  select 1 from public.live_rosters r
  where r.id=roster_id and public.live_has_team_role(r.team_id,array['owner','admin']::public.live_team_role[])
));

drop policy if exists "members read destinations" on public.live_destinations;
drop policy if exists "members and game scorers read destinations" on public.live_destinations;
create policy "members and game scorers read destinations" on public.live_destinations
for select to authenticated using (
  public.live_is_team_member(team_id)
  or exists (
    select 1 from public.live_games g
    join public.live_game_scorer_sessions s on s.game_id=g.id
    where g.destination_id=id and s.user_id=auth.uid() and s.status in ('active','read_only')
  )
);

drop policy if exists "members read games" on public.live_games;
drop policy if exists "game participants read games" on public.live_games;
create policy "game participants read games" on public.live_games
for select to authenticated using (public.live_can_read_game(id));
drop policy if exists "scorers create games" on public.live_games;
drop policy if exists "team managers create games" on public.live_games;
create policy "team managers create games" on public.live_games
for insert to authenticated with check (
  public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[])
  and created_by=auth.uid()
);
drop policy if exists "scorers update games" on public.live_games;
drop policy if exists "active scorer updates games" on public.live_games;
create policy "active scorer updates games" on public.live_games
for update to authenticated
using (public.live_can_score_game(id))
with check (public.live_can_score_game(id));

drop policy if exists "members read lineups" on public.live_lineups;
drop policy if exists "game participants read lineups" on public.live_lineups;
create policy "game participants read lineups" on public.live_lineups
for select to authenticated using (public.live_can_read_game(game_id));
drop policy if exists "scorers manage lineups" on public.live_lineups;
drop policy if exists "active scorer manages lineups" on public.live_lineups;
create policy "active scorer manages lineups" on public.live_lineups
for all to authenticated
using (public.live_can_score_game(game_id))
with check (public.live_can_score_game(game_id));

drop policy if exists "members read events" on public.live_events;
drop policy if exists "game participants read events" on public.live_events;
create policy "game participants read events" on public.live_events
for select to authenticated using (public.live_can_read_game(game_id));
drop policy if exists "scorers create events" on public.live_events;
drop policy if exists "active scorer creates events" on public.live_events;
create policy "active scorer creates events" on public.live_events
for insert to authenticated with check (public.live_can_score_game(game_id) and created_by=auth.uid());
drop policy if exists "scorers update events" on public.live_events;
drop policy if exists "active scorer updates events" on public.live_events;
create policy "active scorer updates events" on public.live_events
for update to authenticated
using (public.live_can_score_game(game_id))
with check (public.live_can_score_game(game_id));

drop policy if exists "members read recaps" on public.live_game_recaps;
drop policy if exists "game participants read recaps" on public.live_game_recaps;
create policy "game participants read recaps" on public.live_game_recaps
for select to authenticated using (public.live_can_read_game(game_id));
drop policy if exists "scorers manage recaps" on public.live_game_recaps;
drop policy if exists "active scorer manages recaps" on public.live_game_recaps;
create policy "active scorer manages recaps" on public.live_game_recaps
for all to authenticated
using (public.live_can_score_game(game_id))
with check (public.live_can_score_game(game_id));

drop policy if exists "members read deliveries" on public.live_deliveries;
drop policy if exists "game participants read deliveries" on public.live_deliveries;
create policy "game participants read deliveries" on public.live_deliveries
for select to authenticated using (
  exists (
    select 1 from public.live_events e
    where e.id=event_id and public.live_can_read_game(e.game_id)
  )
);

drop policy if exists "members read delivery attempts" on public.live_delivery_attempts;
drop policy if exists "game participants read delivery attempts" on public.live_delivery_attempts;
create policy "game participants read delivery attempts" on public.live_delivery_attempts
for select to authenticated using (
  exists (
    select 1 from public.live_deliveries d
    join public.live_events e on e.id=d.event_id
    where d.id=delivery_id and public.live_can_read_game(e.game_id)
  )
);

-- Realtime control changes immediately make the previous scorer read-only.
do $$
begin
  begin alter publication supabase_realtime add table public.live_game_scorer_sessions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.live_game_scorer_audit; exception when duplicate_object then null; end;
end $$;

comment on table public.live_game_scorer_sessions is 'Game-scoped scoring controllers. Exactly one active session may write a game at a time.';
comment on table public.live_game_scorer_passes is 'Short-lived, single-use QR and code handoff passes. Raw tokens and codes are returned once and never stored.';
comment on table public.live_game_scorer_audit is 'Immutable audit history for scorer assignment, transfer, takeover, and game-end actions.';


-- The browser may read operational destination fields but not the Edge Function
-- secret-variable mapping. Owners retrieve that mapping only through the secured
-- configuration RPC below; Admins receive the same operational record with a
-- null secretName.
revoke select on public.live_destinations from authenticated;
grant select (
  id,team_id,provider,display_name,enabled,last_tested_at,last_test_status,
  last_test_error,created_by,created_at,updated_by,updated_at
) on public.live_destinations to authenticated;

create or replace function public.live_groupme_destination_config(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_role public.live_team_role;
  destination public.live_destinations%rowtype;
begin
  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=auth.uid();
  if caller_role is null then raise exception 'Team membership required'; end if;
  select * into destination
  from public.live_destinations
  where team_id=target_team_id and provider='groupme';
  if destination.id is null then return null; end if;
  return jsonb_build_object(
    'id',destination.id,
    'teamId',destination.team_id,
    'displayName',destination.display_name,
    'secretName',case when caller_role='owner' then destination.secret_name else null end,
    'enabled',destination.enabled,
    'lastTestedAt',destination.last_tested_at,
    'lastTestStatus',destination.last_test_status,
    'lastTestError',destination.last_test_error,
    'updatedAt',destination.updated_at
  );
end;
$$;

grant execute on function public.live_groupme_destination_config(uuid) to authenticated;

-- Admins may rename, enable, and test a GroupMe destination without seeing or
-- replacing the underlying Edge Function secret identifier. Only the Platform
-- Owner may change the secret-name mapping.
create or replace function public.live_upsert_groupme_destination(
  target_team_id uuid,
  destination_name text,
  destination_secret_name text default null,
  destination_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  destination public.live_destinations%rowtype;
  existing_destination public.live_destinations%rowtype;
  cleaned_secret text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into caller_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin') then
    raise exception 'Owner or Admin role required';
  end if;
  if nullif(trim(destination_name),'') is null then
    raise exception 'Destination display name is required';
  end if;

  select * into existing_destination
  from public.live_destinations
  where team_id=target_team_id and provider='groupme';

  if caller_role='owner' then
    cleaned_secret := upper(regexp_replace(
      coalesce(nullif(trim(destination_secret_name),''),existing_destination.secret_name,'GROUPME_BOT_ID'),
      '[^A-Za-z0-9_]+','_','g'
    ));
    if cleaned_secret !~ '^[A-Z][A-Z0-9_]{2,127}$' then
      raise exception 'Secret name must use uppercase letters, numbers, and underscores';
    end if;
  else
    cleaned_secret := coalesce(existing_destination.secret_name,'GROUPME_BOT_ID');
  end if;

  insert into public.live_destinations(
    team_id,provider,display_name,secret_name,enabled,created_by,updated_by,updated_at
  ) values (
    target_team_id,'groupme',trim(destination_name),cleaned_secret,destination_enabled,caller,caller,now()
  )
  on conflict (team_id,provider) do update
    set display_name=excluded.display_name,
        secret_name=case when caller_role='owner' then excluded.secret_name else public.live_destinations.secret_name end,
        enabled=excluded.enabled,
        updated_by=caller,
        updated_at=now()
  returning * into destination;

  return jsonb_build_object(
    'id',destination.id,
    'teamId',destination.team_id,
    'displayName',destination.display_name,
    'secretName',case when caller_role='owner' then destination.secret_name else null end,
    'enabled',destination.enabled,
    'lastTestedAt',destination.last_tested_at,
    'lastTestStatus',destination.last_test_status,
    'lastTestError',destination.last_test_error
  );
end;
$$;

grant execute on function public.live_upsert_groupme_destination(uuid,text,text,boolean) to authenticated;

-- Exposed scorer-control functions are callable only by authenticated sessions.
revoke all on function public.live_is_anonymous_user() from public,anon;
revoke all on function public.live_can_read_game(uuid) from public,anon;
revoke all on function public.live_can_score_game(uuid) from public,anon;
revoke all on function public.live_can_manage_game_scorer(uuid) from public,anon;
revoke all on function public.live_scorer_control_status(uuid) from public,anon;
revoke all on function public.live_claim_game_scorer(uuid,text) from public,anon;
revoke all on function public.live_create_scorer_handoff_pass(uuid) from public,anon;
revoke all on function public.live_preview_scorer_handoff_pass(text,text,uuid) from public,anon;
revoke all on function public.live_accept_scorer_handoff_pass(text,text,uuid,text) from public,anon;
revoke all on function public.live_guest_game_workspace(uuid) from public,anon;
revoke all on function public.live_take_over_game_scorer(uuid,text) from public,anon;
revoke all on function public.live_revoke_scorer_handoff_pass(uuid) from public,anon;
revoke all on function public.live_groupme_destination_config(uuid) from public,anon;
revoke all on function public.live_upsert_groupme_destination(uuid,text,text,boolean) from public,anon;
