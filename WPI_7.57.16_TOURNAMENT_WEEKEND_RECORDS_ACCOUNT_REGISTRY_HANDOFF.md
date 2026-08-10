# WPI 7.57.16 Handoff

**Release:** WPI 7.57.16 — Tournament & Weekend Record Experience

Built from authoritative pushed WPI 7.57.15 baseline `CPI-main - 2026-08-09T211046.798.zip`.

## Product changes

- Season-aware `Tournaments & weekends` archive.
- Tournament/Scrimmage Weekend cards are compact by default and expand to show completed games.
- W-L-T record, date range, venue context and final count are visible at event level.
- Completed games include canonical team/opponent logos, final score, official division/stage/game number when available, and game/recap links.
- Supporter archive remains read-only and accessible without exposing admin setup.
- Signup transparency notice added to Create Account.
- Durable `live_account_registry` records email, display name, signup source, original registration time, email-confirmation time, last-sign-in time and initial invite/team attribution.
- Account registry has RLS enabled and no broad authenticated read grant.

## Backend change

Apply migration:

`202608090005_tournament_weekend_record_experience_signup_registry.sql`

No Edge Function changes. Do not redeploy `groupme-post` or `roster-extract`.

## Reliability boundaries

The validated scoring backend, 7.56.15 scorer implementation, GroupMe delivery, handoff, roster vision, 7.57.15 clean-slate migration, tournament reconciliation and Game-Day persistence are protected and unchanged.
