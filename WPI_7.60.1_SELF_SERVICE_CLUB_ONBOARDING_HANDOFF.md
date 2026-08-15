# WPI 7.60.1 — Self-Service Club Onboarding Handoff

## Baseline

Built cumulatively from the authoritative pushed and validated **WPI 7.60.0 — Club Branding Platform** ZIP `CPI-main - 2026-08-14T224722.713.zip`.

## Purpose

7.60.1 makes the Lamorinda club setup repeatable without allowing arbitrary users to impersonate or instantly claim an existing WPI club identity.

## Delivered

- Dedicated onboarding auth mode while preserving normal invite-only team signup.
- Canonical club search driven by the existing 182-club 7.60.0 registry.
- Logo/color/identity preview before submission.
- New/unlisted-club request path with no automatic identity creation.
- First-team configuration during onboarding.
- Durable onboarding request queue.
- Platform-Owner review UI and approval/rejection RPC.
- Transactional approval provisioning of Club + first Team + empty roster + requester Owner access.
- Canonical duplicate-claim protection plus duplicate unlisted Live-workspace protection.
- Onboarding signup-source attribution preserved through later Supabase Auth updates.
- Branding activation remains separately reviewed; Lamorinda remains the only enabled production theme.
- `release-check-clean` signal/timeout cleanup hardened to restore generated tournament/QA artifacts only once.

## Protected foundation

The following remain byte-stable from the pushed 7.60.0 baseline:

- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `js/live-game-v7-58-6.js`
- `js/live-game-storage-v7-58-6.js`
- `css/live-game-v7-58-4.css`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- `config/live-club-theme-overrides.json`
- `js/live-club-theme-v7-60-0.js`
- generated 7.60.0 club-theme registry semantics

No scorer authority, game-state, roster, GroupMe exactly-once delivery, handoff/recovery, archive, recap, or scoring-layout behavior is intentionally changed.

## Migration

`supabase/migrations/202608140003_self_service_club_onboarding.sql`

No Edge Function redeploy and no new secret.

## Validation state

- 7.60.1 focused gate passes.
- The full repository gate passes through `CPI release check passed.` when executed in contiguous sections (the monolithic command exceeds the tool execution window).
- Generated tournament/QA gate artifacts are restored to the pushed baseline before packaging.
- Current-season official tournament schedule remains intentionally 0 events / 0 games because no real 2026–2027 source is published yet.

## Roadmap after 7.60.1

### 7.60.2 — WPI Team Directory & Identity Management

Build the lifecycle that connects private Live teams, public WPI team identities, aliases, unlisted opponents, and explicit identity reconciliation at multi-club scale. Preserve the rule that identity is never guessed or silently merged.

### 7.60.3 — Public / Supporter Experience at Scale

Expand Following beyond the Lamorinda pilot into cross-club discovery and a personalized game feed, while maintaining the hard separation between read-only Following and operational membership.

### Later 7.60.x

- Reviewed activation of additional club-branded scoring themes.
- Multi-club pilot validation using a second real club.
- Scalable club/team discovery and notification foundations.
- Validate the first real 2026–2027 official tournament feed when an external source becomes available.
