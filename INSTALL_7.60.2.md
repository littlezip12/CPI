# WPI 7.60.2 — Team Directory & Identity Management

## Install

Apply the cumulative 7.60.2 patch over the authoritative pushed **WPI 7.60.1 — Self-Service Club Onboarding** repository.

Run the focused gate first:

```bash
chmod +x release-check release-check-clean release-check-live-7.60.2
./release-check-live-7.60.2
```

## Supabase migration

Apply:

`supabase/migrations/202608140004_team_directory_identity_management.sql`

The migration adds stable team-family identity links, club-scoped explicit aliases, identity audit records, and narrow Owner/Admin RPCs. It does **not** move rosters, games, memberships, follows, or GroupMe configuration between teams.

There is **no Edge Function redeploy and no new secret** for 7.60.2.

After the migration, run:

```bash
./release-check-clean
```

## What changes

- New private `live-team-identity.html` workspace for Club/Team Owners and Admins.
- Canonical Live identity directory built from the existing WPI club/team/alias registry: 182 clubs and 724 public team identities.
- Stable team-family key: canonical club + age + gender/group + squad/level.
- Live teams may be explicitly linked to the correct stable family without inventing a current-season exact public team ID.
- Exact public team IDs remain season-specific and are only used when independently verified.
- Club-scoped aliases can be explicitly added, removed, audited, and reused during future Add Game opponent matching.
- Resolving a manual/unlisted opponent now preserves the raw historical opponent name and saves the explicit alias for future use.
- Existing 7.60.1 onboarding and 7.60.0 club-branding behavior remain intact.
- Production 2026–2027 tournament schedule remains intentionally empty until a real official source is published.
