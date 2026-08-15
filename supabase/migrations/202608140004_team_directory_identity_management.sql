-- WPI 7.60.2 — Team Directory & Identity Management.
-- Connects private WPI Live teams to stable public WPI team-family identities,
-- adds club-scoped explicit aliases, and makes manual-opponent reconciliation
-- reusable for future games. Public WPI team IDs remain season-specific; no
-- prior-season team ID is silently promoted to the current Live season.
-- No scorer, roster, GroupMe, Follow, archive or delivery authority is broadened.

alter table public.live_teams
  add column if not exists canonical_wpi_team_family_key text,
  add column if not exists identity_link_status text not null default 'unlinked',
  add column if not exists identity_linked_at timestamptz,
  add column if not exists identity_linked_by uuid references auth.users(id) on delete set null,
  add column if not exists identity_display_name text;

do $$
begin
  alter table public.live_teams
    add constraint live_teams_identity_link_status_check
    check (identity_link_status in ('unlinked','family_linked','exact_verified'));
exception when duplicate_object then null;
end $$;

create index if not exists live_teams_family_identity_idx
  on public.live_teams(canonical_wpi_team_family_key)
  where canonical_wpi_team_family_key is not null;

comment on column public.live_teams.canonical_wpi_team_family_key is
  'Stable public identity bridge: canonical club + age group + gender + squad/level. This is intentionally separate from season-specific canonical_wpi_team_id.';
comment on column public.live_teams.identity_link_status is
  'unlinked, family_linked, or exact_verified. 7.60.2 never infers exact_verified from a prior-season public team ID.';

create table if not exists public.live_identity_aliases (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.live_clubs(id) on delete cascade,
  raw_alias text not null check (char_length(trim(raw_alias)) between 1 and 120),
  normalized_alias text not null check (char_length(trim(normalized_alias)) between 1 and 120),
  canonical_wpi_club_id text not null,
  canonical_wpi_team_family_key text,
  canonical_wpi_team_id text,
  canonical_display_name text not null check (char_length(trim(canonical_display_name)) between 1 and 160),
  source text not null default 'owner_alias',
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.live_identity_aliases
    add constraint live_identity_alias_source_check
    check (source in ('owner_alias','manual_opponent_resolution','platform_review'));
exception when duplicate_object then null;
end $$;

create unique index if not exists live_identity_alias_active_name_idx
  on public.live_identity_aliases(club_id,normalized_alias)
  where active=true;
create index if not exists live_identity_alias_target_idx
  on public.live_identity_aliases(canonical_wpi_club_id,canonical_wpi_team_family_key,canonical_wpi_team_id)
  where active=true;

create table if not exists public.live_identity_audit (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.live_clubs(id) on delete cascade,
  live_team_id uuid references public.live_teams(id) on delete set null,
  alias_id uuid references public.live_identity_aliases(id) on delete set null,
  action text not null,
  raw_alias text,
  previous_state jsonb,
  next_state jsonb,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.live_identity_aliases enable row level security;
alter table public.live_identity_audit enable row level security;

drop policy if exists "identity aliases direct access denied" on public.live_identity_aliases;
create policy "identity aliases direct access denied" on public.live_identity_aliases
  for all to authenticated using (false) with check (false);
drop policy if exists "identity audit direct access denied" on public.live_identity_audit;
create policy "identity audit direct access denied" on public.live_identity_audit
  for all to authenticated using (false) with check (false);

create or replace function public.live_identity_normalize_v1(value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(value,'')),'[[:space:]]+',' ','g'));
$$;

