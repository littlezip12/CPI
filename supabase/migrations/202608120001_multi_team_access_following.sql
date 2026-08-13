-- WPI 7.58.3 — Multi-Team Access & Following.
-- Membership remains the sole source of operational permissions. Following is a
-- separate read-only relationship and never grants scoring, roster, access, or
-- GroupMe administration rights.

create table if not exists public.live_team_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.live_teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id,team_id)
);

create index if not exists live_team_follows_team_idx
  on public.live_team_follows(team_id,user_id);

comment on table public.live_team_follows is
  'Read-only team-follow relationship. A follow is not live_team_members membership and grants no operational permission.';

alter table public.live_team_follows enable row level security;
revoke all on public.live_team_follows from anon,authenticated;
grant select on public.live_team_follows to authenticated;

-- A follow remains valid only while the user is still a permanent Supporter or
-- Scorer on another active team in the same Lamorinda club. This prevents stale
-- follow rows from retaining visibility after the source membership is removed.
create or replace function public.live_is_team_follower(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.live_team_follows f
    join public.live_teams target on target.id=f.team_id
    join public.live_clubs c on c.id=target.club_id
    where f.user_id=auth.uid()
      and f.team_id=target_team_id
      and target.active=true
      and c.canonical_wpi_club_id='club-lamorinda'
      and exists (
        select 1
        from public.live_team_members source_member
        join public.live_teams source_team on source_team.id=source_member.team_id
        where source_member.user_id=f.user_id
          and source_member.role in ('scorer','viewer')
          and source_team.club_id=target.club_id
          and source_team.active=true
      )
  );
$$;

grant execute on function public.live_is_team_follower(uuid) to authenticated;

-- Keep scorer-session/audit access on the older live_can_read_game helper.
-- This broader helper is only for read-only game content that Following is
-- intended to expose: score/state, lineups, play-by-play, and recaps.
create or replace function public.live_can_view_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.live_can_read_game(target_game_id)
    or exists (
      select 1
      from public.live_games g
      where g.id=target_game_id
        and public.live_is_team_follower(g.team_id)
    );
$$;

grant execute on function public.live_can_view_game(uuid) to authenticated;

-- Followers may read the minimum team/game surfaces needed for a read-only
-- follow experience. All existing write policies continue to use membership,
-- manager roles, or active scorer control and are intentionally unchanged.
drop policy if exists "members and guest scorers read teams" on public.live_teams;
drop policy if exists "members guest scorers and followers read teams" on public.live_teams;
create policy "members guest scorers and followers read teams" on public.live_teams
for select to authenticated using (
  public.live_is_team_member(live_teams.id)
  or public.live_is_team_follower(live_teams.id)
  or exists (
    select 1 from public.live_games g
    join public.live_game_scorer_sessions s on s.game_id=g.id
    where g.team_id=live_teams.id
      and s.user_id=auth.uid()
      and s.status in ('active','read_only')
  )
);

drop policy if exists "game participants read games" on public.live_games;
drop policy if exists "game participants and followers read games" on public.live_games;
create policy "game participants and followers read games" on public.live_games
for select to authenticated using (
  public.live_is_team_member(live_games.team_id)
  or public.live_can_view_game(live_games.id)
);

drop policy if exists "game participants read lineups" on public.live_lineups;
drop policy if exists "game participants and followers read lineups" on public.live_lineups;
create policy "game participants and followers read lineups" on public.live_lineups
for select to authenticated using (public.live_can_view_game(live_lineups.game_id));

drop policy if exists "game participants read events" on public.live_events;
drop policy if exists "game participants and followers read events" on public.live_events;
create policy "game participants and followers read events" on public.live_events
for select to authenticated using (public.live_can_view_game(live_events.game_id));

drop policy if exists "members read recaps" on public.live_game_recaps;
drop policy if exists "game participants read recaps" on public.live_game_recaps;
drop policy if exists "game participants and followers read recaps" on public.live_game_recaps;
create policy "game participants and followers read recaps" on public.live_game_recaps
for select to authenticated using (public.live_can_view_game(live_game_recaps.game_id));

-- Users can see their own follow rows. Team Owners/Admins can see who follows
-- their team so membership and following remain visibly distinct in Team Access.
drop policy if exists live_team_follows_read on public.live_team_follows;
create policy live_team_follows_read on public.live_team_follows
for select to authenticated using (
  user_id=auth.uid()
  or public.live_has_team_role(team_id,array['owner','admin']::public.live_team_role[])
);

