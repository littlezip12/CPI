# WPI 7.61.0 — Platform Owner Workspace Selector Correction

This correction keeps the 7.61.0 High School Water Polo Foundation data model unchanged and improves the dashboard workspace picker for accounts that own multiple clubs/schools.

## What changes

- Renames the dashboard picker from `Team` to `Workspace`.
- Adds `Search school, club or team…` filtering.
- Groups choices by organization.
- Shows organization-scoped overview choices as `<Organization> · All Teams` rather than presenting one current-club pseudo-team above a flat global list.
- Uses consistent organization + team labels for multi-organization accounts.
- Lets a Platform Owner jump directly to any owned organization overview.

## What does not change

- Stable team IDs.
- Team names stored in Supabase.
- Rosters, access, games, GroupMe, Following, archives, recaps, scoring authority, or branding.
- No Supabase migration is required.
- No Edge Function redeploy or new secret is required.
