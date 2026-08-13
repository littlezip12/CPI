# WPI 7.58.5 — Tournament Feed → Game-Day Validation

## What this release changes

- Hardens official WPI tournament schedule matching for multi-team club workspaces.
- Squad-qualified source rows such as `Lamorinda A`, `Lamorinda B`, `Black`, `Gold`, etc. only map to the matching Live squad.
- A club-only source row such as `Lamorinda` is **not** auto-imported when multiple same-age/gender Live squads exist; it is surfaced as an identity-review condition instead.
- Keeps the existing official-schedule reconciliation foundation: manual Tournament games remain canonical if the official schedule arrives later.
- Existing unique official game identity and ambiguity review protections remain in force.
- Adds source-backed validation evidence using real banked WPI tournament rows. The QA evidence is not loaded by the production dashboard.
- The active 2026–2027 production schedule index remains empty until WPI has a real official current-season schedule source. No schedule is fabricated for validation.
- Preserves 7.58.4 Event Archive/Game Recaps and the validated Start-game/Dashboard navigation correction.

## Infrastructure

**No Supabase migration is required.**  
**No Edge Function redeploy.**  
**No new secret.**

The existing 7.57.8 database reconciliation functions and duplicate-protection index remain the server-side canonical-game safeguard.

## Release workflow

1. Install the cumulative 7.58.5 patch.
2. Run `./release-check-live-7.58.5`.
3. No Supabase step is required.
4. Run `./release-check`.
5. If the final line is `CPI release check passed.`, commit and push normally.
6. Validate the live dashboard after GitHub Pages publishes the push.

## Current-season feed state

The repository currently has no 2026–2027 tournament event with an official game schedule in the WPI public tournament hub. The generated Live index therefore intentionally reports `0 events / 0 games` and `currentSeasonSchedulePublished=false`.

7.58.5 validates the ingestion and identity rules against real already-banked tournament rows while keeping production current-season data source-truthful.
