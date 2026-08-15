# WPI Live — Team Directory & Identity Management Setup 7.60.2

## Goal

Make private WPI Live team workspaces and the public WPI team directory one controlled identity system without silently merging teams or pretending prior-season public team IDs are current-season identities.

## Identity model

WPI public team IDs are season-specific. WPI Live therefore uses two levels of identity:

1. **Stable team family** — canonical club + age + gender/group + squad/level. Example: `club-lamorinda|14U|Boys|A`.
2. **Exact public team ID** — a season-specific public identity such as `team-2026-14u-boys-lamorinda-a`.

7.60.2 links Live teams to the stable family first. It does not infer or manufacture an exact current-season public team ID from an older season.

## Owner/Admin workflow

Open `live-team-identity.html`.

### Team-family links

- Select the Club workspace.
- Review each Live team and matching public family candidates.
- Explicitly link the Live team to the correct family.
- WPI validates canonical club, age, gender/group, and squad before saving.
- Clearing the link removes only the identity link; it does not move or delete team data.

### Club identity aliases

- Add an alias only when the Owner/Admin knows what a raw label means.
- Alias targets may be a canonical club, stable team family, or exact public team identity.
- Aliases are scoped to the Club workspace, audited, removable, and never become membership/scoring authority.

### Unresolved opponents

- Manual game opponent names remain preserved exactly as entered.
- An Owner/Admin may explicitly resolve the opponent to a WPI identity.
- Resolution updates the explicit canonical mapping and also stores the same raw label as a reusable club-scoped alias.
- Future Add Game matching consults these explicit saved aliases before broader static heuristics.

## Permission safeguards

- Identity management requires Club/Team Owner or Admin authority.
- Browser code uses reviewed RPCs rather than direct authenticated table writes.
- Following remains read-only and does not grant identity-management authority.
- Identity aliases do not grant roster, scorer, GroupMe, game, or membership permissions.
- Team-family linking never copies rosters, games, archives, members, follows, or destinations.

## Database change

Apply `202608140004_team_directory_identity_management.sql` once in Supabase SQL Editor.

It adds:

- identity-link metadata columns on `live_teams`;
- `live_identity_aliases`;
- `live_identity_audit`;
- read/context RPCs;
- explicit team-family link/clear RPCs;
- explicit alias add/remove RPCs;
- a compatible replacement for `live_resolve_manual_opponent_v1` that also persists the reviewed alias.

No Edge Function deploy and no new secret are required.

## External dependency preserved

The 2026–2027 production tournament schedule index remains 0 events / 0 games because no real official current-season source has been published. Identity management must not fabricate schedule data.
