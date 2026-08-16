-- WPI 7.61.0 — High School Logo Propagation Correction
-- Backfills canonical school logos onto already-created high-school games.
-- No scoring, roster, access, GroupMe, event, recap, or authority data is changed.

update public.live_games g
set team_logo_url = c.logo_url,
    updated_at = now()
from public.live_teams t
join public.live_clubs c on c.id = t.club_id
where g.team_id = t.id
  and c.organization_type = 'high_school'
  and nullif(trim(coalesce(c.logo_url,'')),'') is not null
  and nullif(trim(coalesce(g.team_logo_url,'')),'') is null;

-- Backfill known seeded school opponents when the historical game was created before
-- the high-school directory was available to the Game-Day identity resolver.
update public.live_games g
set opponent_logo_url = c.logo_url,
    opponent_wpi_club_id = coalesce(g.opponent_wpi_club_id,c.canonical_wpi_club_id),
    updated_at = now()
from public.live_clubs c
where c.organization_type = 'high_school'
  and c.canonical_wpi_club_id in ('school-acalanes','school-campolindo','school-miramonte')
  and nullif(trim(coalesce(c.logo_url,'')),'') is not null
  and nullif(trim(coalesce(g.opponent_logo_url,'')),'') is null
  and (
    (c.canonical_wpi_club_id='school-acalanes' and lower(coalesce(g.opponent_source_name,g.opponent_name,'')) ~ '(^|[^a-z])acalanes([^a-z]|$)') or
    (c.canonical_wpi_club_id='school-campolindo' and lower(coalesce(g.opponent_source_name,g.opponent_name,'')) ~ '(^|[^a-z])(campolindo|campo)([^a-z]|$)') or
    (c.canonical_wpi_club_id='school-miramonte' and lower(coalesce(g.opponent_source_name,g.opponent_name,'')) ~ '(^|[^a-z])miramonte([^a-z]|$)')
  );
