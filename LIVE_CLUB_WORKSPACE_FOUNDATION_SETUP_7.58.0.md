# WPI 7.58.0 — Club Workspace Foundation

## Purpose

7.58.0 establishes the Club → Teams operating model without re-keying or copying the validated WPI Live pilot data.

The existing `public.live_teams.id` remains the stable team identity. Roster, access, GroupMe destination, games, game series, scorer history, deliveries and archives continue to reference the same `team_id` they already use.

## What changes

- Adds `public.live_clubs` as the parent workspace layer.
- Adds `public.live_club_members` for explicit club-level authority.
- Adds a nullable `club_id` relationship and team metadata fields to `public.live_teams`.
- Links the existing Lamorinda pilot team to the verified public WPI club identity `club-lamorinda`.
- Does **not** assign a current-season canonical public team ID because one has not been verified in the active 2026–2027 identity registry.
- Explicitly excludes **Lamorinda Brentwood**, which remains a distinct club identity.
- Adds club-aware team/workspace RPCs while leaving the validated scoring backend untouched.
- Adds an Owner `All Lamorinda Teams` operational view with live games, upcoming games, scorer gaps, team readiness and recent finals.
- Keeps team creation Club Owner-only.
- Preserves the existing device team-selection key so a user's selected team survives the release.

## Required Supabase migration

Apply this migration after the local focused gate passes:

`supabase/migrations/202608110003_club_workspace_foundation.sql`

Expected Supabase SQL Editor result: **Success. No rows returned.**

No Edge Function redeploy is required. No new secret is required. Do not change `groupme-post`, `roster-extract`, `GROUPME_ACCESS_TOKEN_WPI_LIVE`, or `OPENAI_API_KEY`.

## Pre-migration safety snapshot

Before applying the migration, run this in Supabase SQL Editor and keep the result until hosted validation is complete:

```sql
select
  t.id as team_id,
  t.name,
  t.slug,
  t.age_group,
  t.competitive_season,
  t.owner_id,
  (select count(*) from public.live_team_members m where m.team_id=t.id) as member_count,
  (select count(*) from public.live_rosters r where r.team_id=t.id) as roster_count,
  (select count(*) from public.live_games g where g.team_id=t.id) as game_count,
  (select count(*) from public.live_game_series s where s.team_id=t.id) as series_count,
  (select count(*) from public.live_destinations d where d.team_id=t.id) as destination_count
from public.live_teams t
order by t.created_at, t.id;
```

For the Lamorinda pilot, note the current `team_id`. **That exact UUID must remain unchanged after migration.**

## Post-migration verification

Run:

```sql
select
  t.id as team_id,
  t.name,
  t.display_label,
  t.age_group,
  t.gender,
  t.squad_label,
  t.competitive_season,
  t.canonical_wpi_team_id,
  c.id as live_club_id,
  c.canonical_wpi_club_id,
  c.display_name as club_display_name,
  c.canonical_slug,
  c.logo_url,
  c.region
from public.live_teams t
left join public.live_clubs c on c.id=t.club_id
order by c.display_name nulls last, t.age_group, t.name;
```

For the current pilot, confirm:

- the `team_id` exactly matches the pre-migration UUID;
- `canonical_wpi_club_id = 'club-lamorinda'`;
- `club_display_name = 'Lamorinda Water Polo'`;
- `display_label` resolves to `14U Boys A` for the existing pilot naming pattern;
- `canonical_wpi_team_id` remains `null` unless a current-season canonical team identity has separately been verified;
- no Lamorinda Brentwood team is attached to the Lamorinda Water Polo club row.

Then verify child-record counts are unchanged for the pilot `team_id`:

```sql
select
  t.id as team_id,
  t.name,
  (select count(*) from public.live_team_members m where m.team_id=t.id) as member_count,
  (select count(*) from public.live_rosters r where r.team_id=t.id) as roster_count,
  (select count(*) from public.live_games g where g.team_id=t.id) as game_count,
  (select count(*) from public.live_game_series s where s.team_id=t.id) as series_count,
  (select count(*) from public.live_destinations d where d.team_id=t.id) as destination_count
from public.live_teams t
where t.slug='lamorinda-a-14u-boys'
   or lower(trim(t.name))='lamorinda a 14u boys';
```

## Why the migration is non-destructive

The migration:

- does not update `live_teams.id`;
- does not delete or truncate Live tables;
- does not rewrite roster, membership, game, series, destination, scorer or delivery foreign keys;
- adds the club relationship around the existing team row;
- grants club-level authority only to the verified existing pilot Owner during backfill;
- does not infer club-level permissions from another team's Owner/Admin role;
- does not invent a current-season public team identity.

## Hosted acceptance

1. Sign in as the existing Lamorinda Owner.
2. Confirm the dashboard header reads **Lamorinda Water Polo** and the current team reads **14U Boys A**.
3. Confirm the Team selector contains **All Lamorinda Teams**.
4. Open the current 14U team and verify its existing roster, Team Access, GroupMe setup, Game-Day queue and archive are unchanged.
5. Open **All Lamorinda Teams** and confirm the operational view renders without exposing an edit-everything surface.
6. If you are ready to create another real Lamorinda team, use **Add team**. Do not create a disposable production team solely for testing because team deletion is intentionally not part of this release.
7. After a second real team exists, switch between teams and verify roster, access, GroupMe, games and archive change with the selected stable `team_id` and return unchanged when switching back.
8. Run a short scoring regression on the existing pilot: open/start a game as appropriate, confirm scorer authority, GroupMe delivery and the current Final/Reopen/Final behavior remain intact.

## Scope boundary

7.58.0 is the architecture/foundation release. The larger Owner dashboard cleanup remains **7.58.1**: Team Profile placement, compact Team Readiness, removal of standalone Games on Deck, and collapsed Game Day Setup are intentionally not folded into this migration.
