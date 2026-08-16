-- WPI 7.62.0 — Unified Organization Discovery & Scale.
-- Adds organization type to the existing workspace list and a safe public/read-only
-- organization overview. It does not change membership, scorer authority, rosters,
-- GroupMe, game writes, or Follow semantics.

create or replace function public.live_list_user_clubs_v1()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(row_data order by sort_type,sort_name),'[]'::jsonb)
  from (
    select
      case c.organization_type when 'high_school' then 1 else 0 end as sort_type,
      lower(c.display_name) as sort_name,
      jsonb_build_object(
        'clubId',c.id,
        'clubName',c.name,
        'clubDisplayName',c.display_name,
        'organizationType',c.organization_type,
        'canonicalWpiClubId',c.canonical_wpi_club_id,
        'canonicalSlug',c.canonical_slug,
        'logoUrl',c.logo_url,
        'region',c.region,
        'role',m.role,
        'teamCount',(select count(*) from public.live_teams t where t.club_id=c.id and t.active=true),
        'liveGameCount',(
          select count(*) from public.live_games g join public.live_teams t on t.id=g.team_id
          where t.club_id=c.id and g.status='live'
        ),
        'needsScorerCount',(
          select count(*) from public.live_games g join public.live_teams t on t.id=g.team_id
          where t.club_id=c.id and g.status in ('setup','scheduled') and g.assigned_scorer_user_id is null
        )
      ) as row_data
    from public.live_club_members m
    join public.live_clubs c on c.id=m.club_id
    where m.user_id=auth.uid() and c.active=true
  ) rows;
$$;

grant execute on function public.live_list_user_clubs_v1() to authenticated;

create or replace function public.live_public_organization_overview_v1(organization_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  selected public.live_clubs%rowtype;
  teams_json jsonb := '[]'::jsonb;
  games_json jsonb := '[]'::jsonb;
  follows_json jsonb := '[]'::jsonb;
begin
  select * into selected
  from public.live_clubs c
  where c.active=true and (
    c.canonical_wpi_club_id=organization_key
    or c.canonical_slug=organization_key
    or lower(c.display_name)=lower(organization_key)
    or lower(c.name)=lower(organization_key)
  )
  order by case when c.canonical_wpi_club_id=organization_key then 0 when c.canonical_slug=organization_key then 1 else 2 end
  limit 1;

  if selected.id is null then
    return jsonb_build_object('connected',false,'teams','[]'::jsonb,'games','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(row_data order by sort_name),'[]'::jsonb) into teams_json
  from (
    select lower(coalesce(t.display_label,t.name)) sort_name,
      jsonb_build_object(
        'teamId',t.id,
        'teamName',t.name,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,'gender',t.gender,'squadLabel',t.squad_label,
        'canonicalWpiTeamFamilyKey',t.canonical_wpi_team_family_key,
        'isMember',caller is not null and exists(select 1 from public.live_team_members m where m.team_id=t.id and m.user_id=caller),
        'isFollowing',caller is not null and not exists(select 1 from public.live_team_members m where m.team_id=t.id and m.user_id=caller) and (
          exists(select 1 from public.live_team_follows f where f.team_id=t.id and f.user_id=caller)
          or (t.canonical_wpi_team_family_key is not null and exists(
            select 1 from public.live_public_team_follows pf where pf.user_id=caller and pf.canonical_wpi_team_family_key=t.canonical_wpi_team_family_key
          ))
        )
      ) row_data
    from public.live_teams t where t.club_id=selected.id and t.active=true
  ) rows;

  if caller is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'canonicalWpiTeamFamilyKey',pf.canonical_wpi_team_family_key,
      'canonicalDisplayName',pf.canonical_display_name
    ) order by lower(pf.canonical_display_name)),'[]'::jsonb)
    into follows_json
    from public.live_public_team_follows pf
    where pf.user_id=caller and pf.canonical_wpi_club_id=coalesce(selected.canonical_wpi_club_id,'');
  end if;

  select coalesce(jsonb_agg(row_data order by sort_rank,sort_time asc nulls last,sort_updated desc),'[]'::jsonb) into games_json
  from (
    select case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end sort_rank,
      g.scheduled_at sort_time,g.updated_at sort_updated,
      jsonb_build_object(
        'id',g.id,'teamId',g.team_id,'teamName',g.team_name_snapshot,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'opponentName',g.opponent_name,'scheduledAt',g.scheduled_at,'venue',g.venue,
        'status',g.status,'teamScore',g.team_score,'opponentScore',g.opponent_score,
        'gameKind',g.game_kind,'tournamentName',g.tournament_name,
        'teamLogoUrl',coalesce(g.team_logo_url,selected.logo_url),'opponentLogoUrl',g.opponent_logo_url
      ) row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id
    where t.club_id=selected.id and g.status<>'cancelled'
      and (g.status in ('live','setup','scheduled') or coalesce(g.ended_at,g.updated_at,g.created_at)>=now()-interval '90 days')
      and (
        g.visibility='public_team'
        or (caller is not null and (
          exists(select 1 from public.live_team_members m where m.team_id=t.id and m.user_id=caller)
          or exists(select 1 from public.live_team_follows f where f.team_id=t.id and f.user_id=caller)
          or (t.canonical_wpi_team_family_key is not null and exists(
            select 1 from public.live_public_team_follows pf where pf.user_id=caller and pf.canonical_wpi_team_family_key=t.canonical_wpi_team_family_key
          ))
        ))
      )
    limit 80
  ) games;

  return jsonb_build_object(
    'connected',true,
    'organization',jsonb_build_object(
      'clubId',selected.id,'canonicalWpiClubId',selected.canonical_wpi_club_id,'canonicalSlug',selected.canonical_slug,
      'name',selected.name,'displayName',selected.display_name,'organizationType',selected.organization_type,
      'logoUrl',selected.logo_url,'region',selected.region
    ),
    'teams',teams_json,'familyFollows',follows_json,'games',games_json,
    'policy','public_games_plus_member_or_follower_team_private_games'
  );
end;
$$;

revoke all on function public.live_public_organization_overview_v1(text) from public;
grant execute on function public.live_public_organization_overview_v1(text) to anon,authenticated;
