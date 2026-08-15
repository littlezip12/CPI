-- WPI 7.58.9 — Club Operations & Scale Polish.
-- Adds club-level read-only operations summaries for Owners/Admins and updates
-- the Club Pilot evidence model so offline/reconnect is deferred resilience work,
-- not the next pilot blocker. No scorer authority, GroupMe delivery, roster,
-- game, event, recap, membership or Follow write policy is broadened here.

create or replace function public.live_club_operations_v1(target_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  selected_role public.live_club_role;
  people_json jsonb := '[]'::jsonb;
  manual_opponents_json jsonb := '[]'::jsonb;
  people_count integer := 0;
  membership_count integer := 0;
  follower_count integer := 0;
  unlisted_count integer := 0;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select role into selected_role
  from public.live_club_members
  where club_id=target_club_id and user_id=caller;

  if selected_role is null or selected_role not in ('owner','admin') then
    raise exception 'Club Owner or Admin access required';
  end if;

  select count(distinct person_id)::int into people_count
  from (
    select m.user_id person_id
    from public.live_team_members m
    join public.live_teams t on t.id=m.team_id
    where t.club_id=target_club_id and t.active=true
    union
    select f.user_id person_id
    from public.live_team_follows f
    join public.live_teams t on t.id=f.team_id
    where t.club_id=target_club_id and t.active=true
  ) people;

  select count(*)::int into membership_count
  from public.live_team_members m
  join public.live_teams t on t.id=m.team_id
  where t.club_id=target_club_id and t.active=true;

  select count(*)::int into follower_count
  from public.live_team_follows f
  join public.live_teams t on t.id=f.team_id
  where t.club_id=target_club_id and t.active=true;

  select count(distinct lower(trim(g.opponent_name)))::int into unlisted_count
  from public.live_games g
  join public.live_teams t on t.id=g.team_id
  where t.club_id=target_club_id
    and g.source_mode='manual'
    and nullif(trim(coalesce(g.opponent_name,'')),'') is not null
    and g.opponent_wpi_team_id is null
    and g.opponent_wpi_club_id is null;

  select coalesce(jsonb_agg(person_row order by sort_name,sort_email),'[]'::jsonb)
  into people_json
  from (
    select
      lower(coalesce(nullif(trim(p.display_name),''),nullif(trim(r.display_name),''),split_part(coalesce(r.email,''),'@',1),'~')) sort_name,
      lower(coalesce(r.email,'')) sort_email,
      jsonb_build_object(
        'userId',u.user_id,
        'displayName',coalesce(nullif(trim(p.display_name),''),nullif(trim(r.display_name),''),split_part(coalesce(r.email,''),'@',1),'WPI account'),
        'email',coalesce(r.email,''),
        'memberships',coalesce(members.memberships,'[]'::jsonb),
        'follows',coalesce(follows.follows,'[]'::jsonb),
        'teamCount',coalesce(members.team_count,0),
        'followCount',coalesce(follows.follow_count,0)
      ) person_row
    from (
      select distinct person_id user_id
      from (
        select m.user_id person_id
        from public.live_team_members m
        join public.live_teams t on t.id=m.team_id
        where t.club_id=target_club_id and t.active=true
        union
        select f.user_id person_id
        from public.live_team_follows f
        join public.live_teams t on t.id=f.team_id
        where t.club_id=target_club_id and t.active=true
      ) ids
    ) u
    left join public.live_account_registry r on r.user_id=u.user_id
    left join public.live_profiles p on p.user_id=u.user_id
    left join lateral (
      select count(*)::int team_count,
        coalesce(jsonb_agg(jsonb_build_object(
          'teamId',t.id,
          'teamName',t.name,
          'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
          'ageGroup',t.age_group,
          'gender',t.gender,
          'squadLabel',t.squad_label,
          'role',m.role,
          'joinedAt',m.created_at
        ) order by coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'999')::integer,lower(coalesce(t.display_label,t.name))), '[]'::jsonb) memberships
      from public.live_team_members m
      join public.live_teams t on t.id=m.team_id
      where m.user_id=u.user_id and t.club_id=target_club_id and t.active=true
    ) members on true
    left join lateral (
      select count(*)::int follow_count,
        coalesce(jsonb_agg(jsonb_build_object(
          'teamId',t.id,
          'teamName',t.name,
          'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
          'ageGroup',t.age_group,
          'gender',t.gender,
          'createdAt',f.created_at
        ) order by coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'999')::integer,lower(coalesce(t.display_label,t.name))), '[]'::jsonb) follows
      from public.live_team_follows f
      join public.live_teams t on t.id=f.team_id
      where f.user_id=u.user_id and t.club_id=target_club_id and t.active=true
    ) follows on true
  ) rows;

  select coalesce(jsonb_agg(row_data order by last_seen_at desc,normalized_name),'[]'::jsonb)
  into manual_opponents_json
  from (
    select agg.normalized_name,agg.last_seen_at,
      jsonb_build_object(
        'opponentName',latest.opponent_name,
        'normalizedName',agg.normalized_name,
        'gameCount',agg.game_count,
        'teamLabels',agg.team_labels,
        'lastSeenAt',agg.last_seen_at,
        'lastGameId',latest.game_id,
        'lastGameTeamId',latest.team_id,
        'lastGameStatus',latest.status,
        'lastGameTeamLabel',latest.team_label
      ) row_data
    from (
      select lower(trim(g.opponent_name)) normalized_name,
        count(*)::int game_count,
        jsonb_agg(distinct coalesce(nullif(trim(t.display_label),''),t.name)) team_labels,
        max(coalesce(g.ended_at,g.started_at,g.scheduled_at,g.updated_at,g.created_at)) last_seen_at
      from public.live_games g
      join public.live_teams t on t.id=g.team_id
      where t.club_id=target_club_id
        and g.source_mode='manual'
        and nullif(trim(coalesce(g.opponent_name,'')),'') is not null
        and g.opponent_wpi_team_id is null
        and g.opponent_wpi_club_id is null
      group by lower(trim(g.opponent_name))
    ) agg
    join lateral (
      select g.id game_id,g.team_id,g.status,g.opponent_name,
        coalesce(nullif(trim(t.display_label),''),t.name) team_label
      from public.live_games g
      join public.live_teams t on t.id=g.team_id
      where t.club_id=target_club_id
        and lower(trim(g.opponent_name))=agg.normalized_name
        and g.source_mode='manual'
        and g.opponent_wpi_team_id is null
        and g.opponent_wpi_club_id is null
      order by coalesce(g.ended_at,g.started_at,g.scheduled_at,g.updated_at,g.created_at) desc
      limit 1
    ) latest on true
  ) opponents;

  return jsonb_build_object(
    'clubId',target_club_id,
    'generatedAt',now(),
    'metrics',jsonb_build_object(
      'peopleCount',people_count,
      'membershipCount',membership_count,
      'followerCount',follower_count,
      'unlistedOpponentCount',unlisted_count
    ),
    'people',people_json,
    'manualOpponents',manual_opponents_json
  );
