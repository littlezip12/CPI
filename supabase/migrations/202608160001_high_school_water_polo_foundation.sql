-- WPI 7.61.0 — High School Water Polo Foundation
-- Adds first-class organization type and seeds the three Lamorinda-area high schools.
-- Schedule rows remain source-backed static data until explicitly synced/created as Live games.

alter table public.live_clubs
  add column if not exists organization_type text not null default 'club';

comment on column public.live_clubs.organization_type is
  'Organization family for WPI Live. Current values: club, high_school. This does not change team/game authority.';

do $$
begin
  alter table public.live_clubs add constraint live_clubs_organization_type_check
    check (organization_type in ('club','high_school'));
exception when duplicate_object then null;
end $$;

do $$
declare
  platform_owner uuid;
  school record;
  school_id uuid;
  created_team_id uuid;
  g text;
  lvl text;
  family_key text;
  team_name text;
  team_slug text;
begin
  select m.user_id into platform_owner
  from public.live_team_members m
  where m.role='owner'
  order by m.created_at asc,m.user_id asc
  limit 1;
  if platform_owner is null then
    raise exception 'WPI Platform Owner is required before high-school workspaces can be seeded';
  end if;

  for school in
    select * from (values
      ('school-acalanes','acalanes','Acalanes High School','Acalanes High School','assets/logos/high-schools/acalanes.jpg','Lafayette, CA'),
      ('school-campolindo','campolindo','Campolindo High School','Campolindo High School','assets/logos/high-schools/campolindo.png','Moraga, CA'),
      ('school-miramonte','miramonte','Miramonte High School','Miramonte High School','assets/logos/high-schools/miramonte.png','Orinda, CA')
    ) as x(canonical_id,slug,name,display_name,logo_url,region)
  loop
    insert into public.live_clubs(
      canonical_wpi_club_id,canonical_slug,name,display_name,logo_url,region,
      owner_id,created_by,organization_type,active
    ) values (
      school.canonical_id,school.slug,school.name,school.display_name,school.logo_url,school.region,
      platform_owner,platform_owner,'high_school',true
    ) on conflict (canonical_wpi_club_id) do update set
      canonical_slug=excluded.canonical_slug,
      name=excluded.name,
      display_name=excluded.display_name,
      logo_url=excluded.logo_url,
      region=excluded.region,
      organization_type='high_school',
      active=true,
      updated_at=now()
    returning id into school_id;

    insert into public.live_club_members(club_id,user_id,role)
    values (school_id,platform_owner,'owner'::public.live_club_role)
    on conflict (club_id,user_id) do update set role='owner'::public.live_club_role,updated_at=now();

    foreach g in array array['Men','Women'] loop
      foreach lvl in array array['Varsity','JV'] loop
        family_key := school.canonical_id || '|hs|' || lower(g) || '|' || lower(lvl);
        team_name := school.name || ' ' || g || '''s ' || lvl;
        team_slug := school.slug || '-' || lower(g) || '-' || lower(lvl);

        select id into created_team_id from public.live_teams
        where canonical_wpi_team_family_key=family_key and active=true
        order by created_at asc limit 1;

        if created_team_id is null then
          insert into public.live_teams(
            name,slug,owner_id,age_group,competitive_season,club_id,display_label,gender,squad_label,
            active,canonical_wpi_team_family_key
          ) values (
            team_name,team_slug,platform_owner,'HS','2026-2027',school_id,g || '''s ' || lvl,g,lvl,
            true,family_key
          ) returning id into created_team_id;
        else
          update public.live_teams set
            club_id=school_id,name=team_name,display_label=g || '''s ' || lvl,age_group='HS',gender=g,
            squad_label=lvl,competitive_season='2026-2027',active=true,updated_at=now()
          where id=created_team_id;
        end if;

        insert into public.live_team_members(team_id,user_id,role,can_manage_groupme,updated_at,updated_by)
        values (created_team_id,platform_owner,'owner'::public.live_team_role,true,now(),platform_owner)
        on conflict (team_id,user_id) do update set role='owner'::public.live_team_role,can_manage_groupme=true,updated_at=now(),updated_by=platform_owner;

        if not exists(select 1 from public.live_rosters where team_id=created_team_id and competitive_season='2026-2027' and active=true) then
          insert into public.live_rosters(team_id,competitive_season,label,active,created_by)
          values(created_team_id,'2026-2027',team_name || ' roster',true,platform_owner);
        end if;
      end loop;
    end loop;
  end loop;
end $$;