create or replace function public.live_set_team_follow_v1(
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
  eligible boolean := false;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select * into target_team from public.live_teams where id=target_team_id;
  if target_team.id is null or target_team.active=false then raise exception 'Team is unavailable'; end if;
  if target_team.club_id is null then raise exception 'This team is not attached to a followable club'; end if;

  select * into target_club from public.live_clubs where id=target_team.club_id;
  if target_club.id is null or target_club.canonical_wpi_club_id<>'club-lamorinda' then
    raise exception 'Following is currently available only for Lamorinda teams';
  end if;

  select role into existing_role
  from public.live_team_members
  where team_id=target_team_id and user_id=caller;

  -- Membership and Following are mutually unnecessary. If already a member,
  -- remove any stale follow row and report the membership relationship.
  if existing_role is not null then
    delete from public.live_team_follows where user_id=caller and team_id=target_team_id;
    return jsonb_build_object(
      'teamId',target_team_id,'following',false,'relationship','member','role',existing_role
    );
  end if;

  select exists (
    select 1
    from public.live_team_members m
    join public.live_teams source_team on source_team.id=m.team_id
    where m.user_id=caller
      and m.role in ('scorer','viewer')
      and source_team.club_id=target_team.club_id
      and source_team.active=true
  ) into eligible;

  if not eligible then
    raise exception 'A Lamorinda Supporter or Scorer membership is required to follow another Lamorinda team';
  end if;

  if coalesce(requested_follow,true) then
    insert into public.live_team_follows(user_id,team_id)
    values (caller,target_team_id)
    on conflict (user_id,team_id) do nothing;
  else
    delete from public.live_team_follows where user_id=caller and team_id=target_team_id;
  end if;

  return jsonb_build_object(
    'teamId',target_team_id,
    'following',coalesce(requested_follow,true),
    'relationship',case when coalesce(requested_follow,true) then 'following' else 'none' end
  );
end;
$$;

grant execute on function public.live_set_team_follow_v1(uuid,boolean) to authenticated;

-- Returns Lamorinda follow discovery plus a compact feed for followed teams.
-- The feed intentionally excludes scorer assignment/control and GroupMe data.
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

grant execute on function public.live_following_overview_v1() to authenticated;

create or replace function public.live_list_team_followers_v1(target_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  caller_role public.live_team_role;
  target_club_id uuid;
  followers_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into caller_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  if caller_role is null or caller_role not in ('owner','admin') then raise exception 'Owner or Admin role required'; end if;
  select club_id into target_club_id from public.live_teams where id=target_team_id;

  select coalesce(jsonb_agg(row_data order by sort_name),'[]'::jsonb)
  into followers_json
  from (
    select
      lower(coalesce(nullif(trim(p.display_name),''),p.email,f.user_id::text)) as sort_name,
      jsonb_build_object(
        'userId',f.user_id,
        'email',coalesce(p.email,''),
        'displayName',coalesce(nullif(trim(p.display_name),''),split_part(coalesce(p.email,''),'@',1),'Follower'),
        'followedAt',f.created_at,
        'sourceMemberships',coalesce((
          select jsonb_agg(jsonb_build_object(
            'teamId',source_team.id,
            'teamDisplayLabel',coalesce(nullif(trim(source_team.display_label),''),source_team.name),
            'role',source_member.role
          ) order by source_team.age_group,source_team.display_label,source_team.name)
          from public.live_team_members source_member
          join public.live_teams source_team on source_team.id=source_member.team_id
          where source_member.user_id=f.user_id
            and source_member.role in ('scorer','viewer')
            and source_team.club_id=target_club_id
            and source_team.active=true
        ),'[]'::jsonb)
      ) as row_data
    from public.live_team_follows f
    left join public.live_profiles p on p.user_id=f.user_id
    where f.team_id=target_team_id
      and exists (
        select 1
        from public.live_team_members valid_member
        join public.live_teams valid_team on valid_team.id=valid_member.team_id
        where valid_member.user_id=f.user_id
          and valid_member.role in ('scorer','viewer')
          and valid_team.club_id=target_club_id
          and valid_team.active=true
      )
  ) follower_rows;

  return followers_json;
end;
$$;

grant execute on function public.live_list_team_followers_v1(uuid) to authenticated;

-- V4 preserves the full member workspace contract. A followed team resolves to
-- a deliberately read-only Supporter-shaped workspace without creating a
-- membership row or a roster record.
create or replace function public.live_team_workspace_v4(target_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  member_role public.live_team_role;
  member_workspace jsonb;
  selected_team public.live_teams%rowtype;
  selected_roster public.live_rosters%rowtype;
  selected_club public.live_clubs%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role into member_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  if member_role is not null then
    member_workspace := public.live_team_workspace_v3(target_team_id);
    return member_workspace || jsonb_build_object('relationship','member','isFollowing',false,'followingOnly',false);
  end if;

  if not public.live_is_team_follower(target_team_id) then
    raise exception 'You do not have access to this team workspace';
  end if;

  select * into selected_team from public.live_teams where id=target_team_id and active=true;
  if selected_team.id is null then raise exception 'Team is unavailable'; end if;
  select * into selected_club from public.live_clubs where id=selected_team.club_id;
  select * into selected_roster
  from public.live_rosters
  where team_id=selected_team.id
    and competitive_season=selected_team.competitive_season
    and active=true
  order by version_number desc,created_at desc
  limit 1;

  return jsonb_build_object(
    'teamId',selected_team.id,
    'teamName',selected_team.name,
    'teamDisplayLabel',coalesce(nullif(trim(selected_team.display_label),''),selected_team.name),
    'teamSlug',selected_team.slug,
    'ageGroup',selected_team.age_group,
    'gender',selected_team.gender,
    'squadLabel',selected_team.squad_label,
    'competitiveSeason',selected_team.competitive_season,
    'canonicalWpiTeamId',selected_team.canonical_wpi_team_id,
    'teamActive',selected_team.active,
    'role','viewer',
    'relationship','following',
    'isFollowing',true,
    'followingOnly',true,
    'canManageGroupMe',false,
    'rosterId',selected_roster.id,
    'rosterVersion',selected_roster.version_number,
    'rosterSeason',selected_roster.competitive_season,
    'defaultLineupPlayerIds','[]'::jsonb,
    'defaultGoalieId',null,
    'clubId',selected_club.id,
    'clubName',selected_club.name,
    'clubDisplayName',selected_club.display_name,
    'clubCanonicalWpiId',selected_club.canonical_wpi_club_id,
    'clubCanonicalSlug',selected_club.canonical_slug,
    'clubLogoUrl',selected_club.logo_url,
    'clubRegion',selected_club.region,
    'clubRole',null
  );
end;
$$;

grant execute on function public.live_team_workspace_v4(uuid) to authenticated;