end;
$$;

revoke all on function public.live_club_operations_v1(uuid) from public,anon;
grant execute on function public.live_club_operations_v1(uuid) to authenticated;

comment on function public.live_club_operations_v1(uuid) is
  'Owner/Admin club operations summary: team memberships, read-only follows, and unresolved manual opponent identities. Returns no auth secrets and grants no write authority.';

create or replace function public.live_club_pilot_validation_v1(target_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  selected_club public.live_clubs%rowtype;
  active_team_count integer := 0;
  ready_team_count integer := 0;
  enabled_groupme_count integer := 0;
  tested_groupme_count integer := 0;
  route_mismatch_count integer := 0;
  follow_membership_overlap_count integer := 0;
  official_game_count integer := 0;
  manual_opponent_count integer := 0;
  concurrent_pair_count integer := 0;
  handoff_count integer := 0;
  multi_game_event_count integer := 0;
  teams_json jsonb := '[]'::jsonb;
  concurrent_json jsonb := null;
  handoff_json jsonb := null;
  weekend_json jsonb := null;
  manual_opponents_json jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.live_has_club_role(target_club_id,array['owner','admin']::public.live_club_role[]) then
    raise exception 'Club Owner/Admin access required';
  end if;

  select * into selected_club from public.live_clubs where id=target_club_id;
  if selected_club.id is null then raise exception 'Club not found'; end if;

  select count(*) into active_team_count
  from public.live_teams t
  where t.club_id=target_club_id and t.active=true;

  select count(*) into ready_team_count
  from public.live_teams t
  where t.club_id=target_club_id and t.active=true
    and exists (
      select 1 from public.live_rosters r
      where r.team_id=t.id and r.active=true
        and (select count(*) from public.live_players p where p.roster_id=r.id and p.active=true)
          >= case when coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'14')::integer <= 12 then 6 else 7 end
    )
    and exists (
      select 1 from public.live_team_members m
      where m.team_id=t.id and m.role in ('owner','admin','scorer')
    );

  select count(*) into enabled_groupme_count
  from public.live_teams t
  join public.live_destinations d on d.team_id=t.id and d.provider='groupme'
  where t.club_id=target_club_id and t.active=true and d.enabled=true;

  select count(*) into tested_groupme_count
  from public.live_teams t
  join public.live_destinations d on d.team_id=t.id and d.provider='groupme'
  where t.club_id=target_club_id and t.active=true
    and d.enabled=true and d.last_test_status='sent';

  select count(*) into route_mismatch_count
  from public.live_games g
  join public.live_teams t on t.id=g.team_id
  join public.live_destinations d on d.id=g.destination_id
  where t.club_id=target_club_id and d.team_id<>g.team_id;

  select count(*) into follow_membership_overlap_count
  from public.live_team_follows f
  join public.live_teams t on t.id=f.team_id
  where t.club_id=target_club_id
    and exists (
      select 1 from public.live_team_members m
      where m.team_id=f.team_id and m.user_id=f.user_id
    );

  select count(*) into official_game_count
  from public.live_games g
  join public.live_teams t on t.id=g.team_id
  where t.club_id=target_club_id
    and g.tournament_event_id is not null
    and g.source_game_id is not null;

  select count(*) into manual_opponent_count
  from public.live_games g
  join public.live_teams t on t.id=g.team_id
  where t.club_id=target_club_id
    and g.source_mode='manual'
    and nullif(trim(coalesce(g.opponent_name,'')),'') is not null
    and g.opponent_wpi_team_id is null
    and g.opponent_wpi_club_id is null;

  select coalesce(jsonb_agg(row_data order by sort_age,sort_name),'[]'::jsonb)
  into teams_json
  from (
    select
      coalesce(nullif(regexp_replace(t.age_group,'[^0-9]','','g'),''),'999')::integer sort_age,
      lower(coalesce(t.display_label,t.name)) sort_name,
      jsonb_build_object(
        'teamId',t.id,
        'teamName',t.name,
        'teamDisplayLabel',coalesce(nullif(trim(t.display_label),''),t.name),
        'ageGroup',t.age_group,
        'gender',t.gender,
        'competitiveSeason',t.competitive_season,
        'rosterPlayerCount',coalesce((
          select count(*) from public.live_players p
          where p.roster_id=(
            select r.id from public.live_rosters r
            where r.team_id=t.id and r.active=true
            order by r.version_number desc,r.created_at desc limit 1
          ) and p.active=true
        ),0),
        'scorerEligibleCount',(select count(*) from public.live_team_members m where m.team_id=t.id and m.role in ('owner','admin','scorer')),
        'groupMeEnabled',coalesce(d.enabled,false),
        'groupMeTested',coalesce(d.last_test_status='sent',false),
        'groupMeGroupName',d.groupme_group_name,
        'groupMeTopicName',d.groupme_topic_name,
        'liveGameCount',(select count(*) from public.live_games g where g.team_id=t.id and g.status='live'),
        'finalGameCount',(select count(*) from public.live_games g where g.team_id=t.id and g.status='final')
      ) row_data
    from public.live_teams t
    left join public.live_destinations d on d.team_id=t.id and d.provider='groupme'
    where t.club_id=target_club_id and t.active=true
  ) rows;

  select count(*) into concurrent_pair_count
  from public.live_games a
  join public.live_teams ta on ta.id=a.team_id
  join public.live_games b on b.id>a.id
  join public.live_teams tb on tb.id=b.team_id
  where ta.club_id=target_club_id and tb.club_id=target_club_id
    and a.team_id<>b.team_id
    and a.started_at is not null and b.started_at is not null
    and tstzrange(a.started_at,coalesce(a.ended_at,case when a.status='live' then now() else a.started_at end),'[)')
        && tstzrange(b.started_at,coalesce(b.ended_at,case when b.status='live' then now() else b.started_at end),'[)');

  select jsonb_build_object(
      'gameAId',a.id,'gameATeamId',a.team_id,'gameATeamLabel',coalesce(nullif(trim(ta.display_label),''),ta.name),
      'gameAOpponent',a.opponent_name,'gameAStartedAt',a.started_at,'gameAEndedAt',a.ended_at,
      'gameBId',b.id,'gameBTeamId',b.team_id,'gameBTeamLabel',coalesce(nullif(trim(tb.display_label),''),tb.name),
      'gameBOpponent',b.opponent_name,'gameBStartedAt',b.started_at,'gameBEndedAt',b.ended_at
    ) into concurrent_json
  from public.live_games a
  join public.live_teams ta on ta.id=a.team_id
  join public.live_games b on b.id>a.id
  join public.live_teams tb on tb.id=b.team_id
  where ta.club_id=target_club_id and tb.club_id=target_club_id
    and a.team_id<>b.team_id
    and a.started_at is not null and b.started_at is not null
    and tstzrange(a.started_at,coalesce(a.ended_at,case when a.status='live' then now() else a.started_at end),'[)')
        && tstzrange(b.started_at,coalesce(b.ended_at,case when b.status='live' then now() else b.started_at end),'[)')
  order by greatest(a.started_at,b.started_at) desc
  limit 1;

  select count(*) into handoff_count
  from public.live_game_scorer_audit audit
  join public.live_games g on g.id=audit.game_id
  join public.live_teams t on t.id=g.team_id
  where t.club_id=target_club_id and audit.action='handoff_accepted';

  select jsonb_build_object(
      'gameId',g.id,
      'teamId',g.team_id,
      'teamLabel',coalesce(nullif(trim(t.display_label),''),t.name),
      'opponentName',g.opponent_name,
      'actorDisplayName',audit.actor_display_name,
      'createdAt',audit.created_at
    ) into handoff_json
  from public.live_game_scorer_audit audit
  join public.live_games g on g.id=audit.game_id
  join public.live_teams t on t.id=g.team_id
  where t.club_id=target_club_id and audit.action='handoff_accepted'
  order by audit.created_at desc
  limit 1;

  select count(*) into multi_game_event_count
  from (
    select s.id
    from public.live_game_series s
    join public.live_teams t on t.id=s.team_id
    join public.live_games g on g.series_id=s.id and g.status='final'
    where t.club_id=target_club_id
    group by s.id
    having count(*)>=2
  ) evidence;

  select jsonb_build_object(
      'seriesId',s.id,
      'seriesName',s.name,
      'seriesType',s.series_type,
      'teamId',s.team_id,
      'teamLabel',coalesce(nullif(trim(t.display_label),''),t.name),
      'finalCount',count(*),
      'wins',count(*) filter (where g.team_score>g.opponent_score),
      'losses',count(*) filter (where g.team_score<g.opponent_score),
      'ties',count(*) filter (where g.team_score=g.opponent_score),
      'lastFinalAt',max(coalesce(g.ended_at,g.updated_at))
    ) into weekend_json
  from public.live_game_series s
  join public.live_teams t on t.id=s.team_id
  join public.live_games g on g.series_id=s.id and g.status='final'
  where t.club_id=target_club_id
  group by s.id,s.name,s.series_type,s.team_id,t.display_label,t.name
  having count(*)>=2
  order by max(coalesce(g.ended_at,g.updated_at)) desc
  limit 1;

  select coalesce(jsonb_agg(row_data order by sort_count desc,sort_name),'[]'::jsonb)
  into manual_opponents_json
  from (
    select count(*) sort_count,lower(g.opponent_name) sort_name,
      jsonb_build_object(
        'opponentName',g.opponent_name,
        'gameCount',count(*),
        'teamLabels',jsonb_agg(distinct coalesce(nullif(trim(t.display_label),''),t.name))
      ) row_data
    from public.live_games g
    join public.live_teams t on t.id=g.team_id
    where t.club_id=target_club_id
      and g.source_mode='manual'
      and nullif(trim(coalesce(g.opponent_name,'')),'') is not null
      and g.opponent_wpi_team_id is null
      and g.opponent_wpi_club_id is null
    group by g.opponent_name
    order by count(*) desc,lower(g.opponent_name)
    limit 12
  ) names;

  return jsonb_build_object(
    'clubId',selected_club.id,
    'clubName',selected_club.name,
    'clubDisplayName',selected_club.display_name,
    'generatedAt',now(),
    'summary',jsonb_build_object(
      'activeTeamCount',active_team_count,
      'readyTeamCount',ready_team_count,
      'enabledGroupMeCount',enabled_groupme_count,
      'testedGroupMeCount',tested_groupme_count,
      'groupMeRouteMismatchCount',route_mismatch_count,
      'followMembershipOverlapCount',follow_membership_overlap_count,
      'concurrentGamePairCount',concurrent_pair_count,
      'scorerHandoffCount',handoff_count,
      'multiGameEventCount',multi_game_event_count,
      'officialGameCount',official_game_count,
      'manualOpponentCount',manual_opponent_count
    ),
    'teams',teams_json,
    'evidence',jsonb_build_object(
      'concurrentGames',concurrent_json,
      'scorerHandoff',handoff_json,
      'multiGameEvent',weekend_json
    ),
    'manualOpponents',manual_opponents_json,
    'gates',jsonb_build_array(
      jsonb_build_object(
        'key','multi_team','state',case when active_team_count>=2 then 'observed' else 'pending' end,
        'title','Multiple real teams','detail',format('%s active club teams',active_team_count)
      ),
      jsonb_build_object(
        'key','concurrent_games','state',case when concurrent_pair_count>0 then 'observed' else 'pending' end,
        'title','Concurrent team games','detail',case when concurrent_pair_count>0 then format('%s overlapping cross-team game pair(s) observed',concurrent_pair_count) else 'Run 12U and 14U at the same time on separate devices' end
      ),
      jsonb_build_object(
        'key','scorer_handoff','state',case when handoff_count>0 then 'observed' else 'pending' end,
        'title','Scorer handoff','detail',case when handoff_count>0 then format('%s accepted handoff(s) recorded',handoff_count) else 'Complete one real scorer handoff during a pilot game' end
      ),
      jsonb_build_object(
        'key','groupme_isolation','state',case when route_mismatch_count=0 and tested_groupme_count>=least(active_team_count,2) and active_team_count>=2 then 'observed' when route_mismatch_count>0 then 'attention' else 'pending' end,
        'title','Per-team GroupMe routing','detail',case when route_mismatch_count>0 then format('%s cross-team destination mismatch(es) require attention',route_mismatch_count) else format('%s/%s active teams have an enabled, tested GroupMe route',tested_groupme_count,active_team_count) end
      ),
      jsonb_build_object(
        'key','following_isolation','state',case when follow_membership_overlap_count=0 then 'guarded' else 'attention' end,
        'title','Following stays read-only','detail',case when follow_membership_overlap_count=0 then 'No Follow row overlaps permanent membership for the same team' else format('%s Follow/member overlap(s) require review',follow_membership_overlap_count) end
      ),
      jsonb_build_object(
        'key','offline_reconnect','state','deferred',
        'title','Offline → reconnect','detail','Deferred resilience test. Game-scoped browser recovery remains protected, but this is not a Club Pilot blocker for the current venue/service model.'
      ),
      jsonb_build_object(
        'key','multi_game_weekend','state',case when multi_game_event_count>0 then 'observed' else 'pending' end,
        'title','Multi-game weekend','detail',case when multi_game_event_count>0 then format('%s event(s) contain at least two completed games',multi_game_event_count) else 'Complete multiple games under one real Scrimmage Weekend' end
      ),
      jsonb_build_object(
        'key','official_schedule','state',case when official_game_count>0 then 'observed' else 'external' end,
        'title','Official 2026–2027 tournament feed','detail',case when official_game_count>0 then format('%s official schedule game(s) linked',official_game_count) else 'Waiting for a real current-season official schedule to become available in WPI' end
      )
    )
  );
end;
$$;

grant execute on function public.live_club_pilot_validation_v1(uuid) to authenticated;

comment on function public.live_club_pilot_validation_v1(uuid) is
  'Owner/Admin read-only observability for Club Pilot proving gates. Offline/reconnect is deferred resilience work; official schedule remains external. Evidence does not itself declare 7.59.0 ready.';
