# WPI 7.61.0 — Platform Owner Workspace Selector Correction

## Reason

After Acalanes, Campolindo, and Miramonte were seeded, the Platform Owner dashboard exposed the limits of the original club-era team switcher. It displayed one organization-level `All <current organization> Teams` choice above a flat list of every team membership, and it shortened team labels only for the current organization.

## Resolution

The dashboard now treats the control as a **Workspace picker**:

- searchable by school, club, team, role, age/level, or group;
- grouped by organization;
- each owned organization has its own explicit `<Organization> · All Teams` overview choice;
- multi-organization accounts see consistent labels such as `Campolindo High School · Men's Varsity · Owner`;
- single-organization accounts retain compact team labels;
- selecting an organization overview routes to that organization's own club/high-school overview and preserves a valid team context.

The underlying high-school team records remain unchanged. For example, the Supabase team name remains `Campolindo High School Men's Varsity`; `Men's Varsity` is only the display label.

## Release impact

No Supabase migration. No Edge Function redeploy. No scoring/GroupMe/recovery changes.
