# WPI 7.60.0 — Club Branding Platform

## Install

Unzip the patch over the authoritative pushed WPI 7.59.0 repository, then run:

```bash
chmod +x release-check release-check-clean release-check-live-7.60.0
./release-check-live-7.60.0
./release-check-clean
```

There is **no Supabase migration, Edge Function redeploy, or new secret** for 7.60.0.

## What changes

- Adds a generated WPI Live club-theme registry sourced from `data/identity/clubs.json`.
- Keeps Live theme activation separate and explicit in `config/live-club-theme-overrides.json`.
- Generalizes the scoring-page visual layer so a future club can use its canonical colors/logo without changing scoring layout or behavior.
- Keeps Lamorinda as the only production-enabled club theme in 7.60.0.
- Preserves Lamorinda Brentwood as a separate identity; it does not inherit Lamorinda styling.
- Leaves unknown or known-but-not-enabled clubs on the neutral WPI scoring experience.
