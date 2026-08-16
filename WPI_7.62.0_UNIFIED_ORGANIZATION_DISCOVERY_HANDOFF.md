# WPI 7.62.0 — Unified Organization Discovery & Scale

7.62.0 unifies WPI's public discovery model around **Organizations**. Clubs and high schools remain distinct organization types, but users search and browse them from one directory.

## Added
- `organizations.html`: 185 organizations (182 clubs + 3 high schools), universal search, Type, Location, and Team Group filters.
- `organization.html`: canonical organization profile with teams, colors/logo, stable team-family Following, and safe WPI Live game activity.
- `data/live/organization-directory-v7-62-0.json`: 736 teams (724 club + 12 high-school).
- Homepage search now understands teams, clubs, and high schools.
- Platform Owner workspace selector adds Clubs / High Schools filtering.
- New read-only `live_public_organization_overview_v1(text)` RPC. Anonymous users only see `public_team` games; authenticated members/followers can also see team-private games they are entitled to see. Directory-only stable family follows remain visible before a Live workspace exists.

## Protected behavior
No change to scorer authority, scoring engine, rosters, GroupMe, game writes, team membership, or Follow permissions. Following remains read-only.

## High schools
Acalanes, Campolindo, and Miramonte remain the only seeded high schools. 7.62.0 does not add or fabricate schedules.
