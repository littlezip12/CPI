-- WPI 7.58.10 — Pilot Launch Prep & Admin Safety.
-- Adds read-only club launch readiness and an explicit Owner/Admin manual-opponent
-- identity resolution action. Raw opponent labels are preserved; no identity is
-- inferred, auto-created, or merged. No scorer, roster, GroupMe or Follow authority
-- is broadened by this migration.

create or replace function public.live_club_launch_readiness_v1(target_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  team_rows jsonb := '[]'::jsonb;
  active_count integer := 0;
  ready_count integer := 0;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_has_club_role(target_club_id,array['owner','admin']::public.live_club_role[]) then
    raise exception 'Club Owner/Admin access required';
  end if;

  select count(*)::int into active_count
  from public.live_teams t where t.club_id=target_club_id and t.active=true;

  with readiness as (
    select
      t.id team_id,
      t.name team_name,
      coalesce(nullif(trim(t.display_label),''),t.name) team_label,
      t.age_group,
      t.gender,
      t.squad_label,
      t.competitive_season,
      case when coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'14')::integer <= 12 then 6 else 7 end starter_count,
      (nullif(trim(coalesce(t.name,'')),'') is not null
        and nullif(trim(coalesce(t.display_label,'')),'') is not null
        and nullif(trim(coalesce(t.age_group,'')),'') is not null
        and nullif(trim(coalesce(t.gender,'')),'') is not null
        and nullif(trim(coalesce(t.competitive_season,'')),'') is not null) profile_ready,
      coalesce((select count(*) from public.live_players p where p.roster_id=(select r.id from public.live_rosters r where r.team_id=t.id and r.active=true order by r.created_at desc limit 1) and p.active=true),0)::int roster_count,
      (select count(*) from public.live_team_members m where m.team_id=t.id and m.role in ('owner','admin','scorer'))::int scorer_count,
      exists(select 1 from public.live_destinations d where d.team_id=t.id and d.provider='groupme' and d.enabled=true and d.last_test_status='sent') groupme_ready,
      cardinality(coalesce(t.default_lineup_player_ids,'{}'::uuid[]))::int default_lineup_count,
      t.default_goalie_id,
      (select count(*) from public.live_games g where g.team_id=t.id and g.status in ('setup','scheduled'))::int upcoming_count,
      (select count(*) from public.live_games g where g.team_id=t.id and g.status in ('setup','scheduled') and g.assigned_scorer_user_id is null)::int unassigned_count,
      (select r.id from public.live_rosters r where r.team_id=t.id and r.active=true order by r.created_at desc limit 1) active_roster_id
    from public.live_teams t
    where t.club_id=target_club_id and t.active=true
  ), evaluated as (
    select r.*,
      (r.roster_count >= r.starter_count) roster_ready,
      (r.scorer_count >= 1) access_ready,
      (r.default_goalie_id is not null
       and r.default_lineup_count=r.starter_count
       and r.default_goalie_id=any(coalesce((select t.default_lineup_player_ids from public.live_teams t where t.id=r.team_id),'{}'::uuid[]))
       and (select count(*) from public.live_players p where p.roster_id=r.active_roster_id and p.active=true and p.id=any(coalesce((select t.default_lineup_player_ids from public.live_teams t where t.id=r.team_id),'{}'::uuid[])))=r.starter_count
      ) default_lineup_ready
    from readiness r
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'teamId',team_id,
      'teamName',team_name,
      'teamDisplayLabel',team_label,
      'ageGroup',age_group,
      'gender',gender,
      'squadLabel',squad_label,
      'competitiveSeason',competitive_season,
      'profileReady',profile_ready,
      'rosterReady',roster_ready,
      'rosterPlayerCount',roster_count,
      'starterCount',starter_count,
      'accessReady',access_ready,
      'scorerEligibleCount',scorer_count,
      'groupMeReady',groupme_ready,
      'defaultLineupReady',default_lineup_ready,
      'defaultLineupCount',default_lineup_count,
      'upcomingGameCount',upcoming_count,
      'unassignedGameCount',unassigned_count,
      'launchReady',(profile_ready and roster_ready and access_ready and groupme_ready and default_lineup_ready)
    ) order by coalesce(nullif(regexp_replace(age_group,'[^0-9]','','g'),''),'999')::integer,lower(team_label)),'[]'::jsonb),
    count(*) filter (where profile_ready and roster_ready and access_ready and groupme_ready and default_lineup_ready)::int
  into team_rows,ready_count
  from evaluated;

  return jsonb_build_object(
    'clubId',target_club_id,
    'generatedAt',now(),
    'summary',jsonb_build_object('activeTeamCount',active_count,'readyTeamCount',ready_count,'attentionTeamCount',greatest(active_count-ready_count,0)),
    'teams',team_rows
  );
end;
$$;

revoke all on function public.live_club_launch_readiness_v1(uuid) from public,anon;
grant execute on function public.live_club_launch_readiness_v1(uuid) to authenticated;
comment on function public.live_club_launch_readiness_v1(uuid) is
  'Owner/Admin read-only launch readiness for active club teams: profile, roster, scorer access, tested GroupMe, and valid default starters.';

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
  changed integer := 0;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_has_club_role(target_club_id,array['owner','admin']::public.live_club_role[]) then
    raise exception 'Club Owner/Admin access required';
  end if;
  if cleaned_raw is null then raise exception 'Raw opponent name is required'; end if;
  if cleaned_team is null and cleaned_club is null then raise exception 'Choose an existing WPI club or team'; end if;

  update public.live_games g
  set opponent_wpi_team_id=cleaned_team,
      opponent_wpi_club_id=cleaned_club,
      state_snapshot=jsonb_set(coalesce(g.state_snapshot,'{}'::jsonb),'{identityReview}',jsonb_build_object(
        'rawName',g.opponent_name,
        'canonicalDisplayName',cleaned_display,
        'canonicalWpiTeamId',cleaned_team,
        'canonicalWpiClubId',cleaned_club,
        'resolvedAt',now(),
        'resolvedBy',caller,
        'method','owner_explicit'
      ),true),
      updated_at=now(),
      updated_by=caller
  from public.live_teams t
  where g.team_id=t.id
    and t.club_id=target_club_id
    and g.source_mode='manual'
    and lower(trim(g.opponent_name))=lower(cleaned_raw)
    and g.opponent_wpi_team_id is null
    and g.opponent_wpi_club_id is null;

  get diagnostics changed = row_count;
  if changed=0 then raise exception 'No unresolved manual games matched that opponent name'; end if;

  return jsonb_build_object(
    'clubId',target_club_id,
    'rawName',cleaned_raw,
    'canonicalWpiTeamId',cleaned_team,
    'canonicalWpiClubId',cleaned_club,
    'canonicalDisplayName',cleaned_display,
    'updatedGames',changed,
    'resolvedAt',now()
  );
end;
$$;

revoke all on function public.live_resolve_manual_opponent_v1(uuid,text,text,text,text) from public,anon;
grant execute on function public.live_resolve_manual_opponent_v1(uuid,text,text,text,text) to authenticated;
comment on function public.live_resolve_manual_opponent_v1(uuid,text,text,text,text) is
  'Explicit Owner/Admin mapping of an unresolved raw manual opponent name to an existing WPI club/team. Preserves opponent_name and never guesses identity.';
