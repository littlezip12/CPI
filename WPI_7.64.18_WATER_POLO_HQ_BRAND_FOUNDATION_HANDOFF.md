# WPI 7.64.18 — Water Polo HQ Brand Foundation Handoff

## Release intent

This release starts the controlled public-facing rebrand of the platform to **Water Polo HQ (WPHQ)**. It is intentionally a brand-foundation release rather than a product rewrite.

The product architecture remains WPI-compatible internally. **Water Polo Index** is retained as the name of the rankings methodology, while **Water Polo HQ** becomes the umbrella consumer brand for live scores, rankings, teams, tournaments, and statistics.

## Source of truth

Built from the pushed 7.64.17 GitHub ZIP:

- `CPI-main - 2026-09-21T200350.033.zip`
- SHA-256: `2af2d68344509cc8f3fad21bbbf0d5fb24b4fe5dc0ae5e2c7787bea215609b83`

## Brand system

New production assets:

- `assets/branding/wphq-logo-full.svg`
- `assets/branding/wphq-logo-full.png`
- `assets/branding/wphq-logo-mark.svg`
- `assets/branding/wphq-logo-mark.png`
- `assets/app-icons/wphq-apple-touch-180.png`
- `assets/app-icons/wphq-app-192.png`
- `assets/app-icons/wphq-app-512.png`
- `assets/app-icons/wphq-app-maskable-512.png`

The primary visual language is deliberately lighter than the prior WPI UI: white and pale-blue surfaces, navy text, blue/cyan accents, and reduced dark-surface dominance.

No marketing tagline is locked beneath the primary logo in this release. `One water polo home.` is used only as descriptive positioning in the homepage/configuration and can be changed independently of the identity.

## Front-end changes

- `js/site-shell.js` renders Water Polo HQ branding/navigation and dynamically loads the 7.64.18 light brand layer.
- `css/wphq-brand-v7-64-18.css` provides the shared brand/light-theme foundation.
- `css/wphq-home-v7-64-18.css` refreshes the homepage presentation.
- Homepage metadata, hero language, navigation, search labels, and live section use Water Polo HQ terminology.
- Command palette user-facing labels move to Water Polo HQ while ranking-methodology language remains Water Polo Index.
- PWA successor assets are versioned at 7.64.18:
  - `js/live-pwa-v7-64-18.js`
  - `css/live-pwa-v7-64-18.css`
  - `sw-v7-64-18.js`
- `manifest.webmanifest` installs as **Water Polo HQ / WPHQ** with new WPHQ icons and the existing My Teams start path.
- Key public/supporter PWA pages use Water Polo HQ branding.
- `offline.html` keeps the exact historical universal-shell includes required by the legacy shell validator while displaying the new public identity.

## Architecture deliberately preserved

Do not rename mature internal `wpi` identifiers simply for visual consistency. In particular, this release does not change:

- Supabase tables, RPCs, RLS, migrations, or Edge Functions.
- Scoring data contracts or game lifecycle behavior.
- GroupMe delivery contracts/functions.
- Analytics computations, roster/participation logic, or ranking engine.
- Historical release filenames and release-history terminology.

New code can use WPHQ/neutral naming where sensible, but existing internal WPI names remain compatible infrastructure.

## Release gate

New focused test:

- `scripts/test-wphq-brand-foundation-v7-64-18.py`

New release wrapper:

- `release-check-live-7.64.18`

The focused 7.64.18 check and affected regression chain pass through 7.64.10 in the build environment before the environment execution window expires. Critical historical shell, homepage, PWA, release-integrity, and team-directory-logo validators were also run separately and passed. The user's local `./release-check-clean` remains the final full historical gate.

## Next controlled rebrand phase

After 7.64.18 is live and visually validated, the next rebrand release should sweep the remaining user-facing operational `WPI Live` copy and secondary surfaces, without renaming backend contracts. It should also settle final tagline/positioning copy before broader parent adoption.

## Deployment

No Supabase migration.

No Edge Function deployment.

No GroupMe configuration change.

Suggested commit:

`WPI 7.64.18 — Water Polo HQ Brand Foundation`
