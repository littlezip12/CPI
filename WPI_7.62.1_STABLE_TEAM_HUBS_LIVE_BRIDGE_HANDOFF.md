# WPI 7.62.1 — Stable Team Hubs & Live Bridge

7.62.1 completes the public discovery chain introduced in 7.62.0:

**Organization → stable Team Family → team hub → rankings/history and/or WPI Live activity**

## Added
- `team-hub.html`: one stable public profile surface for every canonical team family.
- `data/live/organization-directory-v7-62-1.json`: schema v2, still 185 organizations / 736 teams, now with stable `teamHubHref` and preserved legacy club-team profile links.
- All 724 club teams and all 12 high-school teams receive team-hub routes.
- Team hubs inherit canonical organization logo and primary/secondary colors.
- Club team hubs preserve the existing rankings/history page as a secondary link; those legacy pages are not deleted or rewritten.
- High-school team hubs do not fabricate ranking/history pages. They can link to the existing school schedule surface instead.
- Team hubs use the existing safe organization overview RPC to show only games already visible to that viewer.
- Stable team-family Following is available directly on the hub and remains read-only.
- Homepage team search, Organization profiles and My Teams discovery now route to stable team hubs.
- My Teams adds an `Open` path into the stable hub for family-linked member/followed teams.

## No database change
No Supabase migration is required. The release reuses:
- `live_public_organization_overview_v1`
- `live_set_public_team_follow_v1`
- `live_following_overview_v2`

## Protected behavior
No change to scorer authority, game writes, scoring engine, roster state, membership, GroupMe, delivery retry/audit, handoff/reopen behavior, Final Whistle sequencing, or team identity reconciliation.

## Directory counts remain
- 185 organizations
- 182 clubs
- 3 high schools
- 736 team families
- 724 club teams
- 12 high-school teams

## High-school scope remains frozen
7.62.1 does not add schools, schedules, players or games. Acalanes, Campolindo and Miramonte remain the only seeded high schools until real source information is supplied.