create or replace function public.live_identity_aliases_for_club_v1(target_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  allowed boolean := false;
  rows jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  allowed := public.live_has_club_role(target_club_id,array['owner','admin']::public.live_club_role[])
    or exists(
      select 1 from public.live_team_members m
      join public.live_teams t on t.id=m.team_id
      where m.user_id=caller and t.club_id=target_club_id and t.active=true
    )
    or exists(
      select 1 from public.live_team_follows f
      join public.live_teams t on t.id=f.team_id
      where f.user_id=caller and t.club_id=target_club_id and t.active=true
    );
  if not allowed then raise exception 'Club relationship required'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'aliasId',a.id,
    'rawAlias',a.raw_alias,
    'normalizedAlias',a.normalized_alias,
    'canonicalWpiClubId',a.canonical_wpi_club_id,
    'canonicalWpiTeamFamilyKey',a.canonical_wpi_team_family_key,
    'canonicalWpiTeamId',a.canonical_wpi_team_id,
    'canonicalDisplayName',a.canonical_display_name,
    'source',a.source,
    'createdAt',a.created_at,
    'updatedAt',a.updated_at
  ) order by lower(a.raw_alias)),'[]'::jsonb)
  into rows
  from public.live_identity_aliases a
  where a.club_id=target_club_id and a.active=true;
  return rows;
end;
$$;

revoke all on function public.live_identity_aliases_for_club_v1(uuid) from public,anon;
grant execute on function public.live_identity_aliases_for_club_v1(uuid) to authenticated;

create or replace function public.live_club_identity_context_v1(target_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  selected_club public.live_clubs%rowtype;
  teams_json jsonb := '[]'::jsonb;
  aliases_json jsonb := '[]'::jsonb;
  unresolved_json jsonb := '[]'::jsonb;
  audit_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_has_club_role(target_club_id,array['owner','admin']::public.live_club_role[]) then
    raise exception 'Club Owner/Admin access required';
  end if;
  select * into selected_club from public.live_clubs where id=target_club_id and active=true;
  if selected_club.id is null then raise exception 'Active club not found'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'teamId',t.id,
    'teamName',t.name,
    'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
    'ageGroup',t.age_group,
    'gender',t.gender,
    'squadLabel',t.squad_label,
    'competitiveSeason',t.competitive_season,
    'canonicalWpiTeamId',t.canonical_wpi_team_id,
    'canonicalWpiTeamFamilyKey',t.canonical_wpi_team_family_key,
    'identityLinkStatus',t.identity_link_status,
    'identityDisplayName',t.identity_display_name,
    'identityLinkedAt',t.identity_linked_at,
    'active',t.active
  ) order by coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'999')::integer,lower(coalesce(t.display_label,t.name))),'[]'::jsonb)
  into teams_json
  from public.live_teams t where t.club_id=target_club_id and t.active=true;

  aliases_json := public.live_identity_aliases_for_club_v1(target_club_id);

  select coalesce(jsonb_agg(row_data order by last_seen_at desc,normalized_name),'[]'::jsonb)
  into unresolved_json
  from (
    select agg.normalized_name,agg.last_seen_at,
      jsonb_build_object(
        'opponentName',latest.opponent_name,
        'normalizedName',agg.normalized_name,
        'gameCount',agg.game_count,
        'teamLabels',agg.team_labels,
        'lastSeenAt',agg.last_seen_at,
        'lastGameId',latest.game_id,
        'lastGameTeamId',latest.team_id
      ) row_data
    from (
      select public.live_identity_normalize_v1(g.opponent_name) normalized_name,
        count(*)::int game_count,
        jsonb_agg(distinct coalesce(nullif(trim(t.display_label),''),t.name)) team_labels,
        max(coalesce(g.ended_at,g.started_at,g.scheduled_at,g.updated_at,g.created_at)) last_seen_at
      from public.live_games g
      join public.live_teams t on t.id=g.team_id
      where t.club_id=target_club_id and g.source_mode='manual'
        and nullif(trim(coalesce(g.opponent_name,'')),'') is not null
        and g.opponent_wpi_team_id is null and g.opponent_wpi_club_id is null
      group by public.live_identity_normalize_v1(g.opponent_name)
    ) agg
    join lateral (
      select g.id game_id,g.team_id,g.opponent_name
      from public.live_games g join public.live_teams t on t.id=g.team_id
      where t.club_id=target_club_id
        and public.live_identity_normalize_v1(g.opponent_name)=agg.normalized_name
        and g.source_mode='manual'
        and g.opponent_wpi_team_id is null and g.opponent_wpi_club_id is null
      order by coalesce(g.ended_at,g.started_at,g.scheduled_at,g.updated_at,g.created_at) desc limit 1
    ) latest on true
  ) q;

  select coalesce(jsonb_agg(jsonb_build_object(
    'action',a.action,'liveTeamId',a.live_team_id,'aliasId',a.alias_id,'rawAlias',a.raw_alias,
    'createdAt',a.created_at
  ) order by a.created_at desc),'[]'::jsonb)
  into audit_json
  from (select * from public.live_identity_audit where club_id=target_club_id order by created_at desc limit 30) a;

  return jsonb_build_object(
    'club',jsonb_build_object(
      'clubId',selected_club.id,'clubName',selected_club.name,'clubDisplayName',selected_club.display_name,
      'canonicalWpiClubId',selected_club.canonical_wpi_club_id,'canonicalSlug',selected_club.canonical_slug,
      'logoUrl',selected_club.logo_url,'region',selected_club.region
    ),
    'teams',teams_json,
    'aliases',aliases_json,
    'unresolvedOpponents',unresolved_json,
    'recentAudit',audit_json,
    'policy','explicit_family_link_and_alias_reconciliation'
  );
