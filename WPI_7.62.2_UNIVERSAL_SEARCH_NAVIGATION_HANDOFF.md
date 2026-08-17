# WPI 7.62.2 — Universal Search & Navigation Cohesion

## Purpose
Make the unified Organization → Team Hub model introduced in 7.62.0/7.62.1 available from every WPI page, rather than leaving the global header/search wired to the older club-only and legacy team directories.

## Delivered
- Universal site navigation now centers `Organizations` as the public identity directory.
- Separate top-level `Teams` and `Clubs` navigation silos are retired from the global header, while legacy pages remain available for historical/rankings compatibility.
- `WPI Live` is a first-class global navigation destination.
- Header search is now labeled `Search WPI`.
- Cmd+K / Ctrl+K and the header Search control load the canonical 7.62.1 organization directory.
- Search indexes all 185 organizations and 736 stable team identities.
- Club and high-school organization results open their Organization profiles.
- Team results open stable Team Hubs, including all 12 high-school teams.
- Legacy club-only `data/club-intelligence.json` is no longer the command palette's primary search source.
- Search ranking favors exact/prefix title matches while still matching aliases, organization, age/level, gender, squad and location terms.
- Global footer language now reflects youth + high-school scope and links to Organizations / My Teams.

## Protected behavior
No changes to scorer authority, game creation/writes, rosters, memberships, scorer handoff/reopen, GroupMe delivery/retry/audit, Final Whistle sequencing, schedule reconciliation, or Following permissions.

## Database / deployment
No Supabase migration. No Edge Function redeploy. No new secret.

## Directory counts
- 185 organizations
- 182 clubs
- 3 high schools
- 736 team identities
- 724 club team identities
- 12 high-school team identities

## High-school scope
Frozen. No new schools, schedules, players, or games are added in this release.
