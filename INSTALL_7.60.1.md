# WPI 7.60.1 — Self-Service Club Onboarding

## Install

Apply the cumulative 7.60.1 patch over the authoritative pushed **WPI 7.60.0 — Club Branding Platform** repository.

Run the focused gate first:

```bash
chmod +x release-check release-check-clean release-check-live-7.60.1
./release-check-live-7.60.1
```

## Supabase migration

Apply:

`supabase/migrations/202608140003_self_service_club_onboarding.sql`

The migration adds the reviewed onboarding request queue and narrow RPCs. It does **not** modify scoring, GroupMe delivery, game recovery, or the club-theme activation config.

There is **no Edge Function redeploy and no new secret** for 7.60.1.

After the migration, run:

```bash
./release-check-clean
```

## What changes

- Dedicated no-authority onboarding account entry at `live-login.html?onboard=1`.
- New `live-club-onboarding.html` self-service workflow.
- Search/preview of the 182 canonical WPI clubs already present in the 7.60.0 branding registry.
- Explicit new/unlisted-club request path when the club truly is not in the canonical directory.
- First-team definition during onboarding.
- Platform-Owner-only approval/rejection queue.
- Approval atomically provisions the Club workspace, first Team, empty active roster, Club Owner membership, and Team Owner membership.
- Branding activation remains a separate reviewed action; Lamorinda remains the only production-enabled club theme.
- Duplicate canonical claims and duplicate active unlisted club names are blocked.
- `club_onboarding` account attribution survives later Auth lifecycle updates.
- `release-check-clean` cleanup is hardened so timeout/signal cleanup is idempotent.