end;
$$;

revoke all on function public.live_club_identity_context_v1(uuid) from public,anon;
grant execute on function public.live_club_identity_context_v1(uuid) to authenticated;

create or replace function public.live_set_team_identity_family_v1(
  target_team_id uuid,
  requested_family_key text,
  requested_wpi_club_id text,
  requested_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  selected_team public.live_teams%rowtype;
  selected_club public.live_clubs%rowtype;
  clean_family text := nullif(trim(coalesce(requested_family_key,'')),'');
  clean_club text := nullif(trim(coalesce(requested_wpi_club_id,'')),'');
  clean_display text := nullif(trim(coalesce(requested_display_name,'')),'');
  previous jsonb;
  family_parts text[];
  family_age text;
  family_gender text;
  family_level text;
  team_squad text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into selected_team from public.live_teams where id=target_team_id and active=true;
  if selected_team.id is null then raise exception 'Active Live team not found'; end if;
  select * into selected_club from public.live_clubs where id=selected_team.club_id and active=true;
  if selected_club.id is null then raise exception 'Active Live club not found'; end if;
  if not (public.live_has_club_role(selected_club.id,array['owner','admin']::public.live_club_role[])
          or public.live_has_team_role(target_team_id,array['owner','admin']::public.live_team_role[])) then
    raise exception 'Owner/Admin access required';
  end if;
  if clean_family is null or clean_club is null or clean_display is null then raise exception 'Canonical team family is required'; end if;
  if selected_club.canonical_wpi_club_id is null then raise exception 'Link the club to a canonical WPI club before linking a team family'; end if;
  if clean_club <> selected_club.canonical_wpi_club_id then raise exception 'Team family must belong to this club canonical identity'; end if;

  family_parts := string_to_array(clean_family,'|');
  if coalesce(array_length(family_parts,1),0) <> 4 then raise exception 'Invalid WPI team family key'; end if;
  if family_parts[1] <> clean_club then raise exception 'Team family club does not match canonical club'; end if;
  family_age := family_parts[2];
  family_gender := family_parts[3];
  family_level := upper(family_parts[4]);
  team_squad := upper(coalesce(nullif(trim(selected_team.squad_label),''),'A'));
  if lower(family_age) <> lower(coalesce(selected_team.age_group,'')) then raise exception 'Team family age group does not match Live team'; end if;
  if lower(family_gender) <> lower(coalesce(selected_team.gender,'')) then raise exception 'Team family gender does not match Live team'; end if;
  if selected_team.squad_label is not null and family_level <> team_squad then raise exception 'Team family squad does not match Live team'; end if;

  previous := jsonb_build_object('familyKey',selected_team.canonical_wpi_team_family_key,'status',selected_team.identity_link_status,'displayName',selected_team.identity_display_name);
  update public.live_teams
  set canonical_wpi_team_family_key=clean_family,
      identity_link_status=case when canonical_wpi_team_id is not null then 'exact_verified' else 'family_linked' end,
      identity_display_name=clean_display,
      identity_linked_at=now(),identity_linked_by=caller,updated_at=now()
  where id=target_team_id;

  insert into public.live_identity_audit(club_id,live_team_id,action,previous_state,next_state,actor_user_id)
  values(selected_club.id,target_team_id,'team_family_linked',previous,
    jsonb_build_object('familyKey',clean_family,'canonicalWpiClubId',clean_club,'displayName',clean_display),caller);

  return jsonb_build_object('teamId',target_team_id,'canonicalWpiTeamFamilyKey',clean_family,'identityLinkStatus',case when selected_team.canonical_wpi_team_id is not null then 'exact_verified' else 'family_linked' end,'displayName',clean_display);
end;
$$;

revoke all on function public.live_set_team_identity_family_v1(uuid,text,text,text) from public,anon;
grant execute on function public.live_set_team_identity_family_v1(uuid,text,text,text) to authenticated;

create or replace function public.live_clear_team_identity_family_v1(target_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  selected_team public.live_teams%rowtype;
  selected_club public.live_clubs%rowtype;
  previous jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into selected_team from public.live_teams where id=target_team_id and active=true;
  if selected_team.id is null then raise exception 'Active Live team not found'; end if;
  select * into selected_club from public.live_clubs where id=selected_team.club_id and active=true;
  if not (public.live_has_club_role(selected_club.id,array['owner','admin']::public.live_club_role[])
          or public.live_has_team_role(target_team_id,array['owner','admin']::public.live_team_role[])) then
    raise exception 'Owner/Admin access required';
  end if;
  previous := jsonb_build_object('familyKey',selected_team.canonical_wpi_team_family_key,'status',selected_team.identity_link_status,'displayName',selected_team.identity_display_name);
  update public.live_teams
  set canonical_wpi_team_family_key=null,
      identity_display_name=null,
      identity_link_status=case when canonical_wpi_team_id is not null then 'exact_verified' else 'unlinked' end,
      identity_linked_at=now(),identity_linked_by=caller,updated_at=now()
  where id=target_team_id;
  insert into public.live_identity_audit(club_id,live_team_id,action,previous_state,next_state,actor_user_id)
  values(selected_club.id,target_team_id,'team_family_cleared',previous,jsonb_build_object('canonicalWpiTeamId',selected_team.canonical_wpi_team_id),caller);
  return jsonb_build_object('teamId',target_team_id,'identityLinkStatus',case when selected_team.canonical_wpi_team_id is not null then 'exact_verified' else 'unlinked' end);
end;
$$;

revoke all on function public.live_clear_team_identity_family_v1(uuid) from public,anon;
grant execute on function public.live_clear_team_identity_family_v1(uuid) to authenticated;

create or replace function public.live_upsert_identity_alias_v1(
  target_club_id uuid,
  requested_raw_alias text,
  requested_wpi_club_id text,
  requested_family_key text default null,
  requested_wpi_team_id text default null,
  requested_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  clean_alias text := nullif(trim(coalesce(requested_raw_alias,'')),'');
  normalized text := public.live_identity_normalize_v1(requested_raw_alias);
  clean_club text := nullif(trim(coalesce(requested_wpi_club_id,'')),'');
  clean_family text := nullif(trim(coalesce(requested_family_key,'')),'');
  clean_team text := nullif(trim(coalesce(requested_wpi_team_id,'')),'');
  clean_display text := nullif(trim(coalesce(requested_display_name,'')),'');
  row public.live_identity_aliases%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_has_club_role(target_club_id,array['owner','admin']::public.live_club_role[]) then raise exception 'Club Owner/Admin access required'; end if;
  if clean_alias is null or clean_club is null or clean_display is null then raise exception 'Alias and canonical identity are required'; end if;
  if char_length(normalized)>120 then raise exception 'Alias is too long'; end if;

  insert into public.live_identity_aliases(club_id,raw_alias,normalized_alias,canonical_wpi_club_id,canonical_wpi_team_family_key,canonical_wpi_team_id,canonical_display_name,source,created_by)
  values(target_club_id,clean_alias,normalized,clean_club,clean_family,clean_team,clean_display,'owner_alias',caller)
  on conflict (club_id,normalized_alias) where active=true do update
    set raw_alias=excluded.raw_alias,canonical_wpi_club_id=excluded.canonical_wpi_club_id,
        canonical_wpi_team_family_key=excluded.canonical_wpi_team_family_key,canonical_wpi_team_id=excluded.canonical_wpi_team_id,
        canonical_display_name=excluded.canonical_display_name,source='owner_alias',updated_at=now()
  returning * into row;

  insert into public.live_identity_audit(club_id,alias_id,action,raw_alias,next_state,actor_user_id)
  values(target_club_id,row.id,'alias_upserted',clean_alias,jsonb_build_object('canonicalWpiClubId',clean_club,'familyKey',clean_family,'canonicalWpiTeamId',clean_team,'displayName',clean_display),caller);
  return jsonb_build_object('aliasId',row.id,'rawAlias',row.raw_alias,'normalizedAlias',row.normalized_alias,'canonicalWpiClubId',row.canonical_wpi_club_id,'canonicalWpiTeamFamilyKey',row.canonical_wpi_team_family_key,'canonicalWpiTeamId',row.canonical_wpi_team_id,'canonicalDisplayName',row.canonical_display_name);
end;
$$;

revoke all on function public.live_upsert_identity_alias_v1(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.live_upsert_identity_alias_v1(uuid,text,text,text,text,text) to authenticated;

create or replace function public.live_remove_identity_alias_v1(target_alias_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  row public.live_identity_aliases%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into row from public.live_identity_aliases where id=target_alias_id and active=true;
  if row.id is null then raise exception 'Active alias not found'; end if;
  if not public.live_has_club_role(row.club_id,array['owner','admin']::public.live_club_role[]) then raise exception 'Club Owner/Admin access required'; end if;
  update public.live_identity_aliases set active=false,updated_at=now() where id=row.id;
  insert into public.live_identity_audit(club_id,alias_id,action,raw_alias,previous_state,actor_user_id)
  values(row.club_id,row.id,'alias_removed',row.raw_alias,jsonb_build_object('canonicalWpiClubId',row.canonical_wpi_club_id,'familyKey',row.canonical_wpi_team_family_key,'canonicalWpiTeamId',row.canonical_wpi_team_id,'displayName',row.canonical_display_name),caller);
  return jsonb_build_object('aliasId',row.id,'active',false);
end;
$$;

revoke all on function public.live_remove_identity_alias_v1(uuid) from public,anon;
grant execute on function public.live_remove_identity_alias_v1(uuid) to authenticated;

-- Preserve the existing 7.58.10 signature so current dashboard callers keep working,
-- while also recording the explicit resolution as a reusable club-scoped alias.
create or replace function public.live_resolve_manual_opponent_v1(
  target_club_id uuid,
  requested_raw_name text,
  requested_wpi_team_id text default null,
  requested_wpi_club_id text default null,
  requested_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  cleaned_raw text := nullif(trim(coalesce(requested_raw_name,'')),'');
  cleaned_team text := nullif(trim(coalesce(requested_wpi_team_id,'')),'');
  cleaned_club text := nullif(trim(coalesce(requested_wpi_club_id,'')),'');
  cleaned_display text := nullif(trim(coalesce(requested_display_name,'')),'');
  normalized text := public.live_identity_normalize_v1(requested_raw_name);
  alias_row public.live_identity_aliases%rowtype;
  changed integer := 0;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_has_club_role(target_club_id,array['owner','admin']::public.live_club_role[]) then raise exception 'Club Owner/Admin access required'; end if;
  if cleaned_raw is null then raise exception 'Raw opponent name is required'; end if;
  if cleaned_team is null and cleaned_club is null then raise exception 'Choose an existing WPI club or team'; end if;
  if cleaned_club is null then raise exception 'Canonical WPI club is required'; end if;
  cleaned_display := coalesce(cleaned_display,cleaned_raw);

  update public.live_games g
  set opponent_wpi_team_id=cleaned_team,
      opponent_wpi_club_id=cleaned_club,
      state_snapshot=jsonb_set(coalesce(g.state_snapshot,'{}'::jsonb),'{identityReview}',jsonb_build_object(
        'rawName',g.opponent_name,'canonicalDisplayName',cleaned_display,'canonicalWpiTeamId',cleaned_team,
        'canonicalWpiClubId',cleaned_club,'resolvedAt',now(),'resolvedBy',caller,'method','owner_explicit'
      ),true),updated_at=now(),updated_by=caller
  from public.live_teams t
  where g.team_id=t.id and t.club_id=target_club_id and g.source_mode='manual'
    and public.live_identity_normalize_v1(g.opponent_name)=normalized
    and g.opponent_wpi_team_id is null and g.opponent_wpi_club_id is null;
  get diagnostics changed = row_count;
  if changed=0 then raise exception 'No unresolved manual games matched that opponent name'; end if;

  insert into public.live_identity_aliases(club_id,raw_alias,normalized_alias,canonical_wpi_club_id,canonical_wpi_team_id,canonical_display_name,source,created_by)
  values(target_club_id,cleaned_raw,normalized,cleaned_club,cleaned_team,cleaned_display,'manual_opponent_resolution',caller)
  on conflict (club_id,normalized_alias) where active=true do update
    set raw_alias=excluded.raw_alias,canonical_wpi_club_id=excluded.canonical_wpi_club_id,
        canonical_wpi_team_id=excluded.canonical_wpi_team_id,canonical_display_name=excluded.canonical_display_name,
        source='manual_opponent_resolution',updated_at=now()
  returning * into alias_row;

  insert into public.live_identity_audit(club_id,alias_id,action,raw_alias,next_state,actor_user_id)
  values(target_club_id,alias_row.id,'manual_opponent_resolved',cleaned_raw,
    jsonb_build_object('canonicalWpiClubId',cleaned_club,'canonicalWpiTeamId',cleaned_team,'displayName',cleaned_display,'updatedGames',changed),caller);

  return jsonb_build_object('clubId',target_club_id,'rawName',cleaned_raw,'canonicalWpiTeamId',cleaned_team,'canonicalWpiClubId',cleaned_club,'canonicalDisplayName',cleaned_display,'updatedGames',changed,'aliasId',alias_row.id,'aliasSaved',true,'resolvedAt',now());
end;
$$;

revoke all on function public.live_resolve_manual_opponent_v1(uuid,text,text,text,text) from public,anon;
grant execute on function public.live_resolve_manual_opponent_v1(uuid,text,text,text,text) to authenticated;

comment on table public.live_identity_aliases is
  'Club-scoped explicit identity aliases. A saved raw label can resolve future game setup to a canonical WPI club/team without changing historical raw labels.';
comment on function public.live_club_identity_context_v1(uuid) is
  'Owner/Admin identity-management context: Live team-family links, explicit aliases, unresolved manual opponents, and recent audit.';
comment on function public.live_set_team_identity_family_v1(uuid,text,text,text) is
  'Explicitly links a Live team to a stable WPI team family. Does not infer or assign a season-specific public team ID.';
