-- WPI 7.57.16 — Tournament & Weekend Record Experience + Account Registry.
-- Builds a durable, season-aware tournament/weekend archive experience and
-- formalizes operational account signup records (name/email/timestamps) without
-- exposing a broad user directory to the browser.
-- No passwords, auth tokens, GroupMe credentials, OpenAI keys, or other secrets
-- are stored by this migration.

-- ---------------------------------------------------------------------------
-- Durable operational account registry
-- ---------------------------------------------------------------------------
create table if not exists public.live_account_registry (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  signup_source text not null default 'unknown'
    check (signup_source in ('owner_bootstrap','team_invite','legacy','unknown')),
  initial_team_id uuid references public.live_teams(id) on delete set null,
  initial_invite_id uuid references public.live_team_invites(id) on delete set null,
  registered_at timestamptz not null default now(),
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists live_account_registry_registered_idx
  on public.live_account_registry(registered_at desc);
create index if not exists live_account_registry_email_idx
  on public.live_account_registry(lower(email));

alter table public.live_account_registry enable row level security;

comment on table public.live_account_registry is
  'Operational WPI Live signup registry. Stores account identity/contact and lifecycle timestamps for product operations; contains no passwords or auth secrets and has no broad authenticated read policy.';
comment on column public.live_account_registry.signup_source is
  'How the WPI Live account first entered the product: owner bootstrap, team invite, legacy account, or unknown.';

create or replace function public.live_capture_account_registry()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  invite_row public.live_team_invites%rowtype;
  source_value text := 'unknown';
  existing_source text;
begin
  select * into invite_row
  from public.live_team_invites i
  where lower(i.email)=lower(coalesce(new.email,''))
    and (i.accepted_by=new.id or i.status in ('pending','accepted'))
  order by case when i.accepted_by=new.id then 0 else 1 end, i.created_at asc
  limit 1;

  if invite_row.id is not null then
    source_value := 'team_invite';
  elsif not exists(select 1 from public.live_teams) then
    source_value := 'owner_bootstrap';
  elsif tg_op='INSERT' then
    source_value := 'unknown';
  else
    source_value := 'legacy';
  end if;

  select signup_source into existing_source
  from public.live_account_registry
  where user_id=new.id;

  insert into public.live_account_registry(
    user_id,email,display_name,signup_source,initial_team_id,initial_invite_id,
    registered_at,email_confirmed_at,last_sign_in_at,updated_at
  ) values (
    new.id,
    lower(coalesce(new.email,'')),
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name','')),''),
    source_value,
    invite_row.team_id,
    invite_row.id,
    coalesce(new.created_at,now()),
    new.email_confirmed_at,
    new.last_sign_in_at,
    now()
  )
  on conflict (user_id) do update
    set email=excluded.email,
        display_name=coalesce(excluded.display_name,public.live_account_registry.display_name),
        signup_source=case
          when public.live_account_registry.signup_source in ('owner_bootstrap','team_invite') then public.live_account_registry.signup_source
          when excluded.signup_source in ('owner_bootstrap','team_invite') then excluded.signup_source
          else coalesce(public.live_account_registry.signup_source,excluded.signup_source,'legacy')
        end,
        initial_team_id=coalesce(public.live_account_registry.initial_team_id,excluded.initial_team_id),
        initial_invite_id=coalesce(public.live_account_registry.initial_invite_id,excluded.initial_invite_id),
        email_confirmed_at=excluded.email_confirmed_at,
        last_sign_in_at=excluded.last_sign_in_at,
        updated_at=now();

  return new;
end;
$$;

-- Capture new accounts and keep lifecycle timestamps current as Supabase Auth
-- updates email verification / last sign-in data.
drop trigger if exists on_auth_user_updated_live_account_registry on auth.users;
create trigger on_auth_user_updated_live_account_registry
  after insert or update of email,raw_user_meta_data,email_confirmed_at,last_sign_in_at on auth.users
  for each row execute function public.live_capture_account_registry();

-- Backfill all existing WPI Live accounts. The user's original auth.created_at is
-- retained as registered_at; no synthetic signup time is created.
insert into public.live_account_registry(
  user_id,email,display_name,signup_source,initial_team_id,initial_invite_id,
  registered_at,email_confirmed_at,last_sign_in_at,updated_at
)
select
  u.id,
  lower(coalesce(u.email,'')),
  nullif(trim(coalesce(u.raw_user_meta_data->>'display_name','')),''),
  case
    when i.id is not null then 'team_invite'
    when u.id=(select m.user_id from public.live_team_members m where m.role='owner' order by m.created_at asc limit 1) then 'owner_bootstrap'
    else 'legacy'
  end,
  i.team_id,
  i.id,
  coalesce(u.created_at,now()),
  u.email_confirmed_at,
  u.last_sign_in_at,
  now()
from auth.users u
left join lateral (
  select ti.id,ti.team_id
  from public.live_team_invites ti
  where ti.accepted_by=u.id or lower(ti.email)=lower(coalesce(u.email,''))
  order by case when ti.accepted_by=u.id then 0 else 1 end,ti.created_at asc
  limit 1
) i on true
on conflict (user_id) do update
  set email=excluded.email,
      display_name=coalesce(excluded.display_name,public.live_account_registry.display_name),
      signup_source=case
        when public.live_account_registry.signup_source in ('owner_bootstrap','team_invite') then public.live_account_registry.signup_source
        when excluded.signup_source in ('owner_bootstrap','team_invite') then excluded.signup_source
        else excluded.signup_source
      end,
      initial_team_id=coalesce(public.live_account_registry.initial_team_id,excluded.initial_team_id),
      initial_invite_id=coalesce(public.live_account_registry.initial_invite_id,excluded.initial_invite_id),
      email_confirmed_at=excluded.email_confirmed_at,
      last_sign_in_at=excluded.last_sign_in_at,
      updated_at=now();

-- ---------------------------------------------------------------------------
-- Season-aware tournament / scrimmage-weekend archive
-- ---------------------------------------------------------------------------
create or replace function public.live_game_series_archive_v2(target_team_id uuid)
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
  seasons_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role into member_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  if member_role is null then raise exception 'Team membership required'; end if;

  select coalesce(jsonb_agg(season_name order by season_name desc),'[]'::jsonb)
  into seasons_json
  from (
    select distinct s.competitive_season as season_name
    from public.live_game_series s
    where s.team_id=target_team_id
  ) seasons;

  select coalesce(jsonb_agg(series_row order by competitive_season desc,sort_date desc nulls last,created_at desc),'[]'::jsonb)
  into series_json
  from (
    select
      s.created_at,
      s.competitive_season,
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
        'venues',summary.venues,
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
        coalesce(
          jsonb_agg(distinct nullif(trim(g.venue),'')) filter (where nullif(trim(g.venue),'') is not null),
          '[]'::jsonb
        ) as venues,
        coalesce(jsonb_agg(
          jsonb_build_object(
            'id',g.id,
            'teamName',g.team_name_snapshot,
            'opponentName',g.opponent_name,
            'opponentSourceName',g.opponent_source_name,
            'scheduledAt',g.scheduled_at,
            'startedAt',g.started_at,
            'endedAt',g.ended_at,
            'venue',g.venue,
            'status',g.status,
            'teamScore',g.team_score,
            'opponentScore',g.opponent_score,
            'teamLogoUrl',g.team_logo_url,
            'opponentLogoUrl',g.opponent_logo_url,
            'officialDivisionLabel',g.official_division_label,
            'officialStage',g.official_stage,
            'officialGameNumber',g.official_game_number,
            'reconciliationStatus',g.reconciliation_status,
            'recapAvailable',(r.game_id is not null)
          ) order by coalesce(g.scheduled_at,g.ended_at,g.created_at)
        ) filter (where g.status='final'),'[]'::jsonb) as games
      from public.live_games g
      left join public.live_game_recaps r on r.game_id=g.id
      where g.series_id=s.id
    ) summary
    where s.team_id=target_team_id and summary.game_count>0
  ) rows;

  return jsonb_build_object(
    'role',member_role,
    'seasons',seasons_json,
    'series',series_json
  );
end;
$$;

grant execute on function public.live_game_series_archive_v2(uuid) to authenticated;
