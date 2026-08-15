# WPI Live 7.60.0 — Club Branding Platform

## Architecture

The scoring console now has three separate layers:

1. **Canonical identity** — `data/identity/clubs.json` remains the source for club ID, display name, aliases, logo, and canonical colors.
2. **Reviewed Live activation** — `config/live-club-theme-overrides.json` decides which canonical clubs are allowed to receive a branded Live scoring shell and can override the presentation palette where needed.
3. **Generic renderer** — `js/live-club-theme-v7-60-0.js` + `css/live-club-theme-v7-60-0.css` apply colors/logo through CSS variables without changing the validated scoring markup or engine.

The build script creates both `data/live/club-theme-registry.json` and a synchronous JS copy, `js/live-club-theme-registry-v7-60-0.js`, so theme resolution does not add a network dependency to the scoring page.

## 7.60.0 activation policy

- Lamorinda Water Polo: enabled.
- Every other canonical WPI club: known theme candidate, not yet enabled.
- Lamorinda Brentwood: separate canonical club, not enabled, and must not fall through to Lamorinda.
- Unknown/manual club names: neutral WPI theme.

## Adding another reviewed club later

1. Confirm its canonical WPI identity, logo, and colors.
2. Add the canonical club ID to `enabledClubIds` in `config/live-club-theme-overrides.json`.
3. Add an override only if its canonical colors need presentation tuning.
4. Run `python3 scripts/build-live-club-theme-registry-v7-60-0.py`.
5. Run the focused and clean full release gates.

No scoring CSS fork or scoring-engine change should be needed.
